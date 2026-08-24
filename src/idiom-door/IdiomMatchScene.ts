import Phaser from "phaser";
import type { MatchLevel, MatchTile } from "./matchLevelContent";
import { initialMatchProgressState, selectTile, type MatchProgressState } from "./matchProgress";
import { updateMatchStatus } from "./matchStatus";

export interface IdiomMatchSceneData {
  level: MatchLevel;
  onComplete?: () => void;
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
const GRID_GAP = 22;
const GRID_TOP_MARGIN = 90;

// How long a wrong pair stays flashed red before reverting to idle,
// giving the "not quite" feedback (matchStatus's wrong text, and this
// visual) time to actually register before the tiles are tappable
// again.
const WRONG_REVERT_MS = 550;
// Same "let the win register before handing off" beat as
// BalloonSentenceScene's handleCatch uses before calling onResolved.
const COMPLETE_HANDOFF_MS = 700;

interface RuntimeTile {
  tile: MatchTile;
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Graphics;
  halfW: number;
  halfH: number;
  state: TileVisualState;
}

/**
 * The warm-up matching stage: each idiom in `level` has been split into
 * two tiles (its first two characters, its last two), scattered
 * face-up, and the child taps one then its partner to join them —
 * closer to a classic memory-match game than the door/balloon stages'
 * catch-based mechanics. No fail state, same ethos as the rest of this
 * project: a wrong pair just flashes and un-selects, nothing is lost.
 */
export class IdiomMatchScene extends Phaser.Scene {
  private level!: MatchLevel;
  private onComplete?: () => void;
  private progressState: MatchProgressState = initialMatchProgressState();
  private runtimeTiles = new Map<string, RuntimeTile>();
  private resolved = false;

  private bg?: Phaser.GameObjects.Graphics;
  private gridLayer!: Phaser.GameObjects.Container;

  constructor() {
    super("IdiomMatchScene");
  }

  init(data: IdiomMatchSceneData): void {
    this.level = data.level;
    this.onComplete = data.onComplete;
    this.progressState = initialMatchProgressState();
    this.runtimeTiles = new Map();
    this.resolved = false;
  }

  create(): void {
    this.gridLayer = this.add.container(0, 0);
    this.renderBackground();
    this.spawnTiles();
    updateMatchStatus(0, this.totalPairs(), false);

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

    // Display order is just `level.tiles`' own order — already shuffled
    // once at content-build time (matchLevelContent.ts), so no separate
    // layout shuffle is needed here.
    for (const tile of this.level.tiles) {
      const { container, bg, halfW, halfH } = this.buildTileVisual(tile);
      const rt: RuntimeTile = { tile, container, bg, halfW, halfH, state: "idle" };
      this.redrawTileBg(rt);
      container.setSize(halfW * 2, halfH * 2);
      container.setInteractive(new Phaser.Geom.Rectangle(-halfW, -halfH, halfW * 2, halfH * 2), Phaser.Geom.Rectangle.Contains);
      container.on("pointerdown", () => this.handleTileTap(tile));
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

  /** Arranges tiles into a roughly-square grid centered in the current
   * viewport — same "content-sized cells, no overlap" idea as
   * BalloonSentenceScene's layoutBalloons, but static (no camera pan or
   * drift): this is a small, fixed set of cards, not a world to roam. */
  private layoutTiles(): void {
    const tiles = [...this.runtimeTiles.values()];
    if (tiles.length === 0) return;

    const maxHalfW = Math.max(...tiles.map((t) => t.halfW));
    const maxHalfH = Math.max(...tiles.map((t) => t.halfH));
    const cellW = maxHalfW * 2 + GRID_GAP;
    const cellH = maxHalfH * 2 + GRID_GAP;
    const cols = Math.ceil(Math.sqrt(tiles.length));
    const rows = Math.ceil(tiles.length / cols);

    const { width, height } = this.scale;
    const gridW = cols * cellW;
    const gridH = rows * cellH;
    const originX = width / 2 - gridW / 2;
    const originY = Math.max(GRID_TOP_MARGIN, height / 2 - gridH / 2);

    tiles.forEach((rt, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      rt.container.setPosition(originX + (col + 0.5) * cellW, originY + (row + 0.5) * cellH);
    });

    this.syncTilePositionsToDom();
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

  private handleTileTap(tile: MatchTile): void {
    if (this.resolved) return;

    const result = selectTile(this.progressState, tile.id, this.level.tiles);
    this.progressState = result.state;
    const matchedPairs = this.progressState.matchedTileIds.length / 2;
    const totalPairs = this.totalPairs();

    switch (result.outcome) {
      case "ignored":
        return;
      case "selected":
        this.setTileVisualState(tile.id, "selected");
        updateMatchStatus(matchedPairs, totalPairs, false);
        return;
      case "deselected":
        this.setTileVisualState(tile.id, "idle");
        updateMatchStatus(matchedPairs, totalPairs, false);
        return;
      case "matched": {
        const [aId, bId] = result.pair!;
        this.setTileVisualState(aId, "matched");
        this.setTileVisualState(bId, "matched");
        updateMatchStatus(matchedPairs, totalPairs, false, "matched");

        if (matchedPairs === totalPairs) {
          this.resolved = true;
          updateMatchStatus(matchedPairs, totalPairs, true);
          this.time.delayedCall(COMPLETE_HANDOFF_MS, () => this.onComplete?.());
        }
        return;
      }
      case "wrong": {
        const [aId, bId] = result.pair!;
        this.setTileVisualState(aId, "wrong");
        this.setTileVisualState(bId, "wrong");
        this.shakeTile(aId);
        this.shakeTile(bId);
        updateMatchStatus(matchedPairs, totalPairs, false, "wrong");
        this.time.delayedCall(WRONG_REVERT_MS, () => {
          this.setTileVisualState(aId, "idle");
          this.setTileVisualState(bId, "idle");
        });
        return;
      }
    }
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

  private shakeTile(tileId: string): void {
    const rt = this.runtimeTiles.get(tileId);
    if (!rt) return;
    const baseX = rt.container.x;
    this.tweens.add({
      targets: rt.container,
      x: { from: baseX - 6, to: baseX + 6 },
      duration: 55,
      yoyo: true,
      repeat: 3,
      onComplete: () => rt.container.setX(baseX),
    });
  }
}
