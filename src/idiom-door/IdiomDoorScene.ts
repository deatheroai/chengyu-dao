import Phaser from "phaser";
import { attemptGrab, initialOrderedCatchState, type OrderedCatchState } from "./orderedCatchProgress";
import { updateDoorStatus } from "./doorStatus";
import type { DoorLevel, LevelCharacterTile } from "./levelContent";
import { drawPlayerFigure } from "../shared/playerFigure";
import { updatePlayerPosition } from "../shared/positionStatus";
import { stepRun, type RunState, type RunConfig, RUN_SPEED, JUMP_GRAVITY, JUMP_VELOCITY, FALL_GRAVITY_MULTIPLIER } from "./runPhysics";
import { pickCatchCandidate, CATCH_RADIUS_X, CATCH_RADIUS_Y } from "./catchSelection";
import { initialDoorHpState, canJump, spendJumpHp, spendWrongCatchHp, type DoorHpState } from "./doorHp";
import { updateDoorHpStatus } from "./doorHpStatus";
import { PERFECT_TRACE_STARTING_HP } from "./writingScore";

export interface IdiomDoorSceneData {
  level: DoorLevel;
  /** Earned by the writing/tracing stage that now runs before every
   * door level (writingScore.ts's `startingDoorHp`) — see doorHp.ts's
   * doc comment for what it gates. Optional so a caller that hasn't
   * (yet, or ever) wired the writing stage in front of this scene still
   * gets a sensible full pool, same "perfect trace" ceiling
   * writingScore.ts itself uses, rather than starting HP-gated with no
   * HP at all. */
  startingHp?: number;
  onDoorReached?: () => void;
  /**
   * 2026-09-09: reaching the door *unsolved* (always possible in
   * principle — every repeat of some character missed, or jumping
   * gated off by 0 HP, see doorHp.ts) used to just call `restartLevel`
   * internally, respawning the same tiles with whatever HP pool was
   * already spent. Per BACKLOG.md's "that restart needs to route back
   * to retracing this idiom... not just respawn the same door tiles
   * with an already-spent pool" — when provided, this callback (same
   * pattern as `onDoorReached`) is called instead, so main.ts can send
   * the child back through the writing stage for a fresh HP pool
   * before relaunching this scene. Falls back to the old in-scene
   * `restartLevel` when absent, so a caller that hasn't wired this
   * (e.g. a test constructing the scene directly) still gets a
   * never-stuck level rather than one that silently stops responding
   * to jump input forever. */
  onUnsolvedDoorReached?: () => void;
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
// 2026-09-10: a wrong catch's spark burst uses its own angrier color
// (hot orange-red vs. the correct-catch gold) — reusing spawnSparkBurst's
// same system, just told to look upset instead of celebratory. Paired
// with scorchTile's charred recolor below.
const SPARK_COLOR_WRONG = 0xff5a36;
// Scorched-tile palette for a wrongly-caught tile (scorchTile) — dark,
// charcoal tones standing in stark contrast to the bright TILE_FILL/
// TILE_BORDER a catchable tile uses, so "this one's spent" reads at a
// glance without needing to remove the tile from the scene entirely.
const SCORCH_FILL = 0x3a2a20;
const SCORCH_BORDER = 0x1f1712;
const SCORCH_TEXT = "#2a1c14";
const DOOR_COLOR_CLOSED = 0x8a7360;
const DOOR_COLOR_OPEN = 0x6b4a2f;
const DOOR_RIM = 0xf0b429;

const CHAR_SIZE = 64;
const TILE_SIZE = 60;
const FOOT_OFFSET = CHAR_SIZE * 0.4;
// RUN_SPEED/JUMP_GRAVITY/JUMP_VELOCITY/FALL_GRAVITY_MULTIPLIER (the
// actual tuned physics numbers, and the full tuning history behind
// each) now live in runPhysics.ts, imported above — moved there
// 2026-09-09 so e2e/helpers/doorJump.ts (which needs them to work out
// exactly when to press jump, now that doorHp.ts's real per-jump HP
// cost makes blind spamming too expensive to rely on — see that
// helper's own doc comment) can import them without pulling in Phaser
// itself, which runPhysics.ts (unlike this file) never touches. See
// runPhysics.ts for what each constant does and why it's tuned the way
// it is; CATCH_RADIUS_X/Y (catchSelection.ts, imported above) are this
// mechanic's other tuned half.
// Once the idiom is solved, the child shouldn't have to keep running
// (and possibly jumping) through however much unsolved track happens
// to remain — per your feedback, the win should feel immediate. This
// is a *fixed* duration regardless of how far the door actually is
// (see startFastForwardToDoor), so reaching the door after solving
// always feels like a short, satisfying dash rather than a wait that
// scales with how early in the track the puzzle happened to complete.
const FAST_FORWARD_DASH_MS = 700;
// 2026-09-09 ("once the hp reaches 0 at the door stage, it should
// immediately restart instead of continuing without ability to jump"):
// a short beat (not 0ms — an instant cut felt like a bug rather than
// deliberate feedback in a quick check) between HP actually hitting 0
// and checkHpDepleted routing back to retrace, so the child sees
// #door-status's "Out of energy!" message (and the already-flashing
// low-HP counter, doorHp.ts's isHpLow) land before the scene changes
// out from under them — same "give the win/loss a beat to register"
// reasoning FAST_FORWARD_DASH_MS above uses for the opposite (solved)
// case, just much shorter since there's no dash animation to also wait
// out here.
const OUT_OF_HP_RESTART_DELAY_MS = 900;
const PLAYER_START_X = 30;
// Camera sits the character roughly a third of the way from the left
// edge rather than centered — a runner needs more preview room ahead
// than behind, so the child can see what's coming in time to jump.
const CAMERA_LEAD_FRACTION = 0.32;
const DOOR_TRIGGER_RADIUS = 60;

interface RuntimeTile {
  def: LevelCharacterTile;
  container: Phaser.GameObjects.Container;
  gfx: Phaser.GameObjects.Graphics;
  text: Phaser.GameObjects.Text;
  pinyinText: Phaser.GameObjects.Text;
  caught: boolean;
  // Set by scorchTile after a wrong catch on this specific tile — see
  // that method's doc comment. Distinct from `caught`: an inert tile is
  // still visible (charred, not destroyed), just no longer catchable.
  // 2026-09-10: this is also what keeps a jump lingering near a tall
  // tile's catch radius across several frames (the "touch and go" issue
  // runPhysics.ts's own `FALL_GRAVITY_MULTIPLIER` doc comment describes)
  // from re-charging `WRONG_CATCH_HP_PENALTY` on the *same* tile once
  // per frame — once scorched, `checkCatches` never considers it again.
  inert: boolean;
}

export class IdiomDoorScene extends Phaser.Scene {
  private level!: DoorLevel;
  private startingHp = PERFECT_TRACE_STARTING_HP;
  private onDoorReached?: () => void;
  private onUnsolvedDoorReached?: () => void;
  private orderedState: OrderedCatchState = initialOrderedCatchState();
  private hpState: DoorHpState = initialDoorHpState(PERFECT_TRACE_STARTING_HP);

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
  private fastForwarding = false;

