import type { GameState } from "./types";
import { createInitialState } from "./types";
import { loadCloudState, saveCloudState, isCloudSaveAvailable } from "../firebase/save";

const STORAGE_KEY = "castle-puzzle-save";

type Listener = (state: GameState) => void;

class GameStateStore {
  private state: GameState;
  private listeners = new Set<Listener>();

  constructor(initial: GameState) {
    this.state = initial;
  }

  get(): GameState {
    return this.state;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  update(mutator: (state: GameState) => void): void {
    mutator(this.state);
    this.state.updatedAt = Date.now();
    this.listeners.forEach((listener) => listener(this.state));
    this.persist();
  }

  hasFlag(flag: string): boolean {
    return Boolean(this.state.flags[flag]);
  }

  hasItem(item: string): boolean {
    return this.state.inventory.includes(item);
  }

  private persist(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    if (isCloudSaveAvailable()) {
      void saveCloudState(this.state);
    }
  }
}

function loadLocalState(): GameState | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GameState;
  } catch {
    return null;
  }
}

export async function initGameState(environment: string, startRoom: string): Promise<GameStateStore> {
  let state: GameState | null = null;

  if (isCloudSaveAvailable()) {
    state = await loadCloudState();
  }
  if (!state) {
    state = loadLocalState();
  }
  if (!state) {
    state = createInitialState(environment, startRoom);
  }

  return new GameStateStore(state);
}

export type { GameStateStore };
