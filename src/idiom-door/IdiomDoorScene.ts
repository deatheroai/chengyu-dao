import Phaser from "phaser";
import { attemptGrab, initialOrderedCatchState, type OrderedCatchState } from "./orderedCatchProgress";
import { updateDoorStatus } from "./doorStatus";
import type { DoorLevel, LevelCharacterTile } from "./levelContent";
import { drawPlayerFigure } from "../shared/playerFigure";
import { updatePlayerPosition } from "../platform-catch/positionStatus";
import { stepRun, type RunState, type RunConfig } from "./runPhysics";

export interface IdiomDoorSceneData {
  level: DoorLevel;
  onDoorReached?: () => void;
}

const BG_TOP = 0xfff6e6;
const BG_BOTTOM = 0xffdca0;
const GROUND_COLOR = 0xd9a15b;
const TILE_FILL = 0xfff1d6;
const TILE_BORDER = 0xf0b429;
const TILE_TEXT = "#7a5636";
const SLOT_EMPTY_FILL = 0xfff1d6;
const SLOT_BORDER = 0xf0b429;
const SLOT_TEXT = "#7a5636";
const SPARK_COLOR = 0xffd76a;
const DOOR_COLOR_CLOSED = 0x8a7360;
const DOOR_COLOR_OPEN = 0x6b4a2f;
const DOOR_RIM = 0xf0b429;

const CHAR_SIZE = 64;
const TILE_SIZE = 60;
const FOOT_OFFSET = CHAR_SIZE * 0.4;
// Each tile floats at its own height (levelContent.ts's HEIGHT_MIN..
// HEIGHT_MAX, ≈90-160px) rather than one uniform line — per your
// 2026-08-23 feedback that a single fixed height felt too neatly
// arranged. That whole range stays comfortably inside the jump arc's
// max height (jumpVelocity²/(2·gravity) ≈ 175px with the physics
// constants below), and CATCH_RADIUS_Y is generous enough to still
// catch comfortably at any height in the range.
const CATCH_RADIUS_X = 70;
const CATCH_RADIUS_Y = 80;
// 2026-08-24 feedback: 200px/s read as "way too slow." Bumped 60% —
// the jump arc's shape (and therefore how forgiving catching is)
// doesn't depend on run speed at all, since gravity/jumpVelocity are
// unchanged; a faster run just covers more ground per second, both
// approaching a tile and during the jump arc itself.
const RUN_SPEED = 320;
const PLAYER_START_X = 30;
// Camera sits the character roughly a third of the way from the left
// edge rather than centered — a runner needs more preview room ahead
// than behind, so the child can see what's coming in time to jump.
const CAMERA_LEAD_FRACTION = 0.32;
const DOOR_TRIGGER_RADIUS = 60;

interface RuntimeTile {
  def: LevelCharacterTile;
  container: Phaser.GameObjects.Container;
  caught: boolean;
}

export class IdiomDoorScene extends Phaser.Scene {
  private level!: DoorLevel;
  private onDoorReached?: () => void;
  private orderedState: OrderedCatchState = initialOrderedCatchState();

  private bg?: Phaser.GameObjects.Graphics;
  private slotsLayer!: Phaser.GameObjects.Container;
  private groundLayer!: Phaser.GameObjects.Container;
  private tilesLayer!: Phaser.GameObjects.Container;
  private doorContainer!: Phaser.GameObjects.Container;
  private doorGfx!: Phaser.GameObjects.Graphics;
  private tiles: RuntimeTile[] = [];

  private character!: RunState;
  private characterContainer!: Phaser.GameObjects.Container;
  private runConfig!: RunConfig;
  private groundY = 0;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private jumpRequested = false;
  private doorTriggered = false;

  constructor() {
    super("IdiomDoorScene");
  }

  init(data: IdiomDoorSceneData): void {
    this.level = data.level;
    this.onDoorReached = data.onDoorReached;
    this.orderedState = initialOrderedCatchState();
    this.tiles = [];
    this.jumpRequested = false;
    this.doorTriggered = false;
  }

  private get characters(): string[] {
    return Array.from(this.level.idiom.hanzi);
  }

