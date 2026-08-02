export interface GameState {
  environment: string;
  currentRoom: string;
  inventory: string[];
  flags: Record<string, boolean>;
  updatedAt: number;
}

export type HotspotInteraction =
  | { type: "examine"; text: string; setsFlag?: string }
  | { type: "puzzle"; puzzleId: string }
  | {
      type: "unlock";
      requiresItem: string;
      successText: string;
      setsFlag: string;
      failText: string;
    };

export interface Hotspot {
  id: string;
  label: string;
  /** Normalized position/size (0-1) so layout scales to any screen. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Hidden until this flag (if set) is true. */
  requiresFlag?: string;
  interaction: HotspotInteraction;
}

export interface RoomDef {
  id: string;
  name: string;
  backgroundColor: number;
  accentColor: number;
  hotspots: Hotspot[];
}

export interface DialPuzzleConfig {
  id: string;
  title: string;
  instructions: string;
  symbols: string[];
  answer: string[];
  reward: { item?: string; setsFlag: string };
  successText: string;
}

export function createInitialState(environment: string, startRoom: string): GameState {
  return {
    environment,
    currentRoom: startRoom,
    inventory: [],
    flags: {},
    updatedAt: Date.now(),
  };
}
