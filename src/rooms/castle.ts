import type { RoomDef } from "../state/types";

/**
 * MVP slice: a single room, the Great Hall.
 * Loop: examine the torch sconce for a clue -> solve the stone dial using
 * the clue -> collect the iron key -> use it on the heavy door to win.
 */
export const greatHall: RoomDef = {
  id: "great-hall",
  name: "The Great Hall",
  backgroundColor: 0x1a1024,
  accentColor: 0x3a2a52,
  hotspots: [
    {
      id: "torch-sconce",
      label: "Torch Sconce",
      x: 0.12,
      y: 0.35,
      width: 0.14,
      height: 0.3,
      interaction: {
        type: "examine",
        text: 'Scratched into the stone beneath the torch: "Sun. Moon. Star. In that order, the old dial turns."',
        setsFlag: "clue-found",
      },
    },
    {
      id: "stone-dial",
      label: "Stone Dial",
      x: 0.42,
      y: 0.4,
      width: 0.18,
      height: 0.22,
      interaction: {
        type: "puzzle",
        puzzleId: "great-hall-dial",
      },
    },
    {
      id: "heavy-door",
      label: "Heavy Door",
      x: 0.72,
      y: 0.18,
      width: 0.22,
      height: 0.62,
      requiresFlag: "dial-solved",
      interaction: {
        type: "unlock",
        requiresItem: "iron-key",
        successText: "The iron key turns with a heavy clunk. The door swings open onto darkness beyond — to be continued.",
        setsFlag: "great-hall-complete",
        failText: "It's locked. You'll need something to open it.",
      },
    },
  ],
};

export const castleRooms: Record<string, RoomDef> = {
  [greatHall.id]: greatHall,
};

export const CASTLE_START_ROOM = greatHall.id;
