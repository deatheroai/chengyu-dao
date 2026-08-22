import Phaser from "phaser";
import { attemptGrab, initialOrderedCatchState, type OrderedCatchState } from "./orderedCatchProgress";
import { updateDoorStatus } from "./doorStatus";
import { PLATFORM_XFRAC_RANGES, type DoorLevel, type LevelCharacterTile } from "./levelContent";
import { drawPlayerFigure } from "../shared/playerFigure";
import { updatePlayerPosition } from "../platform-catch/positionStatus";
import { stepPhysics, type PhysicsState, type PhysicsConfig, type Surface } from "../platform-catch/platformPhysics";

export interface IdiomDoorSceneData {
  level: DoorLevel;
  onDoorReached?: () => void;
}

const BG_TOP = 0xfff6e6;
const BG_BOTTOM = 0xffdca0;
const GROUND_COLOR = 0xd9a15b;
const PLATFORM_COLOR = 0xc1401f;
const PLATFORM_RIM = 0xf0b429;
const TILE_FILL = 0xfff1d6;
const TILE_BORDER = 0xf0b429;
const TILE_TEXT = "#7a5636";
const SLOT_EMPTY_FILL = 0xfff1d6;
const SLOT_BORDER = 0xf0b429;
const SLOT_TEXT = "#7a5636";
const SPARK_COLOR = 0xffd76a;
const DOOR_COLOR = 0x6b4a2f;
const DOOR_RIM = 0xf0b429;

const CHAR_SIZE = 64;
const TILE_SIZE = 60;
const FOOT_OFFSET = CHAR_SIZE * 0.4;
const CATCH_RADIUS_X_FRAC = 0.045;
const CATCH_RADIUS_Y = 70;
const PLAYER_START_XFRAC = 0.03;
const WORLD_WIDTH_MULTIPLIER = 2;
const DOOR_XFRAC = 0.98;
const DOOR_TRIGGER_RADIUS = 60;

interface RuntimeTile {
  def: LevelCharacterTile;
  x: number;
  y: number;
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
  private doorContainer?: Phaser.GameObjects.Container;
  private tiles: RuntimeTile[] = [];

  private character!: PhysicsState;
  private characterContainer!: Phaser.GameObjects.Container;
  private surfaces: Surface[] = [];
  private physicsCfg!: PhysicsConfig;
  private groundY = 0;
  private platformATop = 0;
  private platformBTop = 0;
  private catchRadiusX = 0;
  private worldWidth = 0;
  private platformAX!: { min: number; max: number };
  private platformBX!: { min: number; max: number };

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private grabKey!: Phaser.Input.Keyboard.Key;
  private buttonLeft = false;
  private buttonRight = false;
  private jumpRequested = false;
  private grabRequested = false;
  private doorTriggered = false;

  constructor() {
    super("IdiomDoorScene");
  }

