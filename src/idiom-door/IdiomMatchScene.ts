import Phaser from "phaser";
import type { MatchLevel, MatchTile } from "./matchLevelContent";
import { initialMatchProgressState, selectTile, type MatchProgressState } from "./matchProgress";
import { updateMatchStatus } from "./matchStatus";
import { showMatchHint } from "./matchHintStatus";
import { idiomsById } from "../idioms/idioms";
import { initialMatchHpState, applyWrongPairPenalty, type MatchHpState } from "./matchHp";
import { updateMatchHpStatus } from "./matchHpStatus";

export interface IdiomMatchSceneData {
  level: MatchLevel;
  /** This sub-round's starting HP — matchHp.ts's running score across a
   * milestone's whole 3-sub-round finale. Only the milestone's first
   * sub-round omits this (defaulting to matchHp.ts's STARTING_MATCH_HP);
   * main.ts threads every later sub-round's carried-over ending HP back
   * in here on restart. */
  startingHp?: number;
  /** Called with this sub-round's *ending* HP once every pair is
   * joined — main.ts carries that number into the next sub-round's
   * `startingHp`, or (after the milestone's last sub-round) records it
   * as the milestone's final HP. */
  onComplete?: (finalHp: number) => void;
}

// A cool green/teal, distinct from the door stage's warm palette and
// the balloon stage's sky blue — reads as its own stage, same "each
// stage gets its own color identity" pattern those two already use.
const BG_TOP = 0xd7f3e4;
const BG_BOTTOM = 0xfff8ef;

type TileVisualState = "idle" | "selected" | "matched" | "wrong";

// Deliberately uniform across every tile regardless of which idiom it
// belongs to — color-coding by idiom would let a child match by color
// instead of reading the hanzi, the same trap BalloonSentenceScene's
// buildBalloon comment calls out for balloon color vs. correctness.
// Only the *interaction state* (idle/selected/matched/wrong) changes a
// tile's color.
const TILE_COLORS: Record<TileVisualState, { fill: number; border: number }> = {
  idle: { fill: 0xfff8ef, border: 0xd9a15b },
  selected: { fill: 0xffe9c9, border: 0xc1401f },
  matched: { fill: 0xd7f5d3, border: 0x4caf50 },
  wrong: { fill: 0xffd6d6, border: 0xff5c5c },
};

const TILE_TEXT = "#4a3420";
const CHAR_GAP = 4;
const TEXT_GAP = 4;
const PAD_X = 20;
const PAD_Y = 16;
const CORNER_RADIUS = 16;

// Two fixed columns — first halves on the left, second halves on the
// right (2026-08-24 redesign, replacing an earlier "one shuffled grid,
// tap one then its partner" version: your feedback was that tapping
// didn't work well, and a scattered single-tap-twice layout is also a
// less standard shape for a matching exercise than the classic
// worksheet layout this now mirrors). Columns sit at a fraction of the
// viewport width, clamped so a wide tile never clips off a narrow
// screen.
const COLUMN_X_FRACTION = 0.22;
const COLUMN_SIDE_MARGIN = 16;
const COLUMN_ROW_GAP = 22;
const COLUMN_TOP_MARGIN = 90;

const LINE_WIDTH = 5;
const DRAG_LINE_COLOR = TILE_COLORS.selected.border;
const MATCH_LINE_COLOR = TILE_COLORS.matched.border;
const WRONG_LINE_COLOR = TILE_COLORS.wrong.border;

// How long a wrong pair's line/flash stays up before reverting to idle,
// giving the "not quite" feedback (matchStatus's wrong text, and this
// visual) time to actually register before the tiles are tappable
// again.
const WRONG_REVERT_MS = 550;
// Same "let the win register before handing off" beat as
// BalloonSentenceScene's handleCatch uses before calling onResolved.
const COMPLETE_HANDOFF_MS = 700;

