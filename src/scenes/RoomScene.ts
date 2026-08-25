import Phaser from "phaser";
import type { RoomDef, Hotspot, HotspotIcon } from "../state/types";
import type { GameStateStore } from "../state/gameState";
import type { DialPuzzleConfig } from "../state/types";
import { handleHotspotTap } from "../state/interactions";
import { renderInventory } from "../ui/inventory";
import { isPuzzleOpen } from "../ui/puzzleOverlay";

export interface RoomSceneData {
  room: RoomDef;
  store: GameStateStore;
  puzzles: Record<string, DialPuzzleConfig>;
  /** All rooms travel hotspots may target, keyed by room id. */
  allRooms: Record<string, RoomDef>;
}

/**
 * Procedural/vector art style: no external image assets, drawn entirely
 * with Phaser Graphics + emoji glyphs. Chosen over raster/commissioned art
 * because there's no image-generation tool in this environment to produce
 * the latter — see DECISIONS.md's resolved "art direction" entry.
 */
const ICON_GLYPH: Record<HotspotIcon, string> = {
  torch: "🔥",
  dial: "🌀",
  door: "🚪",
  lever: "🕹",
  chest: "🧰",
  generic: "",
};

export class RoomScene extends Phaser.Scene {
  private room!: RoomDef;
  private store!: GameStateStore;
  private puzzles!: Record<string, DialPuzzleConfig>;
  private allRooms!: Record<string, RoomDef>;
  private hotspotLayer!: Phaser.GameObjects.Container;

  constructor() {
    super("RoomScene");
  }

  init(data: RoomSceneData): void {
    this.room = data.room;
    this.store = data.store;
    this.puzzles = data.puzzles;
    this.allRooms = data.allRooms;
  }

  create(): void {
    renderInventory(this.store.get().inventory);
    this.drawBackground();
    this.hotspotLayer = this.add.container(0, 0);
    this.drawHotspots();

    this.scale.on(Phaser.Scale.Events.RESIZE, () => {
      this.drawBackground();
      this.drawHotspots();
    });
  }

  private drawBackground(): void {
    this.children.getAll("name", "bg").forEach((obj) => obj.destroy());

    const { width, height } = this.scale;
    const base = this.room.backgroundColor;
    const accent = this.room.accentColor;
    const lit = Phaser.Display.Color.IntegerToColor(base).lighten(10).color;
    const wallHeight = height * 0.85;

    const bg = this.add.graphics();
    bg.name = "bg";

    // Wall: gentle top-lit gradient, as if torchlight falls from above.
    bg.fillGradientStyle(lit, lit, base, base, 1);
    bg.fillRect(0, 0, width, wallHeight);

    // Stone brick coursing.
    const brickH = height * 0.055;
    const brickW = width * 0.09;
    bg.lineStyle(1, accent, 0.4);
    for (let row = 0, y = 0; y < wallHeight; row++, y += brickH) {
      const offset = row % 2 === 0 ? 0 : brickW / 2;
      for (let x = -brickW + offset; x < width; x += brickW) {
        bg.strokeRect(x, y, brickW, brickH);
      }
    }

    // Floor band.
    bg.fillGradientStyle(accent, accent, base, base, 1);
    bg.fillRect(0, wallHeight, width, height - wallHeight);
    bg.lineStyle(2, accent, 0.7);
    bg.lineBetween(0, wallHeight, width, wallHeight);

    // Soft corner vignette for depth (layered translucent circles, since
    // Graphics doesn't support radial gradients).
    const corners: Array<[number, number]> = [
      [0, 0],
      [width, 0],
      [0, height],
      [width, height],
    ];
    const vignetteRadius = width * 0.32;
    for (const [cx, cy] of corners) {
      bg.fillStyle(0x000000, 0.12);
      bg.fillCircle(cx, cy, vignetteRadius);
      bg.fillStyle(0x000000, 0.08);
      bg.fillCircle(cx, cy, vignetteRadius * 0.65);
    }

    this.children.sendToBack(bg);
  }

  private goToRoom(roomId: string): void {
    const nextRoom = this.allRooms[roomId];
    if (!nextRoom) return;

    this.room = nextRoom;
    this.store.update((state) => {
      state.currentRoom = roomId;
    });
    this.drawBackground();
    this.drawHotspots();
  }

  private drawHotspots(): void {
    this.hotspotLayer.removeAll(true);
    const { width, height } = this.scale;
    const state = this.store.get();

    for (const hotspot of this.room.hotspots) {
      if (hotspot.requiresFlag && !state.flags[hotspot.requiresFlag]) continue;
      this.addHotspot(hotspot, width, height);
    }
  }

  private addHotspot(hotspot: Hotspot, sceneWidth: number, sceneHeight: number): void {
    const x = hotspot.x * sceneWidth;
    const y = hotspot.y * sceneHeight;
    const w = hotspot.width * sceneWidth;
    const h = hotspot.height * sceneHeight;
    const cx = x + w / 2;
    const cy = y + h / 2;
    const cornerRadius = Math.min(w, h) * 0.12;

    const zone = this.add.zone(x, y, w, h).setOrigin(0, 0).setInteractive({ useHandCursor: true });

    // A recessed stone alcove: dark fill + outer stroke + a faint inner
    // highlight to fake a bevel.
    const frame = this.add.graphics();
    frame.fillStyle(0x000000, 0.25);
    frame.fillRoundedRect(x, y, w, h, cornerRadius);
    frame.lineStyle(2, 0xd9c8ff, 0.55);
    frame.strokeRoundedRect(x, y, w, h, cornerRadius);
    frame.lineStyle(1, 0xffffff, 0.15);
    frame.strokeRoundedRect(x + 3, y + 3, w - 6, h - 6, Math.max(0, cornerRadius - 3));

    const glyph = ICON_GLYPH[hotspot.icon ?? "generic"];
    const icon = glyph
      ? this.add.text(cx, cy, glyph, { fontSize: `${Math.round(Math.min(w, h) * 0.5)}px` }).setOrigin(0.5)
      : null;

    const label = this.add
      .text(cx, y + h + 6, hotspot.label, {
        fontSize: "13px",
        color: "#d9c8ff",
        fontFamily: "system-ui, sans-serif",
      })
      .setOrigin(0.5, 0);

    this.tweens.add({
      targets: icon ?? frame,
      alpha: { from: 0.6, to: 1 },
      duration: 900,
      yoyo: true,
      repeat: -1,
    });

    zone.on("pointerdown", () => {
      // Phaser also listens for mousedown/touchstart at the window level
      // (to catch pointer-up outside the canvas during drags), which
      // means a click on a DOM element sitting on top of the canvas -
      // like the puzzle overlay's buttons - can still hit-test against
      // canvas zones underneath and spuriously re-trigger a hotspot.
      // Puzzles are meant to pause exploration, so ignore taps while one
      // is open rather than let them re-open/reset it mid-interaction.
      if (isPuzzleOpen()) return;

      handleHotspotTap(
        hotspot,
        this.store,
        this.puzzles,
        () => this.drawHotspots(),
        (roomId) => this.goToRoom(roomId),
      );
    });

    const objects: Phaser.GameObjects.GameObject[] = [frame, label, zone];
    if (icon) objects.splice(1, 0, icon);
    this.hotspotLayer.add(objects);
  }
}
