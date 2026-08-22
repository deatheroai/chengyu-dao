import Phaser from "phaser";
import { attemptBalloonCatch, initialBalloonCatchState, type BalloonCatchState } from "./balloonCatchProgress";
import { updateBalloonStatus } from "./balloonStatus";
import { CELL_JITTER_FRACTION, type BalloonLevel, type BalloonDef } from "./balloonLevelContent";
import { drawPlayerFigure } from "../shared/playerFigure";
import { updateBalloonPosition } from "./balloonPositionStatus";
import { stepFlight, type FlightState, type FlightConfig } from "./balloonPhysics";

export interface BalloonSentenceSceneData {
  level: BalloonLevel;
  onResolved?: () => void;
}

const SKY_TOP = 0xbfe6ff;
const SKY_BOTTOM = 0xeef9ff;
const CLOUD_COLOR = 0xffffff;
const BALLOON_FILL = 0xfff1d6;
const BALLOON_BORDER = 0xf0b429;
const BALLOON_TEXT = "#5b4636";
const SPARK_COLOR = 0xffd76a;

const CHAR_SIZE = 60;
// Balloon size is *not* fixed — a full example sentence can run from
// ~14 to 35+ characters once spliced into a decoy's structure (found by
// screenshot: a fixed small balloon just clipped the longer ones), so
// each balloon is sized to fit its own text (see buildBalloon), capped
// at this max content width so a very long sentence wraps to more lines
// rather than growing arbitrarily wide.
const MAX_TEXT_WIDTH = 190;
const BALLOON_PAD_X = 16;
const BALLOON_PAD_Y = 14;
const TEXT_GAP = 4;
// A little slop beyond the balloon's own measured half-extents — this
// is "did you fly into roughly the right balloon," not a pixel-precise
// hitbox.
const CATCH_RADIUS_SLOP = 20;

// Extra breathing room between grid cells beyond a balloon's own
// measured half-extent, on top of balloonLevelContent.ts's jitter.
const CELL_PADDING = 16;
// Worst case, two balloons in adjacent cells can jitter toward each
// other by CELL_JITTER_FRACTION of a cell each — this is the fraction
// of a cell's width/height that's *guaranteed* clear of that, used to
// size cells so adjacent balloons can never overlap regardless of
// which way their jitter happens to fall.
const JITTER_SAFE_FRACTION = 1 - 2 * CELL_JITTER_FRACTION;

// World-space margins (px) around the balloon grid — a "world," not a
// single fixed screen: found by screenshot (twice) that trying to fit
// these balloons — full sentences, some 30+ characters — into whatever
// the device's actual viewport happens to be always ends up overlapping
// on *some* screen size, since a fixed number of grid columns/rows
// can't shrink below what the content itself needs. Same fix as the
// door puzzle already uses: the world's size is driven by the content
// (here, by however big the grid needs to be for this level's actual
// balloon sizes) and the camera pans a viewport-sized window over it,
// rather than trying to cram content into an unpredictable viewport.
const SKY_MARGIN_X = 60;
const SKY_MARGIN_Y_TOP = 70;
const SKY_MARGIN_Y_BOTTOM = 160;
// How far beyond the balloon grid itself the avatar can roam.
const AVATAR_MARGIN = 70;

const AVATAR_ACCEL = 900;
const AVATAR_MAX_SPEED = 260;
const AVATAR_DRAG = 2.4;

interface RuntimeBalloon {
  def: BalloonDef;
  container: Phaser.GameObjects.Container;
  touching: boolean;
  /** Measured half-width/height of this balloon's actual body (varies —
   * see buildBalloon), used both for its own catch radius and to size
   * the world's grid so every balloon actually fits its cell. */
  halfW: number;
  halfH: number;
}

export class BalloonSentenceScene extends Phaser.Scene {
  private level!: BalloonLevel;
  private onResolved?: () => void;
  private catchState: BalloonCatchState = initialBalloonCatchState();

