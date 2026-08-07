import Phaser from "phaser";
import type { IdiomContent } from "../idioms/types";
import { computeReveal, DEFAULT_TAPS_PER_CHARACTER } from "./revealProgress";
import { updateRevealStatus } from "./domStatus";

export interface RevealSceneData {
  idiom: IdiomContent;
}

/**
 * Warm placeholder palette — deliberately NOT the final Chinese folk-art
 * direction (that's Snippet 4). Only needs to read as "not the dark
 * castle" for this mechanic-only prototype.
 */
const BG_TOP = 0xfff3e2;
const BG_BOTTOM = 0xffe0b8;
const BLOB_GLOW = 0xffe6bf;
const BLOB_COLOR = 0xf8c07a;
const SLOT_EMPTY = 0xffffff;
const INK = 0x5b3a1f;
const SPARK_COLOR = 0xffffff;

export class RevealScene extends Phaser.Scene {
  private idiom!: IdiomContent;
  private tapCount = 0;
  private lastRevealedCount = 0;

  /**
   * Visual game objects (background/blob/slots) live in this container and
   * get fully torn down + rebuilt on every tap. The interactive zone does
   * NOT live here — it's created once and only ever recreated on an actual
   * resize, never on a tap. Rebuilding the zone per-tap raced with
   * Phaser's own (per-frame, not per-DOM-event) input processing and could
   * silently drop rapid taps — a real UX bug for a child double-tapping,
   * caught by the E2E "no fail state" test before it shipped.
   */
  private visuals!: Phaser.GameObjects.Container;
  private zone!: Phaser.GameObjects.Zone;

  constructor() {
    super("RevealScene");
  }

  init(data: RevealSceneData): void {
    this.idiom = data.idiom;
    this.tapCount = 0;
    this.lastRevealedCount = 0;
  }

  create(): void {
    this.visuals = this.add.container(0, 0);
    this.createZone();
    this.renderVisuals(false);

    this.scale.on(Phaser.Scale.Events.RESIZE, () => {
      this.createZone();
      this.renderVisuals(false);
    });
  }

  private get characters(): string[] {
    return Array.from(this.idiom.hanzi);
  }

  private createZone(): void {
    this.zone?.destroy();
    const { width, height } = this.scale;
    // Phaser also listens for pointerdown at the window level (to catch
    // pointer-up outside the canvas mid-drag), which means a click on a
    // DOM element sitting on top of the canvas — like the "Try another
    // idiom" button in the bottom UI strip — can still hit-test against
    // this zone underneath and spuriously register as a tap (the same bug
    // class found and fixed in the castle prototype's RoomScene). Keeping
    // the zone clear of the UI strip entirely, rather than trying to
    // filter events after the fact, prevents it outright.
    const uiStripHeight = 130;
    const zoneHeight = Math.max(height - uiStripHeight, height * 0.5);
    this.zone = this.add.zone(0, 0, width, zoneHeight).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    this.zone.on("pointerdown", (pointer: Phaser.Input.Pointer) => this.handleTap(pointer.x, pointer.y));
    this.children.sendToBack(this.zone);
  }

  private handleTap(x: number, y: number): void {
    this.spawnSparkBurst(x, y, 6);
    this.tapCount += 1;

    const { revealedCount, isComplete } = computeReveal(this.tapCount, this.characters.length, DEFAULT_TAPS_PER_CHARACTER);
    const justRevealed = revealedCount > this.lastRevealedCount;
    const justRevealedChar = justRevealed ? this.characters[revealedCount - 1] : undefined;
    this.lastRevealedCount = revealedCount;

    updateRevealStatus(revealedCount, this.characters.length, isComplete, justRevealedChar);
    this.renderVisuals(justRevealed);

    if (isComplete && justRevealed) {
      this.playCompleteFlourish();
    }
  }

  /** Rebuilds only the visuals container — never touches the input zone. */
  private renderVisuals(animateNewest: boolean): void {
    this.visuals.removeAll(true);
    const { width, height } = this.scale;

    this.drawBackground(width, height);
    const blobBounds = this.drawBlob(width, height);
    this.drawSlots(blobBounds, animateNewest);
  }

