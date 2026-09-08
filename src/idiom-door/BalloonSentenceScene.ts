import Phaser from "phaser";
import { attemptBalloonCatch, initialBalloonCatchState, type BalloonCatchState } from "./balloonCatchProgress";
import { updateBalloonStatus } from "./balloonStatus";
import { CELL_JITTER_FRACTION, type BalloonLevel, type BalloonDef } from "./balloonLevelContent";
import { BALLOON_COLORWAYS, type BalloonColorway } from "./balloonColors";
import { drawPlayerFigure } from "../shared/playerFigure";
import { updateBalloonPosition, updateBalloonCameraScroll, syncBalloonTargetPositions } from "./balloonPositionStatus";
import { stepFlight, type FlightState, type FlightConfig } from "./balloonPhysics";
import { computeGlyphArc, DEFAULT_ANGLE_STEP_DEG as GLYPH_ANGLE_STEP_DEG } from "./balloonGlyphArc";
import { initialBalloonHpState, applyWrongCatchPenalty, type BalloonHpState } from "./balloonHp";
import { updateBalloonHpStatus } from "./balloonHpStatus";

export interface BalloonSentenceSceneData {
  level: BalloonLevel;
  onResolved?: () => void;
}

const SKY_TOP = 0xbfe6ff;
const SKY_BOTTOM = 0xeef9ff;
const CLOUD_COLOR = 0xffffff;
const BALLOON_TEXT = "#4a3420";
const SPARK_COLOR = 0xffd76a;

// 2026-08-26 redesign: a balloon now holds exactly one short (4-
// character) idiom instead of a whole spliced example sentence (which
// could run 14-35+ characters once spliced into a decoy's structure —
// cramped and hard to read while flying, per your feedback). Every
// idiom in idioms.ts is exactly 4 characters, so balloon content length
// is effectively fixed now — no per-balloon wrapping/sizing variance to
// account for, and each character can be rendered much bigger (see
// CANDIDATE_CHAR_FONT_PX below) than the old variable-length sentence
// balloons ever could be.
const CHAR_SIZE = 60;
// 2026-09-08 feedback: still spans too far even after curving the layout
// (see layoutBalloons below) — stepped down from 34/13px so each
// candidate's own card is narrower too, both levers pushing the same
// "less horizontal space" direction at once.
const CANDIDATE_CHAR_FONT_PX = 28;
const CANDIDATE_PINYIN_FONT_PX = 11;
const TEXT_GAP = 4;
// Horizontal spacing between adjacent character columns.
const CHAR_GAP = 4;
// 2026-09-08 (later): "the words are curved but the rectangle remains
// the same... curve the rectangle so it takes up less horizontal space
// overall" — the card body is now a curved band (buildBalloon's
// buildCurvedCardPath) that actually follows the text's own arc rather
// than one flat rounded rectangle sized to bound it. Padding is now
// tight around the curved content itself (BAND_PAD_X/Y below) instead
// of one generous BALLOON_PAD_X/Y added once around an already-wide
// bounding box — the old 20/16px padding was most of what kept the
// card wide regardless of how the text inside it was arranged.
// BAND_PAD_X is a pixel amount, converted to an angular pad (÷ the
// glyph arc's own radius, small-angle arc-length≈radius×angle) at build
// time — a fixed pixel gap around the end characters reads consistently
// regardless of how tightly a given balloon's own arc happens to curl.
const BAND_PAD_X = 8;
const BAND_PAD_Y = 10;
// A little slop beyond the balloon's own measured half-extents — this
// is "did you fly into roughly the right balloon," not a pixel-precise
// hitbox.
const CATCH_RADIUS_SLOP = 20;

