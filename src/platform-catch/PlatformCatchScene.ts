import Phaser from "phaser";
import type { IdiomContent } from "../idioms/types";
import { applyCatch, initialCatchState, type CatchState } from "../catch-meaning/catchProgress";
import { updateCatchStatus } from "../catch-meaning/domStatus";
import { updatePlayerPosition } from "./positionStatus";
import { placedItems, type PlacedItem } from "./placedItems";
import { buildFocusSceneIcon } from "./kidScene";
import { stepPhysics, type PhysicsState, type PhysicsConfig, type Surface } from "./platformPhysics";

export interface PlatformCatchSceneData {
  idiom: IdiomContent;
  onComplete?: () => void;
}

const BG_TOP = 0xfff6e6;
const BG_BOTTOM = 0xffdca0;
const GROUND_COLOR = 0xd9a15b;
const PLATFORM_COLOR = 0xc1401f;
const PLATFORM_RIM = 0xf0b429;
const SLOT_EMPTY_FILL = 0xfff1d6;
const SLOT_BORDER = 0xf0b429;
const SLOT_TEXT = "#7a5636";
const SPARK_COLOR = 0xffd76a;
const PLAYER_SHIRT = 0x3d8f6f;

const CHAR_SIZE = 64;
const ITEM_SIZE = 60;
const FOOT_OFFSET = CHAR_SIZE * 0.4;
const ITEM_VISUAL_OFFSET = ITEM_SIZE * 0.35;
// Fraction of scene width, not a fixed pixel value — item positions in
// placedItems.ts are xFracs too, so a fixed-pixel radius would eat a
// much bigger share of the gap between adjacent items on a narrow
// (mobile) viewport than on a wide (desktop) one. Found the hard way:
// at a fixed 50px, "phone" and "book" (about 49px apart on a 412px-wide
// mobile viewport) had overlapping catch zones, so walking between them
// could catch both in the same frame, with the second catch's status
// message silently overwriting the first's.
const CATCH_RADIUS_X_FRAC = 0.04;
const CATCH_RADIUS_Y = 62;
// Kept well clear of every ground item's xFrac in placedItems.ts (by
// more than the catch radius, as a fraction of width, at any supported
// viewport) so the child never spawns already overlapping — and so
// "catching" — something before touching a control.
const PLAYER_START_XFRAC = 0.04;

interface RuntimeItem {
  def: PlacedItem;
  x: number;
  y: number;
  container: Phaser.GameObjects.Container;
  caught: boolean;
}

export class PlatformCatchScene extends Phaser.Scene {
  private idiom!: IdiomContent;
  private onComplete?: () => void;
  private catchState: CatchState = initialCatchState();

  private bg?: Phaser.GameObjects.Graphics;
  private slotsLayer!: Phaser.GameObjects.Container;
  private groundLayer!: Phaser.GameObjects.Container;
  private itemsLayer!: Phaser.GameObjects.Container;
  private items: RuntimeItem[] = [];

  private character!: PhysicsState;
  private characterContainer!: Phaser.GameObjects.Container;
  private surfaces: Surface[] = [];
  private physicsCfg!: PhysicsConfig;
  private groundY = 0;
  private platformATop = 0;
  private platformBTop = 0;
  private catchRadiusX = 0;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private buttonLeft = false;
  private buttonRight = false;
  private jumpRequested = false;

  constructor() {
    super("PlatformCatchScene");
  }

  init(data: PlatformCatchSceneData): void {
    this.idiom = data.idiom;
    this.onComplete = data.onComplete;
    this.catchState = initialCatchState();
    this.items = [];
    this.buttonLeft = false;
    this.buttonRight = false;
    this.jumpRequested = false;
  }

  private get characters(): string[] {
    return Array.from(this.idiom.hanzi);
  }