  private bg?: Phaser.GameObjects.Graphics;
  private balloonsLayer!: Phaser.GameObjects.Container;
  private balloons: RuntimeBalloon[] = [];
  private worldW = 0;
  private worldH = 0;

  private avatar!: FlightState;
  private avatarContainer!: Phaser.GameObjects.Container;
  private flightConfig!: FlightConfig;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys!: { w: Phaser.Input.Keyboard.Key; a: Phaser.Input.Keyboard.Key; s: Phaser.Input.Keyboard.Key; d: Phaser.Input.Keyboard.Key };
  private touchInput = { left: false, right: false, up: false, down: false };
  private resolved = false;

  constructor() {
    super("BalloonSentenceScene");
  }

  init(data: BalloonSentenceSceneData): void {
    this.level = data.level;
    this.onResolved = data.onResolved;
    this.catchState = initialBalloonCatchState();
    this.balloons = [];
    this.touchInput = { left: false, right: false, up: false, down: false };
    this.resolved = false;
  }

  create(): void {
    this.balloonsLayer = this.add.container(0, 0);

    this.renderBackground();
    // Balloons (and the world size they imply) have to exist before the
    // avatar/flight config, which roam relative to that world.
    this.spawnBalloons();
    this.setupFlightConfig();
    this.setupAvatar();
    this.setupInput();

    updateBalloonStatus(false);
    this.updateCameraScroll();

    this.scale.on(Phaser.Scale.Events.RESIZE, () => {
      // The world itself is content-derived, not viewport-derived, so
      // only the background (a fixed screen-space backdrop) and the
      // camera's scroll clamp (viewport-dependent) need to react here.
      this.renderBackground();
      this.updateCameraScroll();
    });
  }

  // --- Public methods for the on-screen touch controls (main.ts) ---
  setFlightInput(direction: "left" | "right" | "up" | "down", pressed: boolean): void {
    this.touchInput[direction] = pressed;
  }

  private renderBackground(): void {
    this.bg?.destroy();
    const { width, height } = this.scale;
    this.bg = this.add.graphics();
    this.bg.fillGradientStyle(SKY_TOP, SKY_TOP, SKY_BOTTOM, SKY_BOTTOM, 1);
    this.bg.fillRect(0, 0, width, height);
    this.bg.fillStyle(CLOUD_COLOR, 0.55);
    this.drawCloud(this.bg, width * 0.18, height * 0.14, 1);
    this.drawCloud(this.bg, width * 0.78, height * 0.1, 0.8);
    this.drawCloud(this.bg, width * 0.55, height * 0.85, 0.7);
    // Fixed to the screen, not the world — the sky is a backdrop, not
    // part of the scrollable content, same as IdiomDoorScene's bg.
    this.bg.setScrollFactor(0);
    this.children.sendToBack(this.bg);
  }

  private drawCloud(gfx: Phaser.GameObjects.Graphics, x: number, y: number, scale: number): void {
    gfx.fillEllipse(x, y, 70 * scale, 34 * scale);
    gfx.fillEllipse(x - 30 * scale, y + 6 * scale, 46 * scale, 26 * scale);
    gfx.fillEllipse(x + 34 * scale, y + 6 * scale, 46 * scale, 26 * scale);
  }

  private setupFlightConfig(): void {
    this.flightConfig = {
      accel: AVATAR_ACCEL,
      maxSpeed: AVATAR_MAX_SPEED,
      drag: AVATAR_DRAG,
      bounds: {
        minX: AVATAR_MARGIN,
        maxX: this.worldW - AVATAR_MARGIN,
        minY: AVATAR_MARGIN,
        maxY: this.worldH - AVATAR_MARGIN,
      },
    };
  }