// 2026-08-28 feedback: the balloons should feel like they're drifting
// in a light wind, not just gently bobbing up and down — each balloon
// now wanders in a slow ellipse around its grid slot (independent x/y
// sine waves, phase-offset per balloon via driftPhaseX/Y so nothing
// moves in lockstep) rather than a single fixed-amplitude vertical
// tween. Wide enough to actually read as "wind," not just a wobble.
const WIND_DRIFT_RADIUS_X = 22;
const WIND_DRIFT_RADIUS_Y = 26;
const WIND_DRIFT_FREQ_X = 0.5; // radians/sec
const WIND_DRIFT_FREQ_Y = 0.38;

// The string dangling below each balloon: a soft curve (not a straight
// line + arrowhead — that read as a directional pointer, which this
// isn't) ending in a small knot. It sways with its *own* independent
// phase (stringPhase, a different random draw from the body's
// driftPhaseX/Y) per your "let the string float freely, independently
// of the balloon" request, so it flutters on its own timing layered on
// top of whatever the body itself is doing.
const STRING_LENGTH = 30;
const STRING_LENGTH_SWAY = 6;
const STRING_SWAY_RADIUS_X = 10;
const STRING_SWAY_FREQ = 0.9;
const STRING_KNOT_RADIUS = 4;

// The avatar's outstretched reaching hand/arm — replaces "fly the whole
// body into the balloon" with "reach a hand out toward it," per your
// feedback. Points wherever the avatar is currently heading; below
// REACH_SPEED_THRESHOLD (near-stationary) it holds a default up-and-
// forward reach, like reaching for a balloon overhead, rather than
// snapping to whatever tiny residual drift the physics have.
const REACH_LENGTH = CHAR_SIZE * 0.62;
const HAND_RADIUS = CHAR_SIZE * 0.1;
const REACH_SPEED_THRESHOLD = 15;
const DEFAULT_REACH_ANGLE = -Math.PI / 2.3;

// Extra breathing room between grid cells beyond a balloon's own
// measured half-extent, on top of balloonLevelContent.ts's jitter.
// 2026-09-08: trimmed from 16 to 8 alongside a smaller
// CELL_JITTER_FRACTION on "the balloons are too far apart," then nudged
// back up slightly on "spread them out just a little bit more."
const CELL_PADDING = 11;
// Worst case, two balloons in adjacent cells can jitter toward each
// other by CELL_JITTER_FRACTION of a cell each — this is the fraction
// of a cell's width/height that's *guaranteed* clear of that, used to
// size cells so adjacent balloons can never overlap regardless of
// which way their jitter happens to fall.
const JITTER_SAFE_FRACTION = 1 - 2 * CELL_JITTER_FRACTION;
// 2026-09-08 ("the balloons can overlap a little"): applied on top of
// the no-overlap-guaranteed cellW above, so adjacent balloons brush or
// overlap a little instead of always keeping the full guaranteed-clear
// gap. 1 = the old strict no-overlap spacing; smaller pulls them closer.
const ROW_OVERLAP_FRACTION = 0.82;

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
// World px — how close the avatar has to be to a dragged pointer target
// before it's treated as "arrived" rather than still steering toward
// it, avoiding a jittery divide-by-near-zero direction right at the end.
const POINTER_DEADZONE = 6;

interface RuntimeBalloon {
  def: BalloonDef;
  container: Phaser.GameObjects.Container;
  touching: boolean;
  /** 2026-09-08: a wrong (decoy) catch pops that balloon away for good
   * (see handleCatch) — this flags it out of further catch checks and
   * the per-frame drift/string update/DOM sync, rather than actually
   * removing it from `this.balloons` (simpler than re-indexing, and
   * matches IdiomDoorScene's own tiles' `caught` flag). */
  popped: boolean;
  /** Measured half-width/height of this balloon's actual body (varies —
   * see buildBalloon), used both for its own catch radius and to size
   * the world's grid so every balloon actually fits its cell. */
  halfW: number;
  halfH: number;
  /** The grid slot position (layoutBalloons) that the body's wind drift
   * wanders around each frame — the container's actual position is
   * this plus the current drift offset, recomputed in update(). */
  baseX: number;
  baseY: number;
  /** Redrawn every frame (its curve depends on time) — kept separate
   * from the balloon's own static body graphics so the string can sway
   * independently without needing to redraw/reflow the body or text. */
  stringGfx: Phaser.GameObjects.Graphics;
  colorway: BalloonColorway;
}