  create(): void {
    this.slotsLayer = this.add.container(0, 0);
    this.groundLayer = this.add.container(0, 0);
    this.itemsLayer = this.add.container(0, 0);

    this.renderBackground();
    this.setupSurfaces();
    this.renderGround();
    this.spawnItems();
    this.renderSlots();
    this.setupCharacter();
    this.setupInput();

    updateCatchStatus(0, this.characters.length, false);

    this.scale.on(Phaser.Scale.Events.RESIZE, () => {
      this.renderBackground();
      this.setupSurfaces();
      this.renderGround();
      this.layoutItems();
      this.renderSlots(false);
      this.character.x = Phaser.Math.Clamp(this.character.x, this.physicsCfg.minX, this.physicsCfg.maxX);
    });
  }

  // --- Public methods for the on-screen touch controls (main.ts) ---
  setButtonLeft(held: boolean): void {
    this.buttonLeft = held;
  }
  setButtonRight(held: boolean): void {
    this.buttonRight = held;
  }
  requestJump(): void {
    this.jumpRequested = true;
  }

  private renderBackground(): void {
    this.bg?.destroy();
    const { width, height } = this.scale;
    this.bg = this.add.graphics();
    this.bg.fillGradientStyle(BG_TOP, BG_TOP, BG_BOTTOM, BG_BOTTOM, 1);
    this.bg.fillRect(0, 0, width, height);
    this.children.sendToBack(this.bg);
  }

  private setupSurfaces(): void {
    const { width, height } = this.scale;
    this.catchRadiusX = width * CATCH_RADIUS_X_FRAC;
    this.groundY = height * 0.78;
    this.platformATop = this.groundY - 110;
    this.platformBTop = this.groundY - 150;

    const platformAX = { min: width * 0.44, max: width * 0.44 + width * 0.16 };
    const platformBX = { min: width * 0.72, max: width * 0.72 + width * 0.16 };
    this.platformAX = platformAX;
    this.platformBX = platformBX;

    this.surfaces = [
      { xMin: 0, xMax: width, y: this.groundY },
      { xMin: platformAX.min, xMax: platformAX.max, y: this.platformATop },
      { xMin: platformBX.min, xMax: platformBX.max, y: this.platformBTop },
    ];

    this.physicsCfg = {
      gravity: 1400,
      moveSpeed: 180,
      jumpVelocity: -720,
      minX: 24,
      maxX: width - 24,
    };
  }
  private platformAX!: { min: number; max: number };
  private platformBX!: { min: number; max: number };

  private renderGround(): void {
    this.groundLayer.removeAll(true);
    const { width } = this.scale;
    const gfx = this.add.graphics();

    gfx.fillStyle(GROUND_COLOR, 0.9);
    gfx.fillRect(0, this.groundY, width, 6);

    for (const [x, y] of [
      [this.platformAX.min, this.platformATop],
      [this.platformBX.min, this.platformBTop],
    ] as const) {
      const w = width * 0.16;
      gfx.fillStyle(PLATFORM_COLOR, 0.95);
      gfx.fillRoundedRect(x, y, w, 14, 6);
      gfx.lineStyle(2, PLATFORM_RIM, 0.8);
      gfx.strokeRoundedRect(x, y, w, 14, 6);
    }
    this.groundLayer.add(gfx);
  }

  private spawnItems(): void {
    this.itemsLayer.removeAll(true);
    this.items = placedItems.map((def) => {
      const container = buildFocusSceneIcon(this, def.icon, def.kind, ITEM_SIZE);
      this.itemsLayer.add(container);
      return { def, x: 0, y: 0, container, caught: false };
    });
    this.layoutItems();
  }

  private surfaceY(surface: PlacedItem["surface"]): number {
    if (surface === "ground") return this.groundY;
    if (surface === "platformA") return this.platformATop;
    return this.platformBTop;
  }

  private layoutItems(): void {
    const { width } = this.scale;
    for (const item of this.items) {
      if (item.caught) continue;
      item.x = item.def.xFrac * width;
      item.y = this.surfaceY(item.def.surface);
      item.container.setPosition(item.x, item.y - ITEM_VISUAL_OFFSET);
    }
  }

