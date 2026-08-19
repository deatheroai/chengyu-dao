import Phaser from "phaser";
import type { IdiomContent } from "../idioms/types";
import { catchItemDefs, type CatchItemDef } from "./catchItems";
import { applyCatch, initialCatchState, type CatchState } from "./catchProgress";
import { updateCatchStatus } from "./domStatus";
import { drawIcon } from "./drawIcon";

export interface CatchSceneData {
  idiom: IdiomContent;
  /** Fires once, the moment every character has been caught — mirrors
   * RevealScene's onComplete, for a future session host to hook into
   * (Phase 1+, not wired up yet in the standalone Phase 0 spike). */
  onComplete?: () => void;
}

const BG_TOP = 0xfff6e6;
const BG_BOTTOM = 0xffdca0;
const SLOT_EMPTY_FILL = 0xfff1d6;
const SLOT_BORDER = 0xf0b429;
const SLOT_TEXT = "#7a5636";
const SPARK_COLOR = 0xffd76a;
const BASKET_COLOR = 0xc1401f;
const BASKET_RIM = 0xf0b429;
// Pixels/second of downward drift. Fast enough to feel like real play
// (not a slow crawl) while still giving a young child an easy, generous
// window to react — this is the value most worth tuning by feel once you
// play the built spike.
const FALL_SPEED = 130;

interface FallingItem {
  def: CatchItemDef;
  container: Phaser.GameObjects.Container;
  y: number;
  speed: number;
}

export class CatchScene extends Phaser.Scene {
  private idiom!: IdiomContent;
  private onComplete?: () => void;
  private catchState: CatchState = initialCatchState();

  private slotsLayer!: Phaser.GameObjects.Container;
  private itemsLayer!: Phaser.GameObjects.Container;
  private basket!: Phaser.GameObjects.Container;
  private basketX = 0;
  private dragZone!: Phaser.GameObjects.Zone;
  private dragging = false;

  private items: FallingItem[] = [];

  constructor() {
    super("CatchScene");
  }

  init(data: CatchSceneData): void {
    this.idiom = data.idiom;
    this.onComplete = data.onComplete;
    this.catchState = initialCatchState();
    this.items = [];
    this.dragging = false;
  }

  private get characters(): string[] {
    return Array.from(this.idiom.hanzi);
  }

  create(): void {
    this.slotsLayer = this.add.container(0, 0);
    this.itemsLayer = this.add.container(0, 0);

    this.renderBackground();
    this.renderSlots();
    this.spawnItems();
    this.createBasket();
    this.createDragZone();
    this.input.on("pointerup", () => {
      this.dragging = false;
    });

    updateCatchStatus(0, this.characters.length, false);

    this.scale.on(Phaser.Scale.Events.RESIZE, () => {
      this.renderBackground();
      this.renderSlots(false);
      this.layoutItems();
      this.layoutBasket();
      this.createDragZone();
    });
  }

  /** Stops the drag zone from reacting further — same purpose as
   * RevealScene.disableInput, kept for a future multi-phase session
   * host even though the standalone Phase 0 page doesn't call it. */
  disableInput(): void {
    this.dragZone?.disableInteractive();
  }

  private renderBackground(): void {
    this.bg?.destroy();
    const { width, height } = this.scale;
    this.bg = this.add.graphics();
    this.bg.fillGradientStyle(BG_TOP, BG_TOP, BG_BOTTOM, BG_BOTTOM, 1);
    this.bg.fillRect(0, 0, width, height);
    this.children.sendToBack(this.bg);
  }
  private bg?: Phaser.GameObjects.Graphics;

