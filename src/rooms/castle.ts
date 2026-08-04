import type { RoomDef } from "../state/types";

/**
 * The Great Hall.
 * Loop: examine the torch sconce for a clue -> solve the stone dial using
 * the clue -> collect the iron key -> use it on the heavy door to travel
 * into the Armory.
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
      icon: "torch",
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
      icon: "dial",
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
      icon: "door",
      interaction: {
        type: "unlock",
        requiresItem: "iron-key",
        successText: "The iron key turns with a heavy clunk. The door swings open onto the Armory.",
        setsFlag: "great-hall-complete",
        failText: "It's locked. You'll need something to open it.",
        travelTo: "armory",
      },
    },
  ],
};

/**
 * The Armory.
 * Loop: examine the weapon rack for a clue -> solve the shield mount using
 * the clue -> collect the brass medallion. The passage back to the Great
 * Hall is always open.
 */
export const armory: RoomDef = {
  id: "armory",
  name: "The Armory",
  backgroundColor: 0x14201c,
  accentColor: 0x2f4a3f,
  hotspots: [
    {
      id: "back-passage",
      label: "Passage Back",
      x: 0.06,
      y: 0.2,
      width: 0.16,
      height: 0.55,
      icon: "door",
      interaction: { type: "travel", toRoom: "great-hall" },
    },
    {
      id: "weapon-rack",
      label: "Weapon Rack",
      x: 0.4,
      y: 0.32,
      width: 0.2,
      height: 0.32,
      icon: "generic",
      interaction: {
        type: "examine",
        text: 'Beneath a crossed pair of swords, a maker\'s mark reads: "The mount answers to the Eye, then the Wave."',
        setsFlag: "armory-clue-found",
      },
    },
    {
      id: "shield-mount",
      label: "Shield Mount",
      x: 0.7,
      y: 0.34,
      width: 0.2,
      height: 0.3,
      icon: "dial",
      interaction: {
        type: "puzzle",
        puzzleId: "armory-dial",
      },
    },
  ],
};

export const castleRooms: Record<string, RoomDef> = {
  [greatHall.id]: greatHall,
  [armory.id]: armory,
};

export const CASTLE_START_ROOM = greatHall.id;