  private setupCharacter(): void {
    const { width } = this.scale;
    this.character = { x: width * PLAYER_START_XFRAC, y: this.groundY, vy: 0, grounded: true };
    this.characterContainer = this.add.container(this.character.x, this.character.y - FOOT_OFFSET);
    const kid = buildFocusSceneIcon(this, "book", "correct", CHAR_SIZE);
    // The player's own character isn't "correct" or "decoy" — it's just
    // the kid the child is controlling — so drop the prop icon that
    // buildFocusSceneIcon adds for the catchable items and keep only the
    // figure, recolored to a neutral shirt so it doesn't read as either
    // catch category.
    kid.list[1]?.destroy();
    (kid.list[0] as Phaser.GameObjects.Graphics).clear();
    this.drawPlayerFigure(kid.list[0] as Phaser.GameObjects.Graphics);
    this.characterContainer.add(kid);
  }

  private drawPlayerFigure(gfx: Phaser.GameObjects.Graphics): void {
    const s = CHAR_SIZE;
    gfx.lineStyle(Math.max(2, s * 0.05), PLAYER_SHIRT, 1);
    gfx.lineBetween(-s * 0.08, s * 0.22, -s * 0.1, s * 0.4);
    gfx.lineBetween(s * 0.08, s * 0.22, s * 0.1, s * 0.4);
    gfx.fillStyle(PLAYER_SHIRT, 1);
    gfx.fillRoundedRect(-s * 0.16, -s * 0.06, s * 0.32, s * 0.3, s * 0.08);
    gfx.lineStyle(Math.max(2, s * 0.045), 0xf3c88f, 1);
    gfx.lineBetween(s * 0.12, s * 0.04, s * 0.2, s * 0.16);
    gfx.lineBetween(-s * 0.12, s * 0.04, -s * 0.2, s * 0.16);
    gfx.fillStyle(0xf3c88f, 1);
    gfx.fillCircle(0, -s * 0.18, s * 0.16);
    gfx.fillStyle(0x4a3420, 1);
    gfx.beginPath();
    gfx.slice(0, -s * 0.18, s * 0.17, Phaser.Math.DegToRad(195), Phaser.Math.DegToRad(345), false);
    gfx.fillPath();
  }

  private setupInput(): void {
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
  }

  private renderSlots(animateNewest = false): void {
    this.slotsLayer.removeAll(true);
    const { width } = this.scale;
    const count = this.characters.length;
    const slotSize = Math.min(56, (width * 0.7) / count - 10);
    const gap = slotSize * 0.25;
    const totalWidth = count * slotSize + (count - 1) * gap;
    const startX = width / 2 - totalWidth / 2 + slotSize / 2;
    const y = 46;

    for (let i = 0; i < count; i++) {
      const x = startX + i * (slotSize + gap);
      const revealed = i < this.catchState.revealedCount;

      if (revealed) {
        const text = this.add
          .text(x, y, this.characters[i], {
            fontSize: `${Math.round(slotSize * 0.62)}px`,
            color: SLOT_TEXT,
            fontFamily: "system-ui, sans-serif",
            fontStyle: "600",
          })
          .setOrigin(0.5);
        this.slotsLayer.add(text);
        if (animateNewest && i === this.catchState.revealedCount - 1) {
          text.setScale(0.2);
          text.setAlpha(0);
          this.tweens.add({ targets: text, scale: 1, alpha: 1, duration: 420, ease: "Back.easeOut" });
        }
      } else {
        const outline = this.add.graphics();
        outline.lineStyle(2, SLOT_BORDER, 0.7);
        outline.strokeRoundedRect(x - slotSize / 2, y - slotSize / 2, slotSize, slotSize, slotSize * 0.18);
        outline.fillStyle(SLOT_EMPTY_FILL, 0.5);
        outline.fillRoundedRect(x - slotSize / 2, y - slotSize / 2, slotSize, slotSize, slotSize * 0.18);
        this.slotsLayer.add(outline);
      }
    }
  }

