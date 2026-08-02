import Phaser from "phaser";
import type { RoomDef, Hotspot } from "../state/types";
import type { GameStateStore } from "../state/gameState";
import type { DialPuzzleConfig } from "../state/types";
import { handleHotspotTap } from "../state/interactions";
import { renderInventory } from "../ui/inventory";

export interface RoomSceneData {
  room: RoomDef;
  store: GameStateStore;
  puzzles: Record<string, DialPuzzleConfig>;
}

export class RoomScene extends Phaser.Scene {
  private room!: RoomDef;
  private store!: GameStateStore;
  private puzzles!: Record<string, DialPuzzleConfig>;
  private hotspotLayer!: Phaser.GameObjects.Container;

  constructor() {
    super("RoomScene");
  }

  init(data: RoomSceneData): void {
    this.room = data.room;
    this.store = data.store;
    this.puzzles = data.puzzles;
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
    const bg = this.add.graphics();
    bg.name = "bg";
    bg.fillStyle(this.room.backgroundColor, 1);
    bg.fillRect(0, 0, width, height);

    // A little placeholder set-dressing so the scene doesn't look empty.
    bg.fillStyle(this.room.accentColor, 0.5);
    for (let i = 0; i < 6; i++) {
      const x = (i / 6) * width + width * 0.02;
      bg.fillRect(x, 0, width * 0.02, height);
    }
    bg.fillStyle(this.room.accentColor, 0.8);
    bg.fillRect(0, height * 0.85, width, height * 0.15);

    this.children.sendToBack(bg);
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

    const zone = this.add.zone(x, y, w, h).setOrigin(0, 0).setInteractive({ useHandCursor: true });

    const outline = this.add
      .rectangle(x, y, w, h, 0xffffff, 0.06)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0xd9c8ff, 0.7);

    const label = this.add
      .text(x + w / 2, y + h + 6, hotspot.label, {
        fontSize: "13px",
        color: "#d9c8ff",
        fontFamily: "system-ui, sans-serif",
      })
      .setOrigin(0.5, 0);

    this.tweens.add({
      targets: outline,
      alpha: { from: 0.35, to: 0.8 },
      duration: 900,
      yoyo: true,
      repeat: -1,
    });

    zone.on("pointerdown", () => {
      handleHotspotTap(hotspot, this.store, this.puzzles, () => this.drawHotspots());
    });

    this.hotspotLayer.add([outline, label, zone]);
  }
}