  private spawnBalloons(): void {
    this.balloonsLayer.removeAll(true);
    this.balloons = this.level.balloons.map((def) => {
      const { container, halfW, halfH } = this.buildBalloon(def);
      this.balloonsLayer.add(container);
      return { def, container, touching: false, halfW, halfH };
    });
    this.layoutBalloons();
  }

  /**
   * Sizes the world (see the SKY_MARGIN_* comment above) from this
   * level's *actual* rendered balloon sizes, then lays each balloon's
   * already-assigned slotIndex/jitter (balloonLevelContent.ts) onto a
   * grid within it. A roughly-square arrangement (cols ≈ rows) reads
   * better for a set of card-like balloons than a single long row or
   * column would.
   */
  private layoutBalloons(): void {
    if (this.balloons.length === 0) return;
    const total = this.balloons.length;

    const maxHalfW = Math.max(...this.balloons.map((b) => b.halfW));
    const maxHalfH = Math.max(...this.balloons.map((b) => b.halfH));
    // Every cell is sized for this level's *largest* balloon, and to
    // guarantee no overlap even if two neighbors' jitter both happen to
    // point toward each other — see JITTER_SAFE_FRACTION above.
    const cellW = (maxHalfW * 2 + CELL_PADDING) / JITTER_SAFE_FRACTION;
    const cellH = (maxHalfH * 2 + CELL_PADDING) / JITTER_SAFE_FRACTION;

    const cols = Math.ceil(Math.sqrt(total));
    const rows = Math.ceil(total / cols);

    const skyX0 = SKY_MARGIN_X;
    const skyY0 = SKY_MARGIN_Y_TOP;
    this.worldW = cols * cellW + SKY_MARGIN_X * 2;
    this.worldH = rows * cellH + SKY_MARGIN_Y_TOP + SKY_MARGIN_Y_BOTTOM;

    for (const balloon of this.balloons) {
      const col = balloon.def.slotIndex % cols;
      const row = Math.floor(balloon.def.slotIndex / cols);
      const centerX = skyX0 + (col + 0.5) * cellW;
      const centerY = skyY0 + (row + 0.5) * cellH;
      balloon.container.setPosition(centerX + balloon.def.jitterX * cellW, centerY + balloon.def.jitterY * cellH);
    }
  }