  update(_time: number, delta: number): void {
    const dt = delta / 1000;
    const left = this.cursors.left.isDown || this.buttonLeft;
    const right = this.cursors.right.isDown || this.buttonRight;
    const moveDir: -1 | 0 | 1 = right && !left ? 1 : left && !right ? -1 : 0;

    const keyboardJump =
      Phaser.Input.Keyboard.JustDown(this.cursors.up!) ||
      Phaser.Input.Keyboard.JustDown(this.cursors.space!) ||
      Phaser.Input.Keyboard.JustDown(this.spaceKey);
    const jumpPressed = keyboardJump || this.jumpRequested;
    this.jumpRequested = false;

    if (!this.catchState.isComplete) {
      const prevChar = this.character;
      this.character = stepPhysics(this.character, { moveDir, jumpPressed }, this.surfaces, dt, this.physicsCfg);
      this.characterContainer.setPosition(this.character.x, this.character.y - FOOT_OFFSET);
      this.checkCatches(prevChar);
    }
    updatePlayerPosition(this.character.x);
  }

  /**
   * Checking only the character's *current* position each frame is a
   * point sample: a big-enough frame delta (real device jank, or this
   * sandbox's known parallel-test contention) can make a fast-moving
   * character's step skip clean past an item's catch radius between one
   * frame and the next, missing it entirely. Same bug class already
   * fixed twice elsewhere in this project (RevealScene's tap-drop,
   * CatchScene's falling-item skip) — the fix is the same shape too: a
   * swept check against the whole frame's movement segment, not just
   * where it ended up.
   */
  private checkCatches(prevChar: PhysicsState): void {
    const minX = Math.min(prevChar.x, this.character.x) - this.catchRadiusX;
    const maxX = Math.max(prevChar.x, this.character.x) + this.catchRadiusX;
    const minY = Math.min(prevChar.y, this.character.y) - CATCH_RADIUS_Y;
    const maxY = Math.max(prevChar.y, this.character.y) + CATCH_RADIUS_Y;

    for (const item of this.items) {
      if (item.caught) continue;
      if (item.x >= minX && item.x <= maxX && item.y >= minY && item.y <= maxY) {
        this.handleCatch(item);
      }
    }
  }

  private handleCatch(item: RuntimeItem): void {
    item.caught = true;
    this.spawnSparkBurst(item.x, item.y - ITEM_VISUAL_OFFSET, item.def.kind === "correct" ? 8 : 4);
    this.tweens.add({
      targets: item.container,
      alpha: 0,
      scale: 0.6,
      duration: 260,
      onComplete: () => item.container.destroy(),
    });

    this.catchState = applyCatch(this.catchState, item.def.kind, this.characters.length);
    updateCatchStatus(this.catchState.revealedCount, this.characters.length, this.catchState.isComplete, item.def.kind);
    if (item.def.kind === "correct") this.renderSlots(true);

    if (this.catchState.isComplete) {
      this.playCompleteFlourish();
      this.onComplete?.();
    }
  }

  private spawnSparkBurst(x: number, y: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const distance = 18 + Math.random() * 22;
      const spark = this.add.circle(x, y, 3 + Math.random() * 2, SPARK_COLOR, 0.9);
      this.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0.3,
        duration: 480,
        ease: "Cubic.easeOut",
        onComplete: () => spark.destroy(),
      });
    }
  }

  private playCompleteFlourish(): void {
    const { width } = this.scale;
    const cy = this.groundY - 80;
    for (let i = 0; i < 16; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * (width * 0.25);
      this.time.delayedCall(i * 20, () => {
        this.spawnSparkBurst(width / 2 + Math.cos(angle) * dist, cy + Math.sin(angle) * dist, 4);
      });
    }
  }
}
