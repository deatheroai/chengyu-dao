import type { DialPuzzleConfig } from "../state/types";

export const greatHallDial: DialPuzzleConfig = {
  id: "great-hall-dial",
  title: "Stone Dial",
  instructions: "Set the three rings to match the clue you found in the room.",
  symbols: ["☀ Sun", "🌙 Moon", "★ Star", "👁 Eye", "🌊 Wave"],
  answer: ["☀ Sun", "🌙 Moon", "★ Star"],
  reward: { item: "iron-key", setsFlag: "dial-solved" },
  successText: "The rings click into place. A small compartment opens, revealing an iron key.",
};

export const armoryDial: DialPuzzleConfig = {
  id: "armory-dial",
  title: "Shield Mount",
  instructions: "Set the two rings to match the clue you found in the room.",
  symbols: ["☀ Sun", "🌙 Moon", "★ Star", "👁 Eye", "🌊 Wave"],
  answer: ["👁 Eye", "🌊 Wave"],
  reward: { item: "brass-medallion", setsFlag: "armory-dial-solved" },
  successText: "The mount releases, and a brass medallion drops into your hand.",
};

export const puzzles: Record<string, DialPuzzleConfig> = {
  [greatHallDial.id]: greatHallDial,
  [armoryDial.id]: armoryDial,
};