// World px of pointer movement, measured from where a drag started,
// below which a press-then-release counts as a tap rather than a drag
// (see endDrag's hint-triggering branch below). Comfortably above
// incidental finger/mouse jitter during a still press, comfortably
// below the distance a deliberate drag toward the other column covers.
const TAP_MOVE_THRESHOLD = 12;

interface RuntimeTile {
  tile: MatchTile;
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Graphics;
  halfW: number;
  halfH: number;
  state: TileVisualState;
}

/**
 * The idiom-halves matching mechanic: each idiom in `level` has been
 * split into two tiles (its first two characters, its last two) — first
 * halves laid out in a column on the left, second halves in a column on
 * the right — and the child drags a line from one half to its partner
 * to join them, like a classic worksheet matching exercise. No *fail*
 * state, same ethos as the rest of this project: a wrong pair just
 * flashes and un-connects, nothing is lost — but per BACKLOG.md's
 * 2026-09-08 "milestone-only matching" entry it does carry a running HP
 * score now (matchHp.ts), penalized on a wrong pair, so a finished
 * milestone still has a number worth showing off.
 *
 * 2026-09-08 redesign: this used to run once per session as a warm-up
 * before the very first door level (main.ts's old beginMatchStage).
 * It's now milestone-finale-only — main.ts starts a fresh instance of
 * this same scene for each of a milestone's 3 sub-rounds in turn (a
 * different, smaller `level` each time — see
 * shared/matchMilestoneHistory.ts's `splitIntoSubRounds`), threading
 * each sub-round's ending HP into the next one's `startingHp`. This
 * scene itself doesn't know it's part of a milestone at all — it's
 * still just "here are some tiles, join them, report the ending HP,"
 * same self-contained shape as before this redesign.
 */
export class IdiomMatchScene extends Phaser.Scene {
  private level!: MatchLevel;
  private onComplete?: (finalHp: number) => void;
  private progressState: MatchProgressState = initialMatchProgressState();
  private hpState: MatchHpState = initialMatchHpState();
  private runtimeTiles = new Map<string, RuntimeTile>();
  private resolved = false;

  private bg?: Phaser.GameObjects.Graphics;
  private gridLayer!: Phaser.GameObjects.Container;
  // Permanent lines for already-matched pairs — kept as tile-id pairs
  // (not fixed pixel coordinates) and redrawn from current tile
  // positions, so a resize (which re-lays-out the columns) doesn't
  // leave old lines pointing at stale positions.
  private matchLinesLayer!: Phaser.GameObjects.Graphics;
  private matchedLines: Array<[string, string]> = [];
  // The in-progress drag's rubber-band line, and (briefly) a
  // just-resolved wrong pair's line — both ephemeral, cleared/redrawn
  // rather than accumulated.
  private dragLine!: Phaser.GameObjects.Graphics;
  private dragOriginId: string | null = null;
  private dragHoverId: string | null = null;
  // Where the current drag's press started, and whether it's moved past
  // TAP_MOVE_THRESHOLD since — lets endDrag tell a plain tap-and-release
  // apart from a drag that just happens to miss its target (see its own
  // doc comment for why only the former shows the hint).
  private dragStartX = 0;
  private dragStartY = 0;
  private dragMoved = false;

  constructor() {
    super("IdiomMatchScene");
  }

  init(data: IdiomMatchSceneData): void {
    this.level = data.level;
    this.onComplete = data.onComplete;
    this.progressState = initialMatchProgressState();
    this.hpState = initialMatchHpState(data.startingHp);
    this.runtimeTiles = new Map();
    this.matchedLines = [];
    this.dragOriginId = null;
    this.dragHoverId = null;
    this.dragMoved = false;
    this.resolved = false;
  }