  /**
   * Balloon size is content-driven, not fixed: an example sentence can
   * run anywhere from ~14 to 35+ characters once spliced into a
   * decoy's structure, and a single fixed size either clipped the long
   * ones or wasted space around the short ones (found by screenshot).
   * The hanzi/pinyin text is measured *after* being laid out (with
   * word-wrap capped at MAX_TEXT_WIDTH), then the balloon body is drawn
   * to fit that — a rounded rectangle rather than an ellipse, so a
   * wrapped multi-line sentence actually has square corners to use
   * rather than an oval's curved ones cutting into it.
   */
  private buildBalloon(def: BalloonDef): { container: Phaser.GameObjects.Container; halfW: number; halfH: number } {
    const container = this.add.container(0, 0);

    // Word-wrap alone only breaks on whitespace by default, which never
    // fires for hanzi (no spaces between characters) — without
    // useAdvancedWrap, a long sentence just ran straight past the
    // balloon's edge instead of wrapping at all (also found by
    // screenshot). Pinyin has spaces/hyphens already, but the same flag
    // is harmless there and guards the same failure mode if a syllable
    // run is ever too long to fit on one line.
    const hanziText = this.add
      .text(0, 0, def.hanzi, {
        fontSize: "15px",
        color: BALLOON_TEXT,
        fontFamily: "system-ui, sans-serif",
        fontStyle: "600",
        align: "center",
        wordWrap: { width: MAX_TEXT_WIDTH, useAdvancedWrap: true },
      })
      .setOrigin(0.5, 0);

    const pinyinText = this.add
      .text(0, 0, def.pinyin, {
        fontSize: "9px",
        color: BALLOON_TEXT,
        fontFamily: "system-ui, sans-serif",
        fontStyle: "italic",
        align: "center",
        wordWrap: { width: MAX_TEXT_WIDTH, useAdvancedWrap: true },
      })
      .setOrigin(0.5, 0);

    const contentWidth = Math.max(hanziText.width, pinyinText.width);
    const contentHeight = hanziText.height + TEXT_GAP + pinyinText.height;
    const halfW = contentWidth / 2 + BALLOON_PAD_X;
    const halfH = contentHeight / 2 + BALLOON_PAD_Y;

    const gfx = this.add.graphics();
    // A rounded "balloon card" (body) plus a thin string and knot below
    // it — reads as a balloon while giving a wrapped sentence proper
    // square corners to use. Every balloon (correct or decoy) is styled
    // identically: the child has to judge the *sentence*, not spot a
    // different color.
    gfx.fillStyle(BALLOON_FILL, 0.97);
    gfx.fillRoundedRect(-halfW, -halfH, halfW * 2, halfH * 2, 18);
    gfx.lineStyle(3, BALLOON_BORDER, 0.9);
    gfx.strokeRoundedRect(-halfW, -halfH, halfW * 2, halfH * 2, 18);
    gfx.lineStyle(2, BALLOON_BORDER, 0.7);
    gfx.beginPath();
    gfx.moveTo(0, halfH - 2);
    gfx.lineTo(0, halfH + 14);
    gfx.strokePath();
    gfx.fillStyle(BALLOON_BORDER, 0.8);
    gfx.fillTriangle(-5, halfH + 14, 5, halfH + 14, 0, halfH + 22);
    container.add(gfx);

    hanziText.setPosition(0, -contentHeight / 2);
    pinyinText.setPosition(0, -contentHeight / 2 + hanziText.height + TEXT_GAP);
    container.add(hanziText);
    container.add(pinyinText);

    this.tweens.add({
      targets: container,
      y: `+=${10 + Math.round(def.bobPhase * 2)}`,
      duration: 1400 + Math.round(def.bobPhase * 200),
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    return { container, halfW, halfH };
  }

  private setupAvatar(): void {
    const { bounds } = this.flightConfig;
    this.avatar = { x: (bounds.minX + bounds.maxX) / 2, y: bounds.maxY - 40, vx: 0, vy: 0 };
    this.avatarContainer = this.add.container(this.avatar.x, this.avatar.y);
    const gfx = this.add.graphics();
    drawPlayerFigure(gfx, CHAR_SIZE);
    this.avatarContainer.add(gfx);
  }

  private setupInput(): void {
    this.cursors = this.input.keyboard!.createCursorKeys();
    // Phaser's addKeys returns an object keyed by the *exact* strings
    // passed in (case-sensitive) — passing lowercase here so it lines
    // up with the lowercase field names on `wasdKeys` above, rather
    // than silently returning `undefined` for `.w`/`.a`/`.s`/`.d`.
    this.wasdKeys = this.input.keyboard!.addKeys("w,a,s,d") as typeof this.wasdKeys;
  }

  update(_time: number, delta: number): void {
    if (this.resolved) return;
    const dt = delta / 1000;

    const input = {
      left: this.cursors.left!.isDown || this.wasdKeys.a.isDown || this.touchInput.left,
      right: this.cursors.right!.isDown || this.wasdKeys.d.isDown || this.touchInput.right,
      up: this.cursors.up!.isDown || this.wasdKeys.w.isDown || this.touchInput.up,
      down: this.cursors.down!.isDown || this.wasdKeys.s.isDown || this.touchInput.down,
    };

    const prevAvatar = this.avatar;
    this.avatar = stepFlight(this.avatar, input, dt, this.flightConfig);
    this.avatarContainer.setPosition(this.avatar.x, this.avatar.y);

    this.checkCatches(prevAvatar);
    this.updateCameraScroll();
    updateBalloonPosition(this.avatar.x, this.avatar.y);
  }

  /** Centers the camera on the avatar, clamped so it never scrolls past
   * the (content-sized) world's edges — same idea as the door puzzle's
   * scrollX clamp, just following both axes since movement here is
   * free-roam rather than one-directional. */
  private updateCameraScroll(): void {
    if (!this.avatar) return;
    const { width, height } = this.scale;
    const maxScrollX = Math.max(0, this.worldW - width);
    const maxScrollY = Math.max(0, this.worldH - height);
    this.cameras.main.scrollX = Phaser.Math.Clamp(this.avatar.x - width / 2, 0, maxScrollX);
    this.cameras.main.scrollY = Phaser.Math.Clamp(this.avatar.y - height / 2, 0, maxScrollY);
  }

  /**
   * Swept check against the frame's whole movement segment, same
   * reasoning as everywhere else in this project (IdiomDoorScene's
   * checkCatches, runPhysics' landing check, etc.): a big enough frame
   * delta could otherwise let the avatar cross clean over a balloon
   * between one frame and the next. The balloon's own small cosmetic
   * bob isn't included in the check — its amplitude is tiny relative to
   * its catch radius, same simplification IdiomDoorScene's tiles make.
   * The radius itself is per-balloon (halfW/halfH + a little slop),
   * since balloon size is content-driven rather than fixed.
   *
   * A decoy balloon stays touchable more than once (no fail state, no
   * permanent "used up" decoys) but only fires its wrong-catch feedback
   * once per approach — `touching` tracks whether the avatar is
   * *currently* overlapping it, so sitting on top of one doesn't spam
   * the feedback every single frame.
   */
  private checkCatches(prevAvatar: FlightState): void {
    const avatarMinX = Math.min(prevAvatar.x, this.avatar.x);
    const avatarMaxX = Math.max(prevAvatar.x, this.avatar.x);
    const avatarMinY = Math.min(prevAvatar.y, this.avatar.y);
    const avatarMaxY = Math.max(prevAvatar.y, this.avatar.y);

    for (const balloon of this.balloons) {
      // The container's actual current position (which includes its
      // cosmetic bob tween) — that tween's amplitude is small relative
      // to the catch radius, so this is accurate enough without
      // needing to track a separate "base" position just for hit-testing.
      const bx = balloon.container.x;
      const by = balloon.container.y;
      const rx = balloon.halfW + CATCH_RADIUS_SLOP;
      const ry = balloon.halfH + CATCH_RADIUS_SLOP;
      const overlapping = bx + rx >= avatarMinX && bx - rx <= avatarMaxX && by + ry >= avatarMinY && by - ry <= avatarMaxY;

      if (!overlapping) {
        balloon.touching = false;
        continue;
      }
      if (balloon.touching) continue; // already handled this approach
      balloon.touching = true;
      this.handleCatch(balloon);
      if (this.resolved) return;
    }
  }

  private handleCatch(balloon: RuntimeBalloon): void {
    const { state, outcome } = attemptBalloonCatch(this.catchState, balloon.def.isCorrect);
    this.catchState = state;

    if (outcome !== "correct") {
      if (outcome === "wrong") {
        this.spawnSparkBurst(balloon.container.x, balloon.container.y, 3);
        updateBalloonStatus(false, "wrong");
      }
      return;
    }

    this.resolved = true;
    this.spawnSparkBurst(balloon.container.x, balloon.container.y, 10);
    updateBalloonStatus(true, "correct");
    this.tweens.add({ targets: balloon.container, alpha: 0, scale: 1.2, duration: 320 });

    // A short beat to let the catch actually register before handing
    // off — same "don't cut the win off mid-flourish" reasoning as the
    // door puzzle's fast-forward dash, just without needing a dash of
    // its own here (there's no "door" to travel to in this stage).
    this.time.delayedCall(700, () => this.onResolved?.());
  }

  private spawnSparkBurst(x: number, y: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const distance = 18 + Math.random() * 24;
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
}