  init(data: IdiomDoorSceneData): void {
    this.level = data.level;
    this.onDoorReached = data.onDoorReached;
    this.orderedState = initialOrderedCatchState();
    this.tiles = [];
    this.doorContainer = undefined;
    this.buttonLeft = false;
    this.buttonRight = false;
    this.jumpRequested = false;
    this.grabRequested = false;
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
    this.setupSurfaces();
    this.renderGround();
    this.spawnTiles();
    this.renderSlots();
    this.setupCharacter();
    this.setupInput();

    updateDoorStatus(0, this.characters.length, false, this.characters[0]);

    this.scale.on(Phaser.Scale.Events.RESIZE, () => {
      this.renderBackground();
      this.setupSurfaces();
      this.renderGround();
      this.layoutTiles();
      this.renderSlots();
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
    this.platformAX = { min: w * PLATFORM_XFRAC_RANGES.platformA.min, max: w * PLATFORM_XFRAC_RANGES.platformA.max };
    this.platformBX = { min: w * PLATFORM_XFRAC_RANGES.platformB.min, max: w * PLATFORM_XFRAC_RANGES.platformB.max };

    this.surfaces = [
      { xMin: 0, xMax: w, y: this.groundY },
      { xMin: this.platformAX.min, xMax: this.platformAX.max, y: this.platformATop },
      { xMin: this.platformBX.min, xMax: this.platformBX.max, y: this.platformBTop },
    ];

    this.physicsCfg = {
      gravity: 1400,
      moveSpeed: 180,
      jumpVelocity: -720,
      minX: 24,
      maxX: w - 24,
    };
  }

  private renderGround(): void {
    this.groundLayer.removeAll(true);
    const w = this.worldWidth;
    const gfx = this.add.graphics();

    gfx.fillStyle(GROUND_COLOR, 0.9);
    gfx.fillRect(0, this.groundY, w, 6);

    for (const [x, xMax, y] of [
      [this.platformAX.min, this.platformAX.max, this.platformATop],
      [this.platformBX.min, this.platformBX.max, this.platformBTop],
    ] as const) {
      const platformW = xMax - x;
      gfx.fillStyle(PLATFORM_COLOR, 0.95);
      gfx.fillRoundedRect(x, y, platformW, 14, 6);
      gfx.lineStyle(2, PLATFORM_RIM, 0.8);
      gfx.strokeRoundedRect(x, y, platformW, 14, 6);
    }
    this.groundLayer.add(gfx);
  }

  private surfaceY(surface: LevelCharacterTile["surface"]): number {
    if (surface === "ground") return this.groundY;
    if (surface === "platformA") return this.platformATop;
    return this.platformBTop;
  }

  private spawnTiles(): void {
    this.tilesLayer.removeAll(true);
    this.tiles = this.level.tiles.map((def) => {
      const container = this.buildTile(def.char);
      this.tilesLayer.add(container);
      return { def, x: 0, y: 0, container, caught: false };
    });
    this.layoutTiles();
  }

  private buildTile(char: string): Phaser.GameObjects.Container {
    const container = this.add.container(0, 0);
    const gfx = this.add.graphics();
    const half = TILE_SIZE / 2;
    gfx.fillStyle(TILE_FILL, 0.95);
    gfx.fillRoundedRect(-half, -half, TILE_SIZE, TILE_SIZE, TILE_SIZE * 0.16);
    gfx.lineStyle(3, TILE_BORDER, 0.9);
    gfx.strokeRoundedRect(-half, -half, TILE_SIZE, TILE_SIZE, TILE_SIZE * 0.16);
    container.add(gfx);
    const text = this.add
      .text(0, 0, char, {
        fontSize: `${Math.round(TILE_SIZE * 0.56)}px`,
        color: TILE_TEXT,
        fontFamily: "system-ui, sans-serif",
        fontStyle: "600",
      })
      .setOrigin(0.5);
    container.add(text);
    return container;
  }

  private layoutTiles(): void {
    for (const tile of this.tiles) {
      if (tile.caught) continue;
      tile.x = tile.def.xFrac * this.worldWidth;
      tile.y = this.surfaceY(tile.def.surface) - TILE_SIZE * 0.62;
      tile.container.setPosition(tile.x, tile.y);
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
    this.grabKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
  }

  private renderSlots(): void {
    this.slotsLayer.removeAll(true);
    const { width } = this.scale;
    const count = this.characters.length;
    const slotSize = Math.min(56, (width * 0.7) / count - 10);
    const gap = slotSize * 0.25;
    const totalWidth = count * slotSize + (count - 1) * gap;
    const startX = width / 2 - totalWidth / 2 + slotSize / 2;
    // Well below the DOM meaning-prompt + status chip: unlike every
    // earlier snippet's short one-line hint, the idiom's full English
    // meaning routinely wraps to 2-3 lines (found by screenshot-
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
        // to search for" rather than an already-found answer. Gently
        // pulses to draw the eye without being distracting.
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

    this.character = stepPhysics(this.character, { moveDir, jumpPressed }, this.surfaces, dt, this.physicsCfg);
    this.characterContainer.setPosition(this.character.x, this.character.y - FOOT_OFFSET);
    if (grabPressed && !this.orderedState.isComplete) this.attemptTileGrab();

    if (this.orderedState.isComplete) this.checkDoor();

    const { width } = this.scale;
    this.cameras.main.scrollX = Phaser.Math.Clamp(this.character.x - width / 2, 0, Math.max(0, this.worldWidth - width));
    updatePlayerPosition(this.character.x);
  }

  /**
   * Same deliberate-action, nearest-in-reach shape as
   * PlatformCatchScene.attemptGrab — but nothing is ever removed on a
   * "wrong" grab here. A character grabbed out of turn is often a
   * *legitimate* future answer (just not needed yet), so destroying it
   * would make the puzzle unsolvable once its real turn came around.
   * Only the tile that actually matches the current expected index
   * disappears.
   */
  private attemptTileGrab(): void {
    let nearest: RuntimeTile | undefined;
    let nearestDist = Infinity;

    for (const tile of this.tiles) {
      if (tile.caught) continue;
      const dx = Math.abs(this.character.x - tile.x);
      const dy = Math.abs(this.character.y - this.surfaceY(tile.def.surface));
      if (dx > this.catchRadiusX || dy > CATCH_RADIUS_Y) continue;
      const dist = dx * dx + dy * dy;
      if (dist < nearestDist) {
        nearest = tile;
        nearestDist = dist;
      }
    }

    if (!nearest) return;

    const { state, outcome } = attemptGrab(this.orderedState, nearest.def.correctIndex, this.characters.length);
    this.orderedState = state;

    if (outcome === "advanced") {
      this.handleAdvance(nearest);
    } else {
      this.spawnSparkBurst(nearest.x, nearest.y, 3);
      updateDoorStatus(this.orderedState.nextIndex, this.characters.length, false, this.characters[this.orderedState.nextIndex], "wrong");
    }
  }

  private handleAdvance(tile: RuntimeTile): void {
    tile.caught = true;
    this.spawnSparkBurst(tile.x, tile.y, 8);
    this.tweens.add({
      targets: tile.container,
      alpha: 0,
      scale: 0.6,
      duration: 260,
      onComplete: () => tile.container.destroy(),
    });

    this.renderSlots();
    updateDoorStatus(
      this.orderedState.nextIndex,
      this.characters.length,
      this.orderedState.isComplete,
      this.characters[this.orderedState.nextIndex],
      "advanced",
    );

    if (this.orderedState.isComplete) {
      this.playCompleteFlourish();
      this.spawnDoor();
    }
  }

  private spawnDoor(): void {
    const x = this.worldWidth * DOOR_XFRAC;
    const y = this.groundY;
    const container = this.add.container(x, y);
    const gfx = this.add.graphics();
    gfx.fillStyle(DOOR_COLOR, 0.95);
    gfx.fillRoundedRect(-26, -80, 52, 80, { tl: 26, tr: 26, bl: 0, br: 0 });
    gfx.lineStyle(3, DOOR_RIM, 0.9);
    gfx.strokeRoundedRect(-26, -80, 52, 80, { tl: 26, tr: 26, bl: 0, br: 0 });
    gfx.fillStyle(DOOR_RIM, 0.9);
    gfx.fillCircle(14, -40, 3);
    container.add(gfx);
    container.setAlpha(0);
    this.tweens.add({ targets: container, alpha: 1, duration: 500 });
    this.doorContainer = container;
  }

  private checkDoor(): void {
    if (!this.doorContainer || this.doorTriggered) return;
    const doorX = this.worldWidth * DOOR_XFRAC;
    if (Math.abs(this.character.x - doorX) < DOOR_TRIGGER_RADIUS) {
      this.doorTriggered = true;
      this.onDoorReached?.();
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