  create(): void {
    this.gridLayer = this.add.container(0, 0);
    this.matchLinesLayer = this.add.graphics();
    this.dragLine = this.add.graphics();
    this.renderBackground();
    this.spawnTiles();
    // Tiles render above both line layers regardless of add order, so a
    // connecting line runs visually *behind* the cards it joins rather
    // than crossing over their text.
    this.children.bringToTop(this.gridLayer);
    updateMatchStatus(0, this.totalPairs(), false);
    updateMatchHpStatus(this.hpState.hp);

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => this.updateDrag(pointer));
    this.input.on("pointerup", (pointer: Phaser.Input.Pointer) => this.endDrag(pointer));

    this.scale.on(Phaser.Scale.Events.RESIZE, () => {
      this.renderBackground();
      this.layoutTiles();
    });
  }

  private totalPairs(): number {
    return this.level.tiles.length / 2;
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

  private spawnTiles(): void {
    this.gridLayer.removeAll(true);
    this.runtimeTiles = new Map();

    // Column order is just each half's own slice of `level.tiles`,
    // which was already shuffled once at content-build time
    // (matchLevelContent.ts) — restricting a uniformly shuffled array
    // to the elements of one half is itself a uniformly random order,
    // so no separate per-column shuffle is needed here.
    for (const tile of this.level.tiles) {
      const { container, bg, halfW, halfH } = this.buildTileVisual(tile);
      const rt: RuntimeTile = { tile, container, bg, halfW, halfH, state: "idle" };
      this.redrawTileBg(rt);
      container.setSize(halfW * 2, halfH * 2);
      // 2026-08-27 bug fix: this hit rectangle must be given in
      // origin-relative (0,0 to width,height) space, NOT centered at
      // (0,0) the way the tile's own visuals are drawn. Phaser's
      // Container always normalizes a custom hitArea test point by
      // adding `displayOriginX/Y` (= width/2, height/2, per
      // Container.js — a fixed, non-configurable 0.5 origin "to allow
      // Containers to be used for input") before checking it against
      // the shape (InputManager.pointWithinHitArea). A rectangle
      // centered at (-halfW, -halfH) — matching how the card itself is
      // drawn — gets that offset applied *again*, on top of the
      // centering already baked into its own coordinates, shifting the
      // whole sensitive area by (-halfW, -halfH): only the area from
      // the tile's outer edge in to its own center (visually, the
      // upper-left portion) ever registered a touch, exactly the
      // "only sensitive at the top-left corner" behavior reported.
      // Every existing test happened to press exactly at each tile's
      // mathematical center (dragMatchTile's tilePagePosition), which
      // sits right on that boundary and still worked — masking this
      // for real (off-center) touches. See idiom-match.spec.ts's
      // off-center regression test.
      container.setInteractive(new Phaser.Geom.Rectangle(0, 0, halfW * 2, halfH * 2), Phaser.Geom.Rectangle.Contains);
      container.on("pointerdown", (pointer: Phaser.Input.Pointer) => this.startDrag(tile, pointer));
      this.gridLayer.add(container);
      this.runtimeTiles.set(tile.id, rt);
    }

    this.layoutTiles();
  }

  /** Builds one tile's visuals — a rounded card with its two characters
   * side by side, each with its own pinyin ruby-annotation above it,
   * same per-character-pairing approach as BalloonSentenceScene's
   * buildBalloon, just without that one's line-wrapping (a tile's text
   * is always exactly 2 characters, short enough to never need it). */
  private buildTileVisual(tile: MatchTile): { container: Phaser.GameObjects.Container; bg: Phaser.GameObjects.Graphics; halfW: number; halfH: number } {
    const container = this.add.container(0, 0);
    const bg = this.add.graphics();
    container.add(bg);

    const chars = Array.from(tile.text);
    const syllables = tile.pinyin.split(" ");
    const units = chars.map((char, i) => ({
      hanziText: this.add.text(0, 0, char, { fontSize: "30px", color: TILE_TEXT, fontFamily: "system-ui, sans-serif", fontStyle: "700" }),
      pinyinText: this.add.text(0, 0, syllables[i] ?? "", { fontSize: "13px", color: TILE_TEXT, fontFamily: "system-ui, sans-serif", fontStyle: "italic" }),
    }));

    const unitWidths = units.map((u) => Math.max(u.hanziText.width, u.pinyinText.width));
    const contentWidth = unitWidths.reduce((a, b) => a + b, 0) + CHAR_GAP * (units.length - 1);
    const pinyinRowHeight = Math.max(...units.map((u) => u.pinyinText.height));
    const hanziRowHeight = Math.max(...units.map((u) => u.hanziText.height));
    const contentHeight = pinyinRowHeight + TEXT_GAP + hanziRowHeight;

    let cursorX = -contentWidth / 2;
    units.forEach(({ hanziText, pinyinText }, i) => {
      const w = unitWidths[i];
      const cx = cursorX + w / 2;
      pinyinText.setOrigin(0.5, 0).setPosition(cx, -contentHeight / 2);
      hanziText.setOrigin(0.5, 0).setPosition(cx, -contentHeight / 2 + pinyinRowHeight + TEXT_GAP);
      container.add(pinyinText);
      container.add(hanziText);
      cursorX += w + CHAR_GAP;
    });

    const halfW = contentWidth / 2 + PAD_X;
    const halfH = contentHeight / 2 + PAD_Y;
    return { container, bg, halfW, halfH };
  }

  private redrawTileBg(rt: RuntimeTile): void {
    const { fill, border } = TILE_COLORS[rt.state];
    rt.bg.clear();
    rt.bg.fillStyle(fill, 0.97);
    rt.bg.fillRoundedRect(-rt.halfW, -rt.halfH, rt.halfW * 2, rt.halfH * 2, CORNER_RADIUS);
    rt.bg.lineStyle(3, border, 0.95);
    rt.bg.strokeRoundedRect(-rt.halfW, -rt.halfH, rt.halfW * 2, rt.halfH * 2, CORNER_RADIUS);
  }

  /** Lays out the two columns — first halves on the left, second halves
   * on the right, each independently top-to-bottom in its own (already
   * shuffled) order — centered in the current viewport. Column x is a
   * fraction of viewport width, clamped so the widest tile can't clip
   * off a narrow screen. */
  private layoutTiles(): void {
    const tiles = [...this.runtimeTiles.values()];
    if (tiles.length === 0) return;

    const maxHalfW = Math.max(...tiles.map((t) => t.halfW));
    const maxHalfH = Math.max(...tiles.map((t) => t.halfH));
    const rowH = maxHalfH * 2 + COLUMN_ROW_GAP;

    const { width, height } = this.scale;
    const minX = maxHalfW + COLUMN_SIDE_MARGIN;
    const leftX = Math.max(minX, width * COLUMN_X_FRACTION);
    const rightX = Math.min(width - minX, width * (1 - COLUMN_X_FRACTION));

    const layoutColumn = (column: RuntimeTile[], x: number): void => {
      const totalH = column.length * rowH;
      const startY = Math.max(COLUMN_TOP_MARGIN, height / 2 - totalH / 2) + rowH / 2;
      column.forEach((rt, i) => rt.container.setPosition(x, startY + i * rowH));
    };

    layoutColumn(
      tiles.filter((t) => t.tile.half === "first"),
      leftX,
    );
    layoutColumn(
      tiles.filter((t) => t.tile.half === "second"),
      rightX,
    );

    this.syncTilePositionsToDom();
    this.redrawMatchedLines();
  }

  /** Test-only hook mirroring each tile's current canvas-local position
   * — same purpose as IdiomDoorScene's `#player-position` and
   * BalloonSentenceScene's `#balloon-position`, just one entry per tile
   * instead of a single avatar, since there's no other way for an E2E
   * test to know *where* to click a given tile (Phaser draws to a
   * canvas; there's no per-tile DOM element to query or a11y-locate).
   * This scene never scrolls its camera, so a tile's local x/y is
   * already the coordinate a click needs, relative to the canvas's own
   * top-left. */
  private syncTilePositionsToDom(): void {
    const container = document.getElementById("match-tile-positions");
    if (!container) return;
    container.innerHTML = "";
    for (const rt of this.runtimeTiles.values()) {
      const el = document.createElement("span");
      el.dataset.tileId = rt.tile.id;
      el.dataset.x = String(rt.container.x);
      el.dataset.y = String(rt.container.y);
      container.appendChild(el);
    }
  }

  private startDrag(tile: MatchTile, pointer: Phaser.Input.Pointer): void {
    if (this.resolved) return;
    const rt = this.runtimeTiles.get(tile.id);
    if (!rt || rt.state === "matched") return;
    this.dragOriginId = tile.id;
    this.dragHoverId = null;
    this.dragStartX = pointer.worldX;
    this.dragStartY = pointer.worldY;
    this.dragMoved = false;
    this.setTileVisualState(tile.id, "selected");
    this.updateDrag(pointer);
  }

  private updateDrag(pointer: Phaser.Input.Pointer): void {
    if (!this.dragOriginId) return;
    const origin = this.runtimeTiles.get(this.dragOriginId);
    if (!origin) return;

    if (!this.dragMoved) {
      const moved = Phaser.Math.Distance.Between(this.dragStartX, this.dragStartY, pointer.worldX, pointer.worldY);
      if (moved > TAP_MOVE_THRESHOLD) this.dragMoved = true;
    }

    this.drawLine(this.dragLine, origin.container.x, origin.container.y, pointer.worldX, pointer.worldY, DRAG_LINE_COLOR);

    // Highlights whichever tile the pointer is currently over, so a
    // child can see where a release will connect to before letting go
    // — reverted the moment the pointer moves off it.
    const hoverId = this.tileAt(pointer.worldX, pointer.worldY, this.dragOriginId);
    if (hoverId !== this.dragHoverId) {
      if (this.dragHoverId) this.setTileVisualState(this.dragHoverId, "idle");
      if (hoverId) this.setTileVisualState(hoverId, "selected");
      this.dragHoverId = hoverId ?? null;
    }
  }

  private endDrag(pointer: Phaser.Input.Pointer): void {
    if (!this.dragOriginId) return;
    const originId = this.dragOriginId;
    const wasTap = !this.dragMoved;
    this.dragOriginId = null;
    this.dragHoverId = null;
    this.dragLine.clear();

    const targetId = this.tileAt(pointer.worldX, pointer.worldY, originId);
    if (!targetId) {
      // Released on empty space (or back over the origin tile itself) —
      // cancel, no state change, same "nothing lost" ethos as a wrong
      // pair, just without even the flash since no pair was attempted.
      this.setTileVisualState(originId, "idle");
      // A plain touch-and-release with no drag at all, on a first-half
      // (left column) tile, is read as "I don't know this one" and
      // shows a hint — but only that: a *dragged* attempt that misses
      // its target stays silent here, same as it always has, since
      // that's a real (if unlanded) match attempt, not a request for
      // help. Right-half tiles never show a hint either — the hint is
      // keyed to "which idiom is this," which only a first-half tile's
      // own text (its idiom's first two characters) sets up.
      const originTile = this.runtimeTiles.get(originId)?.tile;
      if (wasTap && originTile?.half === "first") {
        const idiom = idiomsById[originTile.idiomId];
        if (idiom) showMatchHint(idiom);
      }
      return;
    }

    this.resolvePair(originId, targetId);
  }

  /** Finds the tile (if any) whose card contains the given scene-space
   * point, excluding `excludeId` and any tile already matched. Used
   * both for live hover feedback during a drag and to resolve what a
   * release landed on. */
  private tileAt(x: number, y: number, excludeId: string): string | undefined {
    for (const rt of this.runtimeTiles.values()) {
      if (rt.tile.id === excludeId || rt.state === "matched") continue;
      if (x >= rt.container.x - rt.halfW && x <= rt.container.x + rt.halfW && y >= rt.container.y - rt.halfH && y <= rt.container.y + rt.halfH) {
        return rt.tile.id;
      }
    }
    return undefined;
  }

  /** A drag that connects two *different*, currently-unmatched tiles
   * always resolves to "matched" or "wrong" — see matchProgress.ts's
   * selectTile: the first call always yields "selected" (state starts
   * clean, since this scene never leaves a selection pending outside of
   * this one synchronous resolution), and the second call, given a
   * different unmatched target, can only land on those two outcomes. */
  private resolvePair(originId: string, targetId: string): void {
    const picked = selectTile(this.progressState, originId, this.level.tiles);
    const result = selectTile(picked.state, targetId, this.level.tiles);
    this.progressState = result.state;
    const matchedPairs = this.progressState.matchedTileIds.length / 2;
    const totalPairs = this.totalPairs();

    if (result.outcome === "matched") {
      const [aId, bId] = result.pair!;
      this.setTileVisualState(aId, "matched");
      this.setTileVisualState(bId, "matched");
      this.matchedLines.push([aId, bId]);
      this.redrawMatchedLines();
      updateMatchStatus(matchedPairs, totalPairs, false, "matched");

      if (matchedPairs === totalPairs) {
        this.resolved = true;
        updateMatchStatus(matchedPairs, totalPairs, true);
        const finalHp = this.hpState.hp;
        this.time.delayedCall(COMPLETE_HANDOFF_MS, () => this.onComplete?.(finalHp));
      }
      return;
    }

    // Only "wrong" is reachable here (see doc comment above).
    this.hpState = applyWrongPairPenalty(this.hpState);
    updateMatchHpStatus(this.hpState.hp);
    const [aId, bId] = result.pair!;
    this.setTileVisualState(aId, "wrong");
    this.setTileVisualState(bId, "wrong");
    this.drawTileLine(this.dragLine, aId, bId, WRONG_LINE_COLOR);
    updateMatchStatus(matchedPairs, totalPairs, false, "wrong");
    this.time.delayedCall(WRONG_REVERT_MS, () => {
      this.setTileVisualState(aId, "idle");
      this.setTileVisualState(bId, "idle");
      this.dragLine.clear();
    });
  }

  /** Redraws every already-matched pair's connecting line from the
   * tiles' *current* positions — called after layout changes (a resize
   * re-lays-out both columns) as well as right after a fresh match, so
   * lines never point at stale coordinates. */
  private redrawMatchedLines(): void {
    this.matchLinesLayer.clear();
    for (const [aId, bId] of this.matchedLines) {
      this.drawTileLine(this.matchLinesLayer, aId, bId, MATCH_LINE_COLOR);
    }
  }

  private drawTileLine(gfx: Phaser.GameObjects.Graphics, aId: string, bId: string, color: number): void {
    const a = this.runtimeTiles.get(aId);
    const b = this.runtimeTiles.get(bId);
    if (!a || !b) return;
    this.drawLine(gfx, a.container.x, a.container.y, b.container.x, b.container.y, color, false);
  }

  private drawLine(gfx: Phaser.GameObjects.Graphics, x1: number, y1: number, x2: number, y2: number, color: number, clearFirst = true): void {
    if (clearFirst) gfx.clear();
    gfx.lineStyle(LINE_WIDTH, color, 0.9);
    gfx.beginPath();
    gfx.moveTo(x1, y1);
    gfx.lineTo(x2, y2);
    gfx.strokePath();
  }

  private setTileVisualState(tileId: string, state: TileVisualState): void {
    const rt = this.runtimeTiles.get(tileId);
    if (!rt) return;
    rt.state = state;
    this.redrawTileBg(rt);
    if (state === "matched") {
      rt.container.disableInteractive();
      this.tweens.add({ targets: rt.container, scale: { from: 1, to: 1.12 }, yoyo: true, duration: 220, ease: "Quad.easeOut" });
    }
  }
}