  create(): void {
    this.slotsLayer = this.add.container(0, 0);
    this.slotsLayer.setScrollFactor(0);
    this.groundLayer = this.add.container(0, 0);
    this.tilesLayer = this.add.container(0, 0);

    this.renderBackground();
    this.setupGround();
    this.spawnTiles();
    this.buildDoor();
    this.renderSlots();
    this.setupCharacter();
    this.setupInput();

    updateDoorStatus(0, this.characters.length, false, this.characters[0]);

    this.scale.on(Phaser.Scale.Events.RESIZE, () => {
      this.renderBackground();
      this.setupGround();
      this.layoutTiles();
      this.doorContainer.setPosition(this.level.length, this.groundY);
      this.renderSlots();
    });
  }

  // --- Public method for the on-screen touch control (main.ts) ---
  requestJump(): void {
    this.jumpRequested = true;
  }

  private renderBackground(): void {
    this.bg?.destroy();
    const { width, height } = this.scale;
    this.bg = this.add.graphics();
    this.bg.fillGradientStyle(BG_TOP, BG_TOP, BG_BOTTOM, BG_BOTTOM, 1);
    this.bg.fillRect(0, 0, width, height);
    this.bg.setScrollFactor(0);
    this.children.sendToBack(this.bg);
  }

  private setupGround(): void {
    const { height } = this.scale;
    this.groundY = height * 0.78;
    this.runConfig = { runSpeed: RUN_SPEED, gravity: 1400, jumpVelocity: -700, groundY: this.groundY };
  }

  private renderGround(): void {
    this.groundLayer.removeAll(true);
    const gfx = this.add.graphics();
    gfx.fillStyle(GROUND_COLOR, 0.9);
    gfx.fillRect(0, this.groundY, this.level.length + 200, 6);
    this.groundLayer.add(gfx);
  }

  private spawnTiles(): void {
    this.tilesLayer.removeAll(true);
    this.tiles = this.level.tiles.map((def) => {
      const container = this.buildTile(def);
      container.setPosition(def.x, this.groundY - def.height);
      container.setAngle(def.angle);
      this.tilesLayer.add(container);
      return { def, container, caught: false };
    });
    this.renderGround();
  }

  private layoutTiles(): void {
    for (const tile of this.tiles) {
      if (tile.caught) continue;
      tile.container.setPosition(tile.def.x, this.groundY - tile.def.height);
    }
    this.renderGround();
  }