  private renderSlots(animateNewest = false): void {
    this.slotsLayer.removeAll(true);
    const { width } = this.scale;
    const count = this.characters.length;
    const slotSize = Math.min(64, (width * 0.7) / count - 10);
    const gap = slotSize * 0.25;
    const totalWidth = count * slotSize + (count - 1) * gap;
    const startX = width / 2 - totalWidth / 2 + slotSize / 2;
    const y = 56;

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

  /** Fall lane: below the character slots, above the basket's catch
   * line. Items are staggered above the top edge at spawn/recycle time
   * so they trickle in rather than all arriving at once. */
  private get fallTop(): number {
    return 110;
  }
  private get catchLineY(): number {
    return this.scale.height - 110;
  }

  private spawnItems(): void {
    this.itemsLayer.removeAll(true);
    this.items = catchItemDefs.map((def, i) => {
      const container = this.add.container(0, 0);
      const gfx = this.add.graphics();
      drawIcon(gfx, def.icon, 46);
      container.add(gfx);
      this.itemsLayer.add(container);
      return {
        def,
        container,
        y: this.fallTop - i * 130 - Phaser.Math.Between(0, 60),
        speed: FALL_SPEED + Phaser.Math.Between(-15, 15),
      };
    });
    this.layoutItems();
  }

  private layoutItems(): void {
    const { width } = this.scale;
    const margin = width * 0.12;
    for (const item of this.items) {
      const seed = hashString(item.def.id);
      const x = margin + (seed % 1000) / 1000 * (width - margin * 2);
      item.container.setPosition(x, item.y);
    }
  }

  private createBasket(): void {
    this.basketX = this.scale.width / 2;
    this.basket = this.add.container(this.basketX, this.catchLineY + 40);
    this.drawBasket();
    this.tweens.add({
      targets: this.basket,
      scaleY: { from: 0.96, to: 1.02 },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  private drawBasket(): void {
    this.basket.removeAll(true);
    const gfx = this.add.graphics();
    gfx.fillStyle(BASKET_COLOR, 0.95);
    gfx.fillRoundedRect(-52, -18, 104, 32, 10);
    gfx.lineStyle(4, BASKET_RIM, 1);
    gfx.strokeRoundedRect(-52, -18, 104, 32, 10);
    gfx.lineStyle(3, BASKET_RIM, 0.6);
    gfx.lineBetween(-30, -18, -30, 14);
    gfx.lineBetween(0, -18, 0, 14);
    gfx.lineBetween(30, -18, 30, 14);
    this.basket.add(gfx);
  }

  private layoutBasket(): void {
    this.basketX = Phaser.Math.Clamp(this.basketX, 60, this.scale.width - 60);
    this.basket.setPosition(this.basketX, this.catchLineY + 40);
  }

  private createDragZone(): void {
    this.dragZone?.destroy();
    const { width, height } = this.scale;
    const stripTop = height - 170;
    this.dragZone = this.add.zone(0, stripTop, width, height - stripTop).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    this.dragZone.on("pointerdown", (p: Phaser.Input.Pointer) => {
      this.dragging = true;
      this.moveBasketTo(p.x);
    });
    this.dragZone.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (this.dragging) this.moveBasketTo(p.x);
    });
  }

  private moveBasketTo(x: number): void {
    this.basketX = Phaser.Math.Clamp(x, 60, this.scale.width - 60);
    this.basket.setPosition(this.basketX, this.catchLineY + 40);
  }

  update(_time: number, delta: number): void {
    if (this.catchState.isComplete) return;
    const catchRadius = 56;

    for (const item of this.items) {
      const prevY = item.y;
      const nextY = prevY + (item.speed * delta) / 1000;
      const bandHalf = 18;

      // Whether this frame's *swept path* (prevY..nextY) overlaps the
      // catch band, not just whether the item's current position sits
      // inside it. A point-in-band check can silently miss an item
      // entirely on a slow frame (real device jank, or this sandbox's
      // known parallel-test contention — see DECISIONS.md's tap-drop
      // entries for the same class of bug in RevealScene): if the
      // per-frame step is ever larger than the band's width, the item
      // can step clean over it between one frame and the next. A swept
      // overlap still catches it that frame, while still giving several
      // consecutive frames of overlap (and so several chances to line
      // the basket up in x) on any normal frame rate, same as before.
      const overlapsBand = nextY >= this.catchLineY - bandHalf && prevY <= this.catchLineY + bandHalf;
      const withinX = Math.abs(item.container.x - this.basketX) < catchRadius;

      item.y = nextY;
      item.container.setY(item.y);

      if (overlapsBand && withinX) {
        this.handleCatch(item);
        continue;
      }

      if (item.y > this.scale.height + 60) {
        // Loop back to the top rather than disappearing for good — no
        // fail state, same ethos as every prior snippet.
        item.y = this.fallTop - Phaser.Math.Between(20, 220);
        this.layoutItems();
      }
    }
  }

  private handleCatch(item: FallingItem): void {
    this.spawnSparkBurst(item.container.x, item.container.y, item.def.kind === "correct" ? 8 : 4);

    const wasComplete = this.catchState.isComplete;
    this.catchState = applyCatch(this.catchState, item.def.kind, this.characters.length);
    const justRevealed = !wasComplete && this.catchState.revealedCount > 0 && item.def.kind === "correct";

    updateCatchStatus(this.catchState.revealedCount, this.characters.length, this.catchState.isComplete, item.def.kind);
    if (justRevealed) this.renderSlots(true);

    // Recycle the caught item back to the top so there's always
    // something to catch, whether it was correct or a decoy.
    item.y = this.fallTop - Phaser.Math.Between(20, 220);
    this.layoutItems();

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
    const cy = this.catchLineY;
    for (let i = 0; i < 16; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * (width * 0.25);
      this.time.delayedCall(i * 20, () => {
        this.spawnSparkBurst(width / 2 + Math.cos(angle) * dist, cy + Math.sin(angle) * dist, 4);
      });
    }
  }
}

/** Small deterministic string hash — used only to spread items across
 * the fall lane's x-range without needing per-frame random re-layout. */
function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}
