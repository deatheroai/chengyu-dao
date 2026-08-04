import Phaser from "phaser";
import { RoomScene } from "./scenes/RoomScene";
import { castleRooms, CASTLE_START_ROOM } from "./rooms/castle";
import { puzzles } from "./puzzles/dialPuzzles";
import { initGameState } from "./state/gameState";

async function bootstrap(): Promise<void> {
  const store = await initGameState("castle", CASTLE_START_ROOM);
  const room = castleRooms[store.get().currentRoom] ?? castleRooms[CASTLE_START_ROOM];

  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: "game-container",
    backgroundColor: "#0b0710",
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: "100%",
      height: "100%",
    },
    scene: [RoomScene],
  };

  const game = new Phaser.Game(config);
  game.scene.start("RoomScene", { room, store, puzzles, allRooms: castleRooms });
}

void bootstrap();