  private drawBackground(width: number, height: number): void {
    const bg = this.add.graphics();
    bg.fillGradientStyle(BG_TOP, BG_TOP, BG_BOTTOM, BG_BOTTOM, 1);
    bg.fillRect(0, 0, width, height);
    this.visuals.add(bg);
  }

  /** Draws the soft "explorable" region and returns its bounding box. */
  private drawBlob(width: number, height: number): { cx: number; cy: number; radius: number } {
    const cx = width / 2;
    const cy = height * 0.42;
    const radius = Math.min(width, height) * 0.34;

    const blob = this.add.graphics();
    blob.fillStyle(BLOB_GLOW, 0.55);
    blob.fillCircle(cx, cy, radius * 1.25);
    blob.fillStyle(BLOB_GLOW, 0.75);
    blob.fillCircle(cx, cy, radius * 1.05);
    blob.fillStyle(BLOB_COLOR, 0.9);
    blob.fillCircle(cx, cy, radius);
    this.visuals.add(blob);

    this.tweens.add({
      targets: blob,
      scale: { from: 0.98, to: 1.02 },
      duration: 1600,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    return { cx, cy, radius };
  }

  private drawSlots(blob: { cx: number; cy: number; radius: number }, animateNewest: boolean): void {
    const { revealedCount, isComplete } = computeReveal(this.tapCount, this.characters.length, DEFAULT_TAPS_PER_CHARACTER);
    const count = this.characters.length;
    const slotSize = blob.radius * 0.52;
    const gap = slotSize * 0.3;
    const totalWidth = count * slotSize + (count - 1) * gap;
    const startX = blob.cx - totalWidth / 2 + slotSize / 2;

    for (let i = 0; i < count; i++) {
      const x = startX + i * (slotSize + gap);
      const y = blob.cy;
      const revealed = i < revealedCount;
      const isNewest = animateNewest && i === revealedCount - 1;

      if (revealed) {
        const text = this.add
          .text(x, y, this.characters[i], {
            fontSize: `${Math.round(slotSize * 0.62)}px`,
            color: "#3a2612",
            fontFamily: "system-ui, sans-serif",
            fontStyle: "600",
          })
          .setOrigin(0.5);
        this.visuals.add(text);
        if (isNewest) {
          text.setScale(0.2);
          text.setAlpha(0);
          this.tweens.add({ targets: text, scale: 1, alpha: 1, duration: 420, ease: "Back.easeOut" });
        }
      } else {
        const outline = this.add.graphics();
        outline.lineStyle(2, INK, 0.35);
        outline.strokeRoundedRect(x - slotSize / 2, y - slotSize / 2, slotSize, slotSize, slotSize * 0.18);
        outline.fillStyle(SLOT_EMPTY, 0.25);
        outline.fillRoundedRect(x - slotSize / 2, y - slotSize / 2, slotSize, slotSize, slotSize * 0.18);
        this.visuals.add(outline);
      }
    }

    if (isComplete) {
      const pinyin = this.add
        .text(blob.cx, blob.cy + slotSize * 0.85, this.idiom.pinyin, {
          fontSize: "16px",
          color: "#7a5636",
          fontFamily: "system-ui, sans-serif",
          fontStyle: "italic",
        })
        .setOrigin(0.5);
      this.visuals.add(pinyin);
      if (animateNewest) {
        pinyin.setAlpha(0);
        this.tweens.add({ targets: pinyin, alpha: 1, duration: 500, delay: 150 });
      }
    }
  }

  /** Sparks live outside `visuals` and self-destroy via tween — a tap-
   * triggered redraw must never cut off a still-animating burst. */
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
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height * 0.42;
    for (let i = 0; i < 16; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * (Math.min(width, height) * 0.3);
      this.time.delayedCall(i * 20, () => {
        this.spawnSparkBurst(cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist, 4);
      });
    }
  }
}