  constructor() {
    super("IdiomDoorScene");
  }

  init(data: IdiomDoorSceneData): void {
    this.level = data.level;
    this.startingHp = data.startingHp ?? PERFECT_TRACE_STARTING_HP;
    this.onDoorReached = data.onDoorReached;
    this.onUnsolvedDoorReached = data.onUnsolvedDoorReached;
    this.orderedState = initialOrderedCatchState();
    this.hpState = initialDoorHpState(this.startingHp);
    this.tiles = [];
    this.jumpRequested = false;
    this.doorTriggered = false;
    this.fastForwarding = false;
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
    updateDoorHpStatus(this.hpState.hp);

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
    this.runConfig = {
      runSpeed: RUN_SPEED,
      gravity: JUMP_GRAVITY,
      jumpVelocity: JUMP_VELOCITY,
      groundY: this.groundY,
      fallGravityMultiplier: FALL_GRAVITY_MULTIPLIER,
    };
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
      const { container, gfx, text, pinyinText } = this.buildTile(def);
      container.setPosition(def.x, this.groundY - def.height);
      container.setAngle(def.angle);
      this.tilesLayer.add(container);
      return { def, container, gfx, text, pinyinText, caught: false, inert: false };
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

  private buildTile(def: LevelCharacterTile): {
    container: Phaser.GameObjects.Container;
    gfx: Phaser.GameObjects.Graphics;
    text: Phaser.GameObjects.Text;
    pinyinText: Phaser.GameObjects.Text;
  } {
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
    return { container, gfx, text, pinyinText };
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
    // While dashing to the door (see startFastForwardToDoor), the
    // character's x is driven entirely by that tween — normal run/jump
    // physics are suspended so the two don't fight over its position.
    if (this.fastForwarding) {
      this.jumpRequested = false;
      this.syncCameraAndPositionHook();
      return;
    }

    const dt = delta / 1000;

    const jumpPressed =
      Phaser.Input.Keyboard.JustDown(this.cursors.up!) || Phaser.Input.Keyboard.JustDown(this.cursors.space!) || Phaser.Input.Keyboard.JustDown(this.spaceKey) || this.jumpRequested;
    this.jumpRequested = false;

    // doorHp.ts's real gate: at 0 HP, jump input is swallowed here
    // rather than queued for later — the character keeps auto-running
    // (stepRun still runs every frame) but simply can't leave the
    // ground again until this idiom is retraced for a fresh HP pool
    // (see onUnsolvedDoorReached above). Mirrors stepRun's own
    // `state.grounded && jumpPressed` condition to detect a jump that's
    // actually about to execute (not e.g. a jump press while already
    // airborne, which stepRun ignores) — only an executed jump costs HP.
    const gatedJumpPressed = jumpPressed && canJump(this.hpState);
    const jumpExecuting = this.character.grounded && gatedJumpPressed;

    const prevChar = this.character;
    this.character = stepRun(this.character, gatedJumpPressed, dt, this.runConfig);
    this.characterContainer.setPosition(this.character.x, this.character.y - FOOT_OFFSET);

    if (jumpExecuting) {
      this.hpState = spendJumpHp(this.hpState);
      updateDoorHpStatus(this.hpState.hp);
    }

    // 2026-09-11: also guarded on `!this.doorTriggered` — once this run's
    // fate is already sealed (checkHpDepleted below, or checkDoor on a
    // prior frame), the character can still be mid-air from whatever
    // jump sealed it and keep sweeping through more tiles before it
    // lands (nothing freezes physics the way `fastForwarding` does for
    // the solved case — see its own early-return at the top of this
    // method). Without this guard, a chain-caught tile in that
    // now-meaningless epilogue window still ran through `handleCatch`,
    // silently overwriting `checkHpDepleted`'s own "depleted"
    // `#door-status` text back to "wrong" a frame or two later — found
    // live via idiom-door.spec.ts's "running out of HP..." test
    // intermittently seeing "wrong" instead of "depleted" (confirmed via
    // a real MutationObserver trace on `#door-status`, not just
    // theorized: `data-outcome` genuinely flipped depleted → wrong within
    // ~70ms, HP already at 0 either way). Purely a display/consistency
    // fix — `doorHp.ts`'s own HP floor and `orderedState`'s own ordering
    // rules were never actually violated, just the *label* of an outcome
    // nobody was going to see acted on anyway (a retrace is already
    // queued the instant `doorTriggered` flips true).
    if (!this.orderedState.isComplete && !this.doorTriggered) this.checkCatches(prevChar);
    this.checkHpDepleted();
    this.checkDoor();

    this.syncCameraAndPositionHook();
  }

  private syncCameraAndPositionHook(): void {
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
   *
   * Resolves to the *nearest* in-range tile (catchSelection.ts), even a
   * "wrong" one — not just whichever happens to come first in track
   * order. Only one catch per frame either way: never two tiles
   * resolved in the same frame with the second silently overwriting the
   * first's status.
   */
  private checkCatches(prevChar: RunState): void {
    const candidates = this.tiles
      .filter((tile) => !tile.caught && !tile.inert)
      .map((tile) => ({ tile, x: tile.def.x, y: this.groundY - tile.def.height }));
    const picked = pickCatchCandidate(candidates, prevChar, this.character, CATCH_RADIUS_X, CATCH_RADIUS_Y);
    if (picked) this.handleCatch(picked.tile);
  }

  private handleCatch(tile: RuntimeTile): void {
    const { state, outcome } = attemptGrab(this.orderedState, tile.def.char, this.characters);
    this.orderedState = state;

    if (outcome !== "advanced") {
      // doorHp.ts's own penalty — on top of the JUMP_HP_COST already
      // spent for the jump that produced this catch, not instead of it.
      this.hpState = spendWrongCatchHp(this.hpState);
      updateDoorHpStatus(this.hpState.hp);
      this.spawnSparkBurst(tile.def.x, this.groundY - tile.def.height, 6, SPARK_COLOR_WRONG);
      this.scorchTile(tile);
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
      this.startFastForwardToDoor();
    }
  }

  /**
   * Dashes the character straight to the door over a fixed, short
   * duration — per your 2026-08-24 feedback, once the idiom is solved
   * the child shouldn't have to keep running (or jumping) through
   * whatever unsolved track happens to remain. Deliberately a *duration*
   * tween rather than just a much faster run speed: a fixed duration
   * means reaching the door after solving always takes roughly the same
   * short moment regardless of whether the puzzle happened to complete
   * near the start or near the end of the track, rather than a wait
   * that scales with remaining distance.
   */
  private startFastForwardToDoor(): void {
    if (this.fastForwarding) return;
    this.fastForwarding = true;

    const from = { x: this.character.x };
    const targetX = Math.max(from.x, this.level.length);
    this.tweens.add({
      targets: from,
      x: targetX,
      duration: FAST_FORWARD_DASH_MS,
      ease: "Cubic.easeIn",
      onUpdate: () => {
        this.character = { x: from.x, y: this.groundY, vy: 0, grounded: true };
        this.characterContainer.setPosition(this.character.x, this.character.y - FOOT_OFFSET);
      },
      onComplete: () => {
        this.fastForwarding = false;
        this.checkDoor();
      },
    });
  }

  /**
   * The door sits at the end of the (fixed-length, pre-authored) track.
   * Reaching it having solved the level moves on to the next idiom;
   * reaching it *without* solving — always possible in principle, if
   * every repeat of some character got missed — routes back to
   * retracing (see `triggerRetrace`) rather than dead-ending the child
   * with nothing left to do. No fail state, same ethos as every other
   * snippet in this project; it just means "try again" instead of
   * "stuck." In practice this path now mostly covers "never jumped
   * enough, but still had HP left" — running out of HP entirely is
   * caught earlier, by `checkHpDepleted` below, well before the
   * character would otherwise reach here.
   */
  private checkDoor(): void {
    if (this.doorTriggered) return;
    if (Math.abs(this.character.x - this.level.length) >= DOOR_TRIGGER_RADIUS) return;

    this.doorTriggered = true;
    if (this.orderedState.isComplete) {
      this.onDoorReached?.();
    } else {
      this.triggerRetrace();
    }
  }

  /**
   * 2026-09-09 ("once the hp reaches 0 at the door stage, it should
   * immediately restart instead of continuing without ability to
   * jump"): used to only be caught once the character physically
   * reached the door (`checkDoor` above) — on a long track, that meant
   * however much distance remained kept scrolling by with jumping
   * already useless the whole way, for no benefit to the child. Now
   * checked every frame: the moment HP is actually depleted (and the
   * idiom isn't *also* solved in that same frame — a last jump that
   * both completes the idiom and spends the last HP doing it is still a
   * win, not a reason to restart), this locks in the restart
   * immediately (`doorTriggered = true`, so `checkDoor` won't also fire
   * mid-beat) and gives it one short beat (`OUT_OF_HP_RESTART_DELAY_MS`)
   * to actually land on screen — see that constant's own doc comment —
   * before routing back to retrace via the same `triggerRetrace` path
   * reaching the door unsolved already used.
   */
  private checkHpDepleted(): void {
    if (this.doorTriggered) return;
    if (this.orderedState.isComplete) return;
    if (this.hpState.hp > 0) return;

    this.doorTriggered = true;
    updateDoorStatus(this.orderedState.nextIndex, this.characters.length, false, this.characters[this.orderedState.nextIndex], "depleted");
    this.time.delayedCall(OUT_OF_HP_RESTART_DELAY_MS, () => this.triggerRetrace());
  }

  /** Sends the child back to retrace this idiom for a fresh HP pool —
   * shared by `checkDoor` (reached the door unsolved) and
   * `checkHpDepleted` (ran out of HP before ever reaching it). Callers
   * are responsible for their own `doorTriggered` guard/assignment
   * first (their timing needs differ — one fires on arrival, the other
   * after its own short delay — so it isn't managed here). */
  private triggerRetrace(): void {
    if (this.onUnsolvedDoorReached) {
      // 2026-09-09: routes back out to main.ts to retrace this idiom
      // for a fresh HP pool, rather than respawning the same tiles with
      // whatever's left of an already-spent one — see
      // IdiomDoorSceneData.onUnsolvedDoorReached's doc comment.
      this.onUnsolvedDoorReached();
    } else {
      // No retrace callback wired (e.g. a test driving this scene
      // directly) — falls back to the old in-scene restart so the level
      // still isn't a dead end, just without a fresh HP pool.
      this.restartLevel();
    }
  }

  private restartLevel(): void {
    this.orderedState = initialOrderedCatchState();
    this.hpState = initialDoorHpState(this.startingHp);
    this.character = { x: PLAYER_START_X, y: this.groundY, vy: 0, grounded: true };
    this.characterContainer.setPosition(this.character.x, this.character.y - FOOT_OFFSET);
    this.doorTriggered = false;
    this.drawDoor(false);
    this.spawnTiles();
    this.renderSlots();
    updateDoorStatus(0, this.characters.length, false, this.characters[0]);
    updateDoorHpStatus(this.hpState.hp);
  }

  private spawnSparkBurst(x: number, y: number, count: number, color: number = SPARK_COLOR): void {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const distance = 18 + Math.random() * 22;
      const spark = this.add.circle(x, y, 3 + Math.random() * 2, color, 0.9);
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

  /**
   * A wrong catch on this specific tile: recolors it scorched/charred
   * (dark, spent-looking) and marks it `inert` so `checkCatches` stops
   * considering it a candidate at all. Reuses the tile's own existing
   * graphics/text objects (recolored in place) rather than destroying and
   * rebuilding — the tile stays visible, just clearly "used up," which is
   * the point: per BACKLOG.md, one mistimed jump lingering near a tile
   * (the exact "touch-and-go" scenario earlier door-feel PRs fought to
   * fix — see catchSelection.ts) used to let the *same* wrong tile get
   * caught repeatedly across several frames of one jump, each one firing
   * its own "wrong" outcome. Scorching after the first wrong catch means
   * a single mistake reads as a single mistake, not several.
   *
   * This never risks making a level unsolvable: `levelContent.ts`
   * deliberately generates MIN_REPEATS_PER_CHARACTER..MAX_REPEATS_PER_CHARACTER
   * (5-9) tiles per character, scattered across the track, specifically
   * so any one tile — caught correctly, missed, or now scorched — still
   * leaves plenty of others bearing the same glyph.
   */
  private scorchTile(tile: RuntimeTile): void {
    if (tile.inert) return;
    tile.inert = true;
    const half = TILE_SIZE / 2;
    tile.gfx.clear();
    tile.gfx.fillStyle(SCORCH_FILL, 0.95);
    tile.gfx.fillRoundedRect(-half, -half, TILE_SIZE, TILE_SIZE, TILE_SIZE * 0.16);
    tile.gfx.lineStyle(3, SCORCH_BORDER, 0.9);
    tile.gfx.strokeRoundedRect(-half, -half, TILE_SIZE, TILE_SIZE, TILE_SIZE * 0.16);
    tile.text.setColor(SCORCH_TEXT);
    tile.pinyinText.setColor(SCORCH_TEXT);
    tile.container.setAlpha(0.7);
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
