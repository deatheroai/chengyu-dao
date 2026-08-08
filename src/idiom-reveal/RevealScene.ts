import Phaser from "phaser";
import type { IdiomContent } from "../idioms/types";
import { computeReveal, DEFAULT_TAPS_PER_CHARACTER } from "./revealProgress";
import { updateRevealStatus } from "./domStatus";

export interface RevealSceneData {
  idiom: IdiomContent;
}

/**
 * Snippet 4 folk-art palette: the explorable region reads as a paper
 * lantern (lantern red body, gold rim/ribs/tassel) instead of Snippet 2's
 * neutral warm blob. Corner cloud-swirl motifs add a light decorative
 * frame. Same procedural/vector approach as the castle prototype (Phaser
 * Graphics only, no raster art) — see DECISIONS.md for why.
 */
const BG_TOP = 0xfff6e6;
const BG_BOTTOM = 0xffdca0;
const LANTERN_GLOW = 0xffcf9e;
const LANTERN_BODY = 0xd1432b;
const LANTERN_RIM = 0xf0b429;
const SLOT_EMPTY_FILL = 0xfff1d6;
const SLOT_TEXT_ON_LANTERN = "#fff6e0";
const PINYIN_INK = "#7a5636";
const MOTIF_COLOR = 0xc98a2e;
const SPARK_COLOR = 0xffd76a;

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

  /**
   * Purely decorative corner motifs don't depend on reveal state, so
   * they live outside `visuals` and only get redrawn on an actual
   * resize — not on every tap. They used to be part of the per-tap
   * teardown/rebuild, which added avoidable draw calls on every single
   * tap for something that never changes; harmless on a real device, but
   * this sandbox's software-rendered Chromium is sensitive enough to
   * per-frame cost under parallel E2E load that it's worth trimming.
   */
  private staticDecor!: Phaser.GameObjects.Container;

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
    this.staticDecor = this.add.container(0, 0);
    this.createZone();
    this.renderStaticDecor();
    this.renderVisuals(false);

    this.scale.on(Phaser.Scale.Events.RESIZE, () => {
      this.createZone();
      this.renderStaticDecor();
      this.renderVisuals(false);
    });
  }

  private renderStaticDecor(): void {
    this.staticDecor.removeAll(true);
    const { width, height } = this.scale;
    this.drawCornerMotifs(width, height);
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
    const lanternBounds = this.drawLantern(width, height);
    this.drawSlots(lanternBounds, animateNewest);
  }

  private drawBackground(width: number, height: number): void {
    const bg = this.add.graphics();
    bg.fillGradientStyle(BG_TOP, BG_TOP, BG_BOTTOM, BG_BOTTOM, 1);
    bg.fillRect(0, 0, width, height);
    this.visuals.add(bg);
  }

  /** Faint gold "ruyi cloud" swirls in the top corners — a light
   * decorative frame, kept low-opacity so it never competes with the
   * tap region or reads as another interactive element. */
  private drawCornerMotifs(width: number, height: number): void {
    const motifs = this.add.graphics();
    motifs.fillStyle(MOTIF_COLOR, 0.14);
    const corners: Array<[number, number, number]> = [
      [width * 0.08, height * 0.06, 1],
      [width * 0.92, height * 0.06, -1],
    ];
    for (const [x, y, dir] of corners) {
      motifs.fillCircle(x, y, 14);
      motifs.fillCircle(x + 13 * dir, y + 6, 10);
      motifs.fillCircle(x + 23 * dir, y - 3, 7);
    }
    this.staticDecor.add(motifs);
  }

  /**
   * Draws the explorable region as a paper lantern — body, cap rims,
   * ribs, hanging string and tassel — and returns its bounding box for
   * `drawSlots` to lay characters out against. Shapes are drawn in local
   * space around (0, 0) and the whole graphics object is positioned at
   * (cx, cy), so the idle sway/pulse tweens (which animate scale/angle)
   * rotate and scale around the lantern's own center instead of the
   * screen's top-left corner.
   */
  private drawLantern(width: number, height: number): { cx: number; cy: number; radius: number } {
    const cx = width / 2;
    const cy = height * 0.42;
    const radius = Math.min(width, height) * 0.34;

    const lantern = this.add.graphics();
    lantern.setPosition(cx, cy);

    lantern.fillStyle(LANTERN_GLOW, 0.5);
    lantern.fillCircle(0, 0, radius * 1.3);
    lantern.fillStyle(LANTERN_GLOW, 0.7);
    lantern.fillCircle(0, 0, radius * 1.08);

    lantern.lineStyle(2, LANTERN_RIM, 0.6);
    lantern.lineBetween(0, -radius * 1.15, 0, -radius * 0.98);

    lantern.fillStyle(LANTERN_RIM, 1);
    lantern.fillEllipse(0, -radius * 0.92, radius * 0.55, radius * 0.16);

    lantern.fillStyle(LANTERN_BODY, 0.95);
    // Wide enough to comfortably contain all 4 character slots (see
    // drawSlots) inside the round body, rather than letting the outer
    // slots poke past its edge.
    lantern.fillEllipse(0, 0, radius * 2.3, radius * 1.85);

    // Rib x positions/heights follow the body ellipse's actual boundary
    // (half-width 1.15r, half-height 0.925r to match the fillEllipse
    // above) so they read as belonging to the wider body rather than
    // looking bunched toward the center.
    lantern.lineStyle(1.5, LANTERN_RIM, 0.35);
    const bodyHalfWidth = radius * 1.15;
    const bodyHalfHeight = radius * 0.925;
    const ribCount = 5;
    for (let i = 1; i < ribCount; i++) {
      const t = i / ribCount - 0.5;
      const rx = t * bodyHalfWidth * 1.8;
      const norm = rx / bodyHalfWidth;
      const ribHalfHeight = Math.sqrt(Math.max(0, 1 - norm * norm)) * bodyHalfHeight * 0.95;
      lantern.lineBetween(rx, -ribHalfHeight, rx, ribHalfHeight);
    }

    lantern.fillStyle(LANTERN_RIM, 1);
    lantern.fillEllipse(0, radius * 0.92, radius * 0.55, radius * 0.16);

    lantern.lineStyle(2, LANTERN_RIM, 0.7);
    lantern.lineBetween(0, radius * 1.0, 0, radius * 1.22);
    lantern.fillStyle(LANTERN_RIM, 0.9);
    lantern.fillCircle(0, radius * 1.28, radius * 0.05);

    this.visuals.add(lantern);

    this.tweens.add({
      targets: lantern,
      scale: { from: 0.98, to: 1.02 },
      duration: 1600,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
    // Gentle sway, on its own timing so it doesn't read as mechanical
    // alongside the pulse — a lantern moving in a light breeze, not a
    // pumping animation.
    this.tweens.add({
      targets: lantern,
      angle: { from: -1.5, to: 1.5 },
      duration: 2600,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    return { cx, cy, radius };
  }

  private drawSlots(lantern: { cx: number; cy: number; radius: number }, animateNewest: boolean): void {
    const { revealedCount, isComplete } = computeReveal(this.tapCount, this.characters.length, DEFAULT_TAPS_PER_CHARACTER);
    const count = this.characters.length;
    const slotSize = lantern.radius * 0.46;
    const gap = slotSize * 0.25;
    const totalWidth = count * slotSize + (count - 1) * gap;
    const startX = lantern.cx - totalWidth / 2 + slotSize / 2;

    for (let i = 0; i < count; i++) {
      const x = startX + i * (slotSize + gap);
      const y = lantern.cy;
      const revealed = i < revealedCount;
      const isNewest = animateNewest && i === revealedCount - 1;

      if (revealed) {
        // Revealed characters sit on the lantern's red body, so they need
        // a light, warm color (not the dark ink Snippet 2 used against a
        // pale background) to stay readable.
        const text = this.add
          .text(x, y, this.characters[i], {
            fontSize: `${Math.round(slotSize * 0.62)}px`,
            color: SLOT_TEXT_ON_LANTERN,
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
        // Empty slots read as small gold-trimmed paper tags against the
        // lantern body, rather than a plain outline box.
        const outline = this.add.graphics();
        outline.lineStyle(2, LANTERN_RIM, 0.7);
        outline.strokeRoundedRect(x - slotSize / 2, y - slotSize / 2, slotSize, slotSize, slotSize * 0.18);
        outline.fillStyle(SLOT_EMPTY_FILL, 0.3);
        outline.fillRoundedRect(x - slotSize / 2, y - slotSize / 2, slotSize, slotSize, slotSize * 0.18);
        this.visuals.add(outline);
      }
    }

    if (isComplete) {
      // Below the tassel, clear of the lantern body, so it sits on the
      // plain background where the darker ink color reads well again.
      const pinyin = this.add
        .text(lantern.cx, lantern.cy + lantern.radius * 1.55, this.idiom.pinyin, {
          fontSize: "16px",
          color: PINYIN_INK,
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
