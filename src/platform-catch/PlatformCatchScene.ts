import Phaser from "phaser";
import type { IdiomContent } from "../idioms/types";
import { applyCatch, initialCatchState, type CatchState } from "../catch-meaning/catchProgress";
import { updateCatchStatus } from "../catch-meaning/domStatus";
import { updatePlayerPosition } from "./positionStatus";
import { placedItems, type PlacedItem } from "./placedItems";
import { buildFocusSceneIcon } from "./kidScene";
import { stepPhysics, type PhysicsState, type PhysicsConfig, type Surface } from "./platformPhysics";
import { drawPlayerFigure } from "../shared/playerFigure";

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

const CHAR_SIZE = 64;
const ITEM_SIZE = 60;
const FOOT_OFFSET = CHAR_SIZE * 0.4;
const ITEM_VISUAL_OFFSET = ITEM_SIZE * 0.35;
// Fraction of *world* width (see WORLD_WIDTH_MULTIPLIER below), not a
// fixed pixel value — item positions in placedItems.ts are xFracs too,
// so a fixed-pixel radius would eat a much bigger share of the gap
// between adjacent items on a narrow (mobile) viewport than on a wide
// (desktop) one. Found the hard way: at a fixed 50px, "phone" and
// "book" (about 49px apart on a 412px-wide mobile viewport) had
// overlapping catch zones. Now purely a *grab* reach radius (see the
// 2026-08-22 revision below) rather than an auto-catch-on-touch radius,
// so it can afford to be a bit more generous without risking accidents.
const CATCH_RADIUS_X_FRAC = 0.045;
const CATCH_RADIUS_Y = 70;
// Kept well clear of every ground item's xFrac in placedItems.ts (by
// more than the catch radius, as a fraction of width, at any supported
// viewport) so the child never spawns already overlapping something.
const PLAYER_START_XFRAC = 0.03;
// The playable world is wider than the viewport — the camera scrolls to
// follow the character — so items have real breathing room between them
// instead of being crammed into a single screen. Added in response to
// your 2026-08-22 feedback that Phase 2's first cut felt crowded.
const WORLD_WIDTH_MULTIPLIER = 2;

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
  private worldWidth = 0;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private grabKey!: Phaser.Input.Keyboard.Key;
  private buttonLeft = false;
  private buttonRight = false;
  private jumpRequested = false;
  private grabRequested = false;

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
    this.grabRequested = false;
  }

  private get characters(): string[] {
    return Array.from(this.idiom.hanzi);
  }

  create(): void {
    this.slotsLayer = this.add.container(0, 0);
    // Progress chip stays pinned to the top of the screen like a HUD,
    // regardless of how far the camera has scrolled into the world.
    this.slotsLayer.setScrollFactor(0);
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
  requestGrab(): void {
    this.grabRequested = true;
  }

  private renderBackground(): void {
    this.bg?.destroy();
    const { width, height } = this.scale;
    this.bg = this.add.graphics();
    this.bg.fillGradientStyle(BG_TOP, BG_TOP, BG_BOTTOM, BG_BOTTOM, 1);
    this.bg.fillRect(0, 0, width, height);
    // Pinned to the camera regardless of scroll — it only needs to cover
    // the visible viewport, not the whole (wider) scrolling world.
    this.bg.setScrollFactor(0);
    this.children.sendToBack(this.bg);
  }

  private setupSurfaces(): void {
    const { width, height } = this.scale;
    this.worldWidth = width * WORLD_WIDTH_MULTIPLIER;
    this.catchRadiusX = this.worldWidth * CATCH_RADIUS_X_FRAC;
    this.groundY = height * 0.78;
    this.platformATop = this.groundY - 110;
    this.platformBTop = this.groundY - 150;

    const w = this.worldWidth;
    const platformAX = { min: w * 0.44, max: w * 0.44 + w * 0.16 };
    const platformBX = { min: w * 0.72, max: w * 0.72 + w * 0.16 };
    this.platformAX = platformAX;
    this.platformBX = platformBX;

    this.surfaces = [
      { xMin: 0, xMax: w, y: this.groundY },
      { xMin: platformAX.min, xMax: platformAX.max, y: this.platformATop },
      { xMin: platformBX.min, xMax: platformBX.max, y: this.platformBTop },
    ];

    this.physicsCfg = {
      gravity: 1400,
      moveSpeed: 180,
      jumpVelocity: -720,
      minX: 24,
      maxX: w - 24,
    };
  }
  private platformAX!: { min: number; max: number };
  private platformBX!: { min: number; max: number };

  private renderGround(): void {
    this.groundLayer.removeAll(true);
    const w = this.worldWidth;
    const gfx = this.add.graphics();

    gfx.fillStyle(GROUND_COLOR, 0.9);
    gfx.fillRect(0, this.groundY, w, 6);

    for (const [x, y] of [
      [this.platformAX.min, this.platformATop],
      [this.platformBX.min, this.platformBTop],
    ] as const) {
      const platformW = w * 0.16;
      gfx.fillStyle(PLATFORM_COLOR, 0.95);
      gfx.fillRoundedRect(x, y, platformW, 14, 6);
      gfx.lineStyle(2, PLATFORM_RIM, 0.8);
      gfx.strokeRoundedRect(x, y, platformW, 14, 6);
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
    for (const item of this.items) {
      if (item.caught) continue;
      item.x = item.def.xFrac * this.worldWidth;
      item.y = this.surfaceY(item.def.surface);
      item.container.setPosition(item.x, item.y - ITEM_VISUAL_OFFSET);
    }
  }

  private setupCharacter(): void {
    this.character = { x: this.worldWidth * PLAYER_START_XFRAC, y: this.groundY, vy: 0, grounded: true };
    this.characterContainer = this.add.container(this.character.x, this.character.y - FOOT_OFFSET);
    const gfx = this.add.graphics();
    drawPlayerFigure(gfx, CHAR_SIZE);
    this.characterContainer.add(gfx);
  }

  private setupInput(): void {
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    // "Z" is a common action-button convention (bottom-left of a
    // keyboard, easy to reach alongside arrow keys); Down/Shift are
    // added too since "press down to grab" is also a reasonably
    // intuitive guess. The on-screen GRAB button is the primary input
    // for the actual (touch) target audience either way.
    this.grabKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
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

    const keyboardGrab =
      Phaser.Input.Keyboard.JustDown(this.grabKey) ||
      Phaser.Input.Keyboard.JustDown(this.cursors.down!) ||
      Phaser.Input.Keyboard.JustDown(this.cursors.shift!);
    const grabPressed = keyboardGrab || this.grabRequested;
    this.grabRequested = false;

    if (!this.catchState.isComplete) {
      this.character = stepPhysics(this.character, { moveDir, jumpPressed }, this.surfaces, dt, this.physicsCfg);
      this.characterContainer.setPosition(this.character.x, this.character.y - FOOT_OFFSET);
      if (grabPressed) this.attemptGrab();

      const { width } = this.scale;
      this.cameras.main.scrollX = Phaser.Math.Clamp(this.character.x - width / 2, 0, Math.max(0, this.worldWidth - width));
    }
    updatePlayerPosition(this.character.x);
  }

  /**
   * Catching used to happen automatically the instant the character's
   * position overlapped an item — but that made walking through a
   * cluster of items feel like bumping into things you couldn't avoid,
   * per your 2026-08-22 feedback ("hard to choose the selection...
   * accidentally bump into a lot of things"). Catching is now a
   * deliberate action instead: walking near something does nothing by
   * itself, and pressing GRAB catches only the single nearest uncaught
   * item within reach — so a decoy sitting right next to a correct item
   * is something you can walk straight past without it counting against
   * (or for) you, and grabbing is always an unambiguous, one-at-a-time
   * choice rather than whatever happens to be in range.
   */
  private attemptGrab(): void {
    let nearest: RuntimeItem | undefined;
    let nearestDist = Infinity;

    for (const item of this.items) {
      if (item.caught) continue;
      const dx = Math.abs(this.character.x - item.x);
      const dy = Math.abs(this.character.y - item.y);
      if (dx > this.catchRadiusX || dy > CATCH_RADIUS_Y) continue;
      const dist = dx * dx + dy * dy;
      if (dist < nearestDist) {
        nearest = item;
        nearestDist = dist;
      }
    }

    if (nearest) this.handleCatch(nearest);
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
    // Centered on the character's actual (world) position, not the
    // viewport's center — with a scrolling camera those aren't the same
    // point, and the celebration should happen where the child is.
    const { width } = this.scale;
    const cx = this.character.x;
    const cy = this.groundY - 80;
    for (let i = 0; i < 16; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * (width * 0.25);
      this.time.delayedCall(i * 20, () => {
        this.spawnSparkBurst(cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist, 4);
      });
    }
  }
}