export class BalloonSentenceScene extends Phaser.Scene {
  private level!: BalloonLevel;
  private onResolved?: () => void;
  private catchState: BalloonCatchState = initialBalloonCatchState();
  private hpState: BalloonHpState = initialBalloonHpState();

  private bg?: Phaser.GameObjects.Graphics;
  private balloonsLayer!: Phaser.GameObjects.Container;
  private balloons: RuntimeBalloon[] = [];
  private worldW = 0;
  private worldH = 0;

  private avatar!: FlightState;
  private avatarContainer!: Phaser.GameObjects.Container;
  private armGfx!: Phaser.GameObjects.Graphics;
  private flightConfig!: FlightConfig;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys!: { w: Phaser.Input.Keyboard.Key; a: Phaser.Input.Keyboard.Key; s: Phaser.Input.Keyboard.Key; d: Phaser.Input.Keyboard.Key };
  // Dragging the avatar directly (per your 2026-08-26 feedback,
  // replacing a fixed on-screen d-pad): while the pointer is down,
  // the avatar steers toward wherever it currently is, using the same
  // floaty acceleration physics as keyboard input — not an instant
  // teleport to the pointer, which would undercut the "weighty" feel.
  private pointerActive = false;
  private pointerTargetX = 0;
  private pointerTargetY = 0;
  private resolved = false;

  constructor() {
    super("BalloonSentenceScene");
  }