  private buildTile(def: LevelCharacterTile): Phaser.GameObjects.Container {
    const container = this.add.container(0, 0);
    const gfx = this.add.graphics();
    const half = TILE_SIZE / 2;
    gfx.fillStyle(TILE_FILL, 0.95);
    gfx.fillRoundedRect(-half, -half, TILE_SIZE, TILE_SIZE, TILE_SIZE * 0.16);
    gfx.lineStyle(3, TILE_BORDER, 0.9);
    gfx.strokeRoundedRect(-half, -half, TILE_SIZE, TILE_SIZE, TILE_SIZE * 0.16);
    container.add(gfx);
    const text = this.add
      .text(0, -half * 0.15, def.char, {
        fontSize: `${Math.round(TILE_SIZE * 0.5)}px`,
        color: TILE_TEXT,
        fontFamily: "system-ui, sans-serif",
        fontStyle: "600",
      })
      .setOrigin(0.5);
    container.add(text);
    // 2026-08-24 feedback: show each tile's own pinyin right below its
    // glyph, so the reading is right there rather than only in the
    // intro screen's whole-idiom clue. Nudged slightly up into the box
    // (rather than below it) to keep it visually attached even with
    // the tile's rotation and the neighboring tiles' own labels.
    const pinyinText = this.add
      .text(0, half * 0.62, def.pinyin, {
        fontSize: `${Math.round(TILE_SIZE * 0.2)}px`,
        color: TILE_TEXT,
        fontFamily: "system-ui, sans-serif",
        fontStyle: "italic",
      })
      .setOrigin(0.5);
    container.add(pinyinText);
    // A gentle bob so floating tiles read as "in the air" rather than
    // pasted-on decorations — purely cosmetic, doesn't affect the
    // logical catch position (that's tracked via `def.x`/`def.height`,
    // not this tween).
    this.tweens.add({ targets: container, y: "+=8", duration: 900, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    return container;
  }

  private buildDoor(): void {
    this.doorContainer = this.add.container(this.level.length, this.groundY);
    this.doorGfx = this.add.graphics();
    this.drawDoor(false);
    this.doorContainer.add(this.doorGfx);
  }

  private drawDoor(open: boolean): void {
    this.doorGfx.clear();
    this.doorGfx.fillStyle(open ? DOOR_COLOR_OPEN : DOOR_COLOR_CLOSED, open ? 0.95 : 0.55);
    this.doorGfx.fillRoundedRect(-26, -80, 52, 80, { tl: 26, tr: 26, bl: 0, br: 0 });
    this.doorGfx.lineStyle(3, DOOR_RIM, open ? 0.9 : 0.5);
    this.doorGfx.strokeRoundedRect(-26, -80, 52, 80, { tl: 26, tr: 26, bl: 0, br: 0 });
    if (open) {
      this.doorGfx.fillStyle(DOOR_RIM, 0.9);
      this.doorGfx.fillCircle(14, -40, 3);
    }
  }

  private setupCharacter(): void {
    this.character = { x: PLAYER_START_X, y: this.groundY, vy: 0, grounded: true };
    this.characterContainer = this.add.container(this.character.x, this.character.y - FOOT_OFFSET);
    const gfx = this.add.graphics();
    drawPlayerFigure(gfx, CHAR_SIZE);
    this.characterContainer.add(gfx);
  }

  private setupInput(): void {
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
  }

  private renderSlots(): void {
    this.slotsLayer.removeAll(true);
    const { width } = this.scale;
    const count = this.characters.length;
    const slotSize = Math.min(56, (width * 0.7) / count - 10);
    const gap = slotSize * 0.25;
    const totalWidth = count * slotSize + (count - 1) * gap;
    const startX = width / 2 - totalWidth / 2 + slotSize / 2;
    // Well below the DOM meaning-prompt + status chip: the idiom's full
    // English meaning routinely wraps to 2-3 lines (found by screenshot
    // checking — see DECISIONS.md), and these slots are canvas-drawn at
    // a fixed position with no way to react to the DOM text's actual
    // wrapped height.
    const y = 130;

    for (let i = 0; i < count; i++) {
      const x = startX + i * (slotSize + gap);
      const found = i < this.orderedState.nextIndex;
      const isNext = i === this.orderedState.nextIndex;

      if (found) {
        this.slotsLayer.add(
          this.add
            .text(x, y, this.characters[i], {
              fontSize: `${Math.round(slotSize * 0.62)}px`,
              color: SLOT_TEXT,
              fontFamily: "system-ui, sans-serif",
              fontStyle: "600",
            })
            .setOrigin(0.5),
        );
        continue;
      }

      const outline = this.add.graphics();
      outline.lineStyle(2, SLOT_BORDER, 0.7);
      outline.strokeRoundedRect(x - slotSize / 2, y - slotSize / 2, slotSize, slotSize, slotSize * 0.18);
      outline.fillStyle(SLOT_EMPTY_FILL, 0.5);
      outline.fillRoundedRect(x - slotSize / 2, y - slotSize / 2, slotSize, slotSize, slotSize * 0.18);
      this.slotsLayer.add(outline);

      if (isNext) {
        // The one hint the child gets: which character to look for next
        // — shown as a soft, ghosted preview so it reads as "the target
        // to search for" rather than an already-found answer.
        const ghost = this.add
          .text(x, y, this.characters[i], {
            fontSize: `${Math.round(slotSize * 0.62)}px`,
            color: SLOT_TEXT,
            fontFamily: "system-ui, sans-serif",
            fontStyle: "600",
          })
          .setOrigin(0.5)
          .setAlpha(0.35);
        this.slotsLayer.add(ghost);
        this.tweens.add({ targets: ghost, alpha: { from: 0.2, to: 0.55 }, duration: 700, yoyo: true, repeat: -1 });
      }
    }
  }

  update(_time: number, delta: number): void {
    const dt = delta / 1000;

    const jumpPressed =
      Phaser.Input.Keyboard.JustDown(this.cursors.up!) || Phaser.Input.Keyboard.JustDown(this.cursors.space!) || Phaser.Input.Keyboard.JustDown(this.spaceKey) || this.jumpRequested;
    this.jumpRequested = false;

    const prevChar = this.character;
    this.character = stepRun(this.character, jumpPressed, dt, this.runConfig);
    this.characterContainer.setPosition(this.character.x, this.character.y - FOOT_OFFSET);

    if (!this.orderedState.isComplete) this.checkCatches(prevChar);
    this.checkDoor();

    const { width } = this.scale;
    const maxScroll = Math.max(0, this.level.length + 200 - width);
    this.cameras.main.scrollX = Phaser.Math.Clamp(this.character.x - width * CAMERA_LEAD_FRACTION, 0, maxScroll);
    updatePlayerPosition(this.character.x);
  }

  /**
   * Auto-catch on touch, not a deliberate button press — per your
   * 2026-08-23 feedback that walking backward to press GRAB felt
   * clunky. Jumping is the one action left; reaching a tile's height at
   * its x is what catches it. Still a swept check against the frame's
   * whole movement segment (not just the current position) for the
   * same reason as everywhere else in this project: a big frame delta
   * could otherwise let the character's fall/rise skip clean past a
   * tile's height window between one frame and the next.
   */
  private checkCatches(prevChar: RunState): void {
    const minX = Math.min(prevChar.x, this.character.x) - CATCH_RADIUS_X;
    const maxX = Math.max(prevChar.x, this.character.x) + CATCH_RADIUS_X;
    const minY = Math.min(prevChar.y, this.character.y) - CATCH_RADIUS_Y;
    const maxY = Math.max(prevChar.y, this.character.y) + CATCH_RADIUS_Y;

    for (const tile of this.tiles) {
      if (tile.caught) continue;
      const tileY = this.groundY - tile.def.height;
      if (tile.def.x < minX || tile.def.x > maxX || tileY < minY || tileY > maxY) continue;
      // Stop at the first match, even a "wrong" one — same reasoning as
      // PlatformCatchScene's nearest-only grab: one catch per frame,
      // never two tiles resolved in the same frame with the second
      // silently overwriting the first's status.
      this.handleCatch(tile);
      return;
    }
  }

  private handleCatch(tile: RuntimeTile): void {
    const { state, outcome } = attemptGrab(this.orderedState, tile.def.correctIndex, this.characters.length);
    this.orderedState = state;

    if (outcome !== "advanced") {
      this.spawnSparkBurst(tile.def.x, this.groundY - tile.def.height, 3);
      updateDoorStatus(this.orderedState.nextIndex, this.characters.length, false, this.characters[this.orderedState.nextIndex], "wrong");
      return;
    }

    tile.caught = true;
    this.spawnSparkBurst(tile.def.x, this.groundY - tile.def.height, 8);
    this.tweens.add({ targets: tile.container, alpha: 0, scale: 0.6, duration: 260, onComplete: () => tile.container.destroy() });

    this.renderSlots();
    updateDoorStatus(this.orderedState.nextIndex, this.characters.length, this.orderedState.isComplete, this.characters[this.orderedState.nextIndex], "advanced");

    if (this.orderedState.isComplete) {
      this.playCompleteFlourish();
      this.drawDoor(true);
    }
  }

  /**
   * The door sits at the end of the (fixed-length, pre-authored) track.
   * Reaching it having solved the level moves on to the next idiom;
   * reaching it *without* solving — always possible in principle, if
   * every repeat of some character got missed — gently restarts this
   * same level from the top rather than dead-ending the child with
   * nothing left to do. No fail state, same ethos as every other
   * snippet in this project; it just means "try again" instead of
   * "stuck."
   */
  private checkDoor(): void {
    if (this.doorTriggered) return;
    if (Math.abs(this.character.x - this.level.length) >= DOOR_TRIGGER_RADIUS) return;

    this.doorTriggered = true;
    if (this.orderedState.isComplete) {
      this.onDoorReached?.();
    } else {
      this.restartLevel();
    }
  }

  private restartLevel(): void {
    this.orderedState = initialOrderedCatchState();
    this.character = { x: PLAYER_START_X, y: this.groundY, vy: 0, grounded: true };
    this.characterContainer.setPosition(this.character.x, this.character.y - FOOT_OFFSET);
    this.doorTriggered = false;
    this.drawDoor(false);
    this.spawnTiles();
    this.renderSlots();
    updateDoorStatus(0, this.characters.length, false, this.characters[0]);
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