  init(data: BalloonSentenceSceneData): void {
    this.level = data.level;
    this.onResolved = data.onResolved;
    this.catchState = initialBalloonCatchState();
    this.hpState = initialBalloonHpState();
    this.balloons = [];
    this.pointerActive = false;
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
    // So the strings are already drawn (not blank) on the very first
    // rendered frame, before update() has run once.
    this.updateBalloonDrift(0);

    updateBalloonStatus(false);
    updateBalloonHpStatus(this.hpState.hp);
    this.updateCameraScroll();

    this.scale.on(Phaser.Scale.Events.RESIZE, () => {
      // The world itself is content-derived, not viewport-derived, so
      // only the background (a fixed screen-space backdrop) and the
      // camera's scroll clamp (viewport-dependent) need to react here.
      this.renderBackground();
      this.updateCameraScroll();
    });
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
      const { container, halfW, halfH, stringGfx, colorway } = this.buildBalloon(def);
      this.balloonsLayer.add(container);
      return { def, container, touching: false, popped: false, halfW, halfH, baseX: 0, baseY: 0, stringGfx, colorway };
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
   *
   * 2026-09-08: two earlier attempts here tried curving this — the
   * *arrangement of balloons in the sky* — per what turned out to be a
   * misreading of "curve the balloon." What was actually asked for was
   * the text *inside* one balloon curving (see buildBalloon's own
   * `computeGlyphArc` use below); scattering multiple balloons into a
   * rainbow shape across the world was never the ask, and both attempts
   * made this stage worse (one badly, one just unnecessarily wider than
   * this grid). Reverted back to the plain grid this always used.
   */
  private layoutBalloons(): void {
    if (this.balloons.length === 0) return;
    const total = this.balloons.length;

    const maxHalfW = Math.max(...this.balloons.map((b) => b.halfW));
    const maxHalfH = Math.max(...this.balloons.map((b) => b.halfH));
    // Every cell is sized for this level's *largest* balloon, and to
    // guarantee no overlap even if two neighbors' jitter both happen to
    // point toward each other — see JITTER_SAFE_FRACTION above. Also
    // reserves room for the wind drift itself (WIND_DRIFT_RADIUS_X/Y):
    // two adjacent balloons could in the worst case drift toward each
    // other by their full radius at the same moment, so that has to be
    // baked into the cell size the same way the static jitter is,
    // rather than just hoping it stays clear in practice.
    const cellW = (maxHalfW * 2 + CELL_PADDING + 2 * WIND_DRIFT_RADIUS_X) / JITTER_SAFE_FRACTION;
    const cellH = (maxHalfH * 2 + CELL_PADDING + 2 * WIND_DRIFT_RADIUS_Y) / JITTER_SAFE_FRACTION;

    // 2026-09-08 ("the balloons can overlap a little, just keep them on
    // the same horizontal line" — dropping the brick-stagger rows from
    // the round before this one): a single row, and ROW_OVERLAP_FRACTION
    // deliberately shrinks the above no-overlap-guaranteed cellW — a
    // small, *intentional* relaxation this time, not the accidental kind
    // earlier balloon-stage PRs shipped by mistake.
    const cols = total;
    const rowCellW = cellW * ROW_OVERLAP_FRACTION;

    const skyX0 = SKY_MARGIN_X;
    const skyY0 = SKY_MARGIN_Y_TOP;
    this.worldW = cols * rowCellW + SKY_MARGIN_X * 2;
    this.worldH = cellH + SKY_MARGIN_Y_TOP + SKY_MARGIN_Y_BOTTOM;

    for (const balloon of this.balloons) {
      const col = balloon.def.slotIndex;
      const centerX = skyX0 + (col + 0.5) * rowCellW;
      const centerY = skyY0 + cellH / 2;
      balloon.baseX = centerX + balloon.def.jitterX * rowCellW;
      balloon.baseY = centerY + balloon.def.jitterY * cellH;
      // update() overwrites this with base + drift every frame once
      // running, but this keeps the very first rendered frame (before
      // update() has run) in the right place rather than at (0, 0).
      balloon.container.setPosition(balloon.baseX, balloon.baseY);
    }
  }

  /**
   * 2026-08-26 redesign: a balloon now always holds exactly one short
   * idiom (4 characters, per idioms.ts) rather than a variable-length
   * spliced sentence, so this no longer needs the old word-wrap-by-
   * character logic — every candidate lays out on a single line, sized
   * to its own (now much larger, per CANDIDATE_CHAR_FONT_PX) rendered
   * width. Pinyin still renders directly above its own character
   * (ruby-style), same as everywhere else in this game.
   */
  /**
   * 2026-09-08 ("curve the balloon so they don't take up so much
   * horizontal space... it should curve like a rainbow"): each
   * character (and its pinyin) leans along a shallow arc instead of
   * sitting in a straight line — like text curving on a badge, not a
   * dramatic bend. Two earlier attempts misread this as curving the
   * *arrangement of balloons in the sky* instead (see layoutBalloons'
   * doc comment) — this is the actual fix, entirely local to one
   * balloon's own content.
   *
   * Each character gets its own small Container (`unitContainer`),
   * positioned and rotated per `computeGlyphArc` — Phaser rotates a
   * container's children for free, so the pinyin-above-hanzi stacking
   * inside it can stay in plain local coordinates, same as before.
   */
  private buildBalloon(def: BalloonDef): {
    container: Phaser.GameObjects.Container;
    halfW: number;
    halfH: number;
    stringGfx: Phaser.GameObjects.Graphics;
    colorway: BalloonColorway;
  } {
    const container = this.add.container(0, 0);
    const chars = Array.from(def.hanzi);

    interface CharUnit {
      hanziText: Phaser.GameObjects.Text;
      pinyinText: Phaser.GameObjects.Text;
      unitWidth: number;
    }
    const units: CharUnit[] = chars.map((char, i) => {
      const pinyin = def.charPinyin[i] ?? "";
      const hanziText = this.add.text(0, 0, char, {
        fontSize: `${CANDIDATE_CHAR_FONT_PX}px`,
        color: BALLOON_TEXT,
        fontFamily: "system-ui, sans-serif",
        fontStyle: "700",
      });
      const pinyinText = this.add.text(0, 0, pinyin, {
        fontSize: `${CANDIDATE_PINYIN_FONT_PX}px`,
        color: BALLOON_TEXT,
        fontFamily: "system-ui, sans-serif",
        fontStyle: "italic",
      });
      return { hanziText, pinyinText, unitWidth: Math.max(hanziText.width, pinyinText.width) };
    });

    // A single shared row height for every unit (rather than each
    // unit's own pinyinText.height) so a shorter-measured pinyin syllable
    // doesn't pull its hanzi character up out of alignment with its
    // neighbors.
    const pinyinRowHeight = Math.max(...units.map((u) => u.pinyinText.height));
    const hanziRowHeight = Math.max(...units.map((u) => u.hanziText.height));
    const unitHeight = pinyinRowHeight + TEXT_GAP + hanziRowHeight;

    // Radius derived from this balloon's own widest character unit (not
    // a flat guess) so adjacent characters land `CHAR_GAP` apart along
    // the curve — same "size from the real measured content" approach
    // every other layout in this project uses. Chord length between two
    // points `GLYPH_ANGLE_STEP_DEG` apart on a circle of radius R is
    // 2R·sin(step/2); solved for R so that chord equals the required
    // spacing.
    const maxUnitWidth = Math.max(...units.map((u) => u.unitWidth));
    const requiredChord = maxUnitWidth + CHAR_GAP;
    const stepRad = (GLYPH_ANGLE_STEP_DEG * Math.PI) / 180;
    const glyphRadius = requiredChord / (2 * Math.sin(stepRad / 2));
    const arcSlots = computeGlyphArc(chars.length, { radius: glyphRadius, angleStepDeg: GLYPH_ANGLE_STEP_DEG });

    // The circle every character sits on (see balloonGlyphArc.ts) is
    // centered at local (0, glyphRadius) in this same coordinate frame
    // — computeGlyphArc's x=R·sin(θ), y=R(1−cos θ) is exactly that
    // circle's parametrization. The card body below is a band around
    // that *same* circle (an inner arc and an outer arc, radially
    // BAND_PAD_Y beyond the text on each side) rather than a flat
    // rectangle — an actually curved card, not a box the curved text
    // happens to sit inside.
    const maxAngleDeg = Math.max(...arcSlots.map((s) => Math.abs(s.angleDeg)));
    const endPadDeg = (BAND_PAD_X / glyphRadius) * (180 / Math.PI);
    const halfSpanRad = ((maxAngleDeg + endPadDeg) * Math.PI) / 180;
    const bandHalfThickness = unitHeight / 2 + BAND_PAD_Y;
    const outerR = glyphRadius + bandHalfThickness;
    const innerR = glyphRadius - bandHalfThickness;

    const pointOnCircle = (radius: number, theta: number): [number, number] => [radius * Math.sin(theta), glyphRadius - radius * Math.cos(theta)];

    const ARC_STEPS = 12;
    const outerPoints: [number, number][] = [];
    const innerPoints: [number, number][] = [];
    for (let i = 0; i <= ARC_STEPS; i++) {
      const theta = -halfSpanRad + (2 * halfSpanRad * i) / ARC_STEPS;
      outerPoints.push(pointOnCircle(outerR, theta));
      innerPoints.push(pointOnCircle(innerR, theta));
    }

    // The card's true bounds come straight from the same points the
    // path below is built from — no separate padding constant to keep
    // in sync with the drawing.
    const allPoints = [...outerPoints, ...innerPoints];
    const minX = Math.min(...allPoints.map((p) => p[0]));
    const maxX = Math.max(...allPoints.map((p) => p[0]));
    const minY = Math.min(...allPoints.map((p) => p[1]));
    const maxY = Math.max(...allPoints.map((p) => p[1]));
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const halfW = (maxX - minX) / 2;
    const halfH = (maxY - minY) / 2;

    const gfx = this.add.graphics();
    // The curved "balloon card" body, built from the outer arc followed
    // by the inner arc walked backward, closing into one banner shape.
    // Color is randomized per balloon (never tied to isCorrect — see
    // balloonLevelContent.ts's colorIndex): the child has to judge which
    // idiom fits the sentence, not learn to spot a color. Added to the
    // container first so every character sits on top of it, not behind.
    const colorway = BALLOON_COLORWAYS[def.colorIndex % BALLOON_COLORWAYS.length];
    gfx.fillStyle(colorway.fill, 0.97);
    gfx.lineStyle(3, colorway.border, 0.9);
    gfx.beginPath();
    gfx.moveTo(outerPoints[0][0] - centerX, outerPoints[0][1] - centerY);
    for (const [x, y] of outerPoints) gfx.lineTo(x - centerX, y - centerY);
    for (let i = innerPoints.length - 1; i >= 0; i--) gfx.lineTo(innerPoints[i][0] - centerX, innerPoints[i][1] - centerY);
    gfx.closePath();
    gfx.fillPath();
    gfx.strokePath();
    container.add(gfx);

    units.forEach((unit, i) => {
      const slot = arcSlots[i];
      const unitContainer = this.add.container(slot.x - centerX, slot.y - centerY);
      unitContainer.setAngle(slot.angleDeg);
      unit.pinyinText.setOrigin(0.5, 0).setPosition(0, -unitHeight / 2);
      unit.hanziText.setOrigin(0.5, 0).setPosition(0, -unitHeight / 2 + pinyinRowHeight + TEXT_GAP);
      unitContainer.add(unit.pinyinText);
      unitContainer.add(unit.hanziText);
      container.add(unitContainer);
    });

    // The dangling string is a separate graphics object — unlike the
    // body above, it's redrawn every frame to sway independently (see
    // updateBalloonDrift/redrawString).
    const stringGfx = this.add.graphics();
    container.add(stringGfx);

    return { container, halfW, halfH, stringGfx, colorway };
  }

  private setupAvatar(): void {
    const { bounds } = this.flightConfig;
    this.avatar = { x: (bounds.minX + bounds.maxX) / 2, y: bounds.maxY - 40, vx: 0, vy: 0 };
    this.avatarContainer = this.add.container(this.avatar.x, this.avatar.y);
    const gfx = this.add.graphics();
    drawPlayerFigure(gfx, CHAR_SIZE);
    this.avatarContainer.add(gfx);
    // The outstretched reaching hand — a separate graphics object,
    // redrawn every frame (see updateReachingArm) since its direction
    // follows wherever the avatar is currently heading. Kept out of
    // the shared drawPlayerFigure so IdiomDoorScene's running figure
    // is unaffected — this reach is specific to "flying toward a
    // balloon's string," not the runner pose.
    this.armGfx = this.add.graphics();
    this.avatarContainer.add(this.armGfx);
    this.updateReachingArm();
  }

  private setupInput(): void {
    this.cursors = this.input.keyboard!.createCursorKeys();
    // Phaser's addKeys returns an object keyed by the *exact* strings
    // passed in (case-sensitive) — passing lowercase here so it lines
    // up with the lowercase field names on `wasdKeys` above, rather
    // than silently returning `undefined` for `.w`/`.a`/`.s`/`.d`.
    this.wasdKeys = this.input.keyboard!.addKeys("w,a,s,d") as typeof this.wasdKeys;

    // Drag anywhere to steer the avatar directly (per your 2026-08-26
    // feedback, replacing a fixed on-screen d-pad) — `pointer.worldX/Y`
    // already accounts for the camera's current scroll, so this tracks
    // correctly regardless of where in the (content-sized) world the
    // camera happens to be looking.
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.pointerActive = true;
      this.pointerTargetX = pointer.worldX;
      this.pointerTargetY = pointer.worldY;
    });
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (!this.pointerActive) return;
      this.pointerTargetX = pointer.worldX;
      this.pointerTargetY = pointer.worldY;
    });
    this.input.on("pointerup", () => {
      this.pointerActive = false;
    });
  }

  update(time: number, delta: number): void {
    if (this.resolved) return;
    const dt = delta / 1000;
    const t = time / 1000;

    this.updateBalloonDrift(t);

    let ax = 0;
    let ay = 0;
    if (this.pointerActive) {
      const dx = this.pointerTargetX - this.avatar.x;
      const dy = this.pointerTargetY - this.avatar.y;
      const dist = Math.hypot(dx, dy);
      // Below the deadzone, treat as "arrived" rather than dividing by
      // a near-zero distance — avoids jittering in place once the
      // avatar reaches wherever it was dragged toward.
      if (dist > POINTER_DEADZONE) {
        ax = dx / dist;
        ay = dy / dist;
      }
    } else {
      ax = (this.cursors.right!.isDown || this.wasdKeys.d.isDown ? 1 : 0) - (this.cursors.left!.isDown || this.wasdKeys.a.isDown ? 1 : 0);
      ay = (this.cursors.down!.isDown || this.wasdKeys.s.isDown ? 1 : 0) - (this.cursors.up!.isDown || this.wasdKeys.w.isDown ? 1 : 0);
    }

    const prevAvatar = this.avatar;
    this.avatar = stepFlight(this.avatar, { ax, ay }, dt, this.flightConfig);
    this.avatarContainer.setPosition(this.avatar.x, this.avatar.y);
    this.updateReachingArm();

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
    updateBalloonCameraScroll(this.cameras.main.scrollX, this.cameras.main.scrollY);
  }

  /**
   * Moves every balloon's body along its own slow elliptical wind-drift
   * path around its grid slot, then redraws its string swaying with a
   * separate, independent phase — see the WIND_DRIFT_ and STRING_
   * constants' comments above for why these are deliberately two uncoupled motions
   * rather than one. `t` is scene time in seconds (not delta), so the
   * motion is a pure function of time rather than something that could
   * drift from accumulated per-frame rounding.
   */
  private updateBalloonDrift(t: number): void {
    for (const balloon of this.balloons) {
      // A popped (wrongly-caught) balloon's container is destroyed —
      // see handleCatch — so it can't be repositioned/redrawn any more.
      if (balloon.popped) continue;
      const driftX = Math.sin(t * WIND_DRIFT_FREQ_X + balloon.def.driftPhaseX) * WIND_DRIFT_RADIUS_X;
      const driftY = Math.sin(t * WIND_DRIFT_FREQ_Y + balloon.def.driftPhaseY) * WIND_DRIFT_RADIUS_Y;
      balloon.container.setPosition(balloon.baseX + driftX, balloon.baseY + driftY);
      this.redrawString(balloon, t);
    }
    // 2026-08-26: mirrors every balloon's current (post-drift) world
    // position + correctness into the DOM — see
    // balloonPositionStatus.ts's syncBalloonTargetPositions doc comment
    // for why (a test can steer deterministically to the correct one
    // instead of guessing a blind search pattern). Popped balloons are
    // excluded — nothing left to steer toward.
    syncBalloonTargetPositions(
      this.balloons.filter((b) => !b.popped).map((b) => ({ id: b.def.id, isCorrect: b.def.isCorrect, x: b.container.x, y: b.container.y })),
    );
  }

  /** Draws the string as a soft quadratic curve (sampled into short
   * line segments — Phaser's Graphics has no direct curve-stroke call)
   * from the balloon's bottom edge down to a small knot, both swaying
   * with the balloon's own stringPhase. Coordinates are local to the
   * balloon's container, so this sway is on top of (not instead of)
   * whatever the body itself is doing via updateBalloonDrift. */
  private redrawString(balloon: RuntimeBalloon, t: number): void {
    const { stringGfx, halfH, def, colorway } = balloon;
    const sway = t * STRING_SWAY_FREQ + def.stringPhase;
    const swayX = Math.sin(sway) * STRING_SWAY_RADIUS_X;
    const swayLen = STRING_LENGTH + Math.sin(sway * 0.7 + def.stringPhase) * STRING_LENGTH_SWAY;

    const startX = 0;
    const startY = halfH - 2;
    const tipX = swayX;
    const tipY = halfH + swayLen;
    const ctrlX = swayX * 0.5;
    const ctrlY = halfH + swayLen * 0.5;

    stringGfx.clear();
    stringGfx.lineStyle(2.5, colorway.border, 0.75);
    stringGfx.beginPath();
    stringGfx.moveTo(startX, startY);
    const STEPS = 8;
    for (let i = 1; i <= STEPS; i++) {
      const u = i / STEPS;
      const x = (1 - u) * (1 - u) * startX + 2 * (1 - u) * u * ctrlX + u * u * tipX;
      const y = (1 - u) * (1 - u) * startY + 2 * (1 - u) * u * ctrlY + u * u * tipY;
      stringGfx.lineTo(x, y);
    }
    stringGfx.strokePath();
    stringGfx.lineStyle(2, colorway.border, 0.8);
    stringGfx.strokeCircle(tipX, tipY, STRING_KNOT_RADIUS);
  }

  /** Points the avatar's outstretched hand wherever it's currently
   * heading — reaching toward whatever balloon it's flying at, correct
   * or not, so (like every other visual in this stage) it can't hint
   * at the answer. Near-stationary, it holds a default up-and-forward
   * reach rather than snapping toward whatever tiny residual drift the
   * flight physics leave in `avatar.vx/vy`. */
  private updateReachingArm(): void {
    const speed = Math.hypot(this.avatar.vx, this.avatar.vy);
    const angle = speed > REACH_SPEED_THRESHOLD ? Math.atan2(this.avatar.vy, this.avatar.vx) : DEFAULT_REACH_ANGLE;
    const shoulderX = CHAR_SIZE * 0.1;
    const shoulderY = -CHAR_SIZE * 0.02;
    const handX = shoulderX + Math.cos(angle) * REACH_LENGTH;
    const handY = shoulderY + Math.sin(angle) * REACH_LENGTH;

    this.armGfx.clear();
    this.armGfx.lineStyle(Math.max(2, CHAR_SIZE * 0.045), 0xf3c88f, 1);
    this.armGfx.lineBetween(shoulderX, shoulderY, handX, handY);
    this.armGfx.fillStyle(0xf3c88f, 1);
    this.armGfx.fillCircle(handX, handY, HAND_RADIUS);
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
      if (balloon.popped) continue;
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
        // 2026-09-08 ("can we include some hp deduction if the wrong
        // balloon is selected... after a wrong selection the balloon
        // should pop away"): deduct this stage's HP (balloonHp.ts) and
        // remove the decoy for good, rather than leaving it touchable
        // again — same tween shape as the correct catch below, just
        // shrinking instead of growing, so a pop reads as distinct from
        // a win. The *correct* balloon is never touched by this branch
        // (attemptBalloonCatch only returns "wrong" for a decoy), so
        // there's always something left to find — no fail state, same
        // ethos as everywhere else in this project.
        this.hpState = applyWrongCatchPenalty(this.hpState);
        updateBalloonHpStatus(this.hpState.hp);
        balloon.popped = true;
        this.spawnSparkBurst(balloon.container.x, balloon.container.y, 3);
        updateBalloonStatus(false, "wrong");
        this.tweens.add({
          targets: balloon.container,
          alpha: 0,
          scale: 0.5,
          duration: 220,
          ease: "Cubic.easeIn",
          onComplete: () => balloon.container.destroy(),
        });
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
