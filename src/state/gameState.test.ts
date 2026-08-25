import { describe, it, expect, beforeEach, vi } from "vitest";

const cloudMocks = vi.hoisted(() => ({
  isCloudSaveAvailable: vi.fn(() => false),
  loadCloudState: vi.fn(),
  saveCloudState: vi.fn(),
}));
vi.mock("../firebase/save", () => cloudMocks);

import { initGameState } from "./gameState";
import { createInitialState } from "./types";

const STORAGE_KEY = "castle-puzzle-save";

beforeEach(() => {
  localStorage.clear();
  cloudMocks.isCloudSaveAvailable.mockReturnValue(false);
  cloudMocks.loadCloudState.mockReset();
  cloudMocks.saveCloudState.mockReset();
});

describe("initGameState", () => {
  it("creates a fresh state when nothing is saved", async () => {
    const store = await initGameState("castle", "great-hall");
    expect(store.get()).toMatchObject({
      environment: "castle",
      currentRoom: "great-hall",
      inventory: [],
      flags: {},
    });
  });

  it("loads existing state from localStorage when present", async () => {
    const existing = createInitialState("castle", "great-hall");
    existing.inventory.push("iron-key");
    existing.flags["dial-solved"] = true;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));

    const store = await initGameState("castle", "great-hall");
    expect(store.get().inventory).toEqual(["iron-key"]);
    expect(store.hasFlag("dial-solved")).toBe(true);
  });

  it("persists updates to localStorage", async () => {
    const store = await initGameState("castle", "great-hall");
    store.update((state) => {
      state.inventory.push("iron-key");
    });

    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    expect(saved.inventory).toEqual(["iron-key"]);
  });

  it("notifies subscribers on update", async () => {
    const store = await initGameState("castle", "great-hall");
    const listener = vi.fn();
    store.subscribe(listener);

    store.update((state) => {
      state.flags["clue-found"] = true;
    });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].flags["clue-found"]).toBe(true);
  });

  it("stops notifying a listener after it unsubscribes", async () => {
    const store = await initGameState("castle", "great-hall");
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    unsubscribe();

    store.update((state) => {
      state.flags["clue-found"] = true;
    });

    expect(listener).not.toHaveBeenCalled();
  });

  it("prefers cloud state over localStorage when cloud save is available", async () => {
    cloudMocks.isCloudSaveAvailable.mockReturnValue(true);
    const cloudState = createInitialState("castle", "great-hall");
    cloudState.inventory.push("cloud-item");
    cloudMocks.loadCloudState.mockResolvedValue(cloudState);

    const localState = createInitialState("castle", "great-hall");
    localState.inventory.push("local-item");
    localStorage.setItem(STORAGE_KEY, JSON.stringify(localState));

    const store = await initGameState("castle", "great-hall");
    expect(store.get().inventory).toEqual(["cloud-item"]);
  });

  it("falls back to localStorage when cloud save is available but has no saved state", async () => {
    cloudMocks.isCloudSaveAvailable.mockReturnValue(true);
    cloudMocks.loadCloudState.mockResolvedValue(null);

    const localState = createInitialState("castle", "great-hall");
    localState.inventory.push("local-item");
    localStorage.setItem(STORAGE_KEY, JSON.stringify(localState));

    const store = await initGameState("castle", "great-hall");
    expect(store.get().inventory).toEqual(["local-item"]);
  });

  it("writes through to cloud save on update when cloud save is available", async () => {
    cloudMocks.isCloudSaveAvailable.mockReturnValue(true);
    cloudMocks.loadCloudState.mockResolvedValue(null);

    const store = await initGameState("castle", "great-hall");
    store.update((state) => {
      state.inventory.push("iron-key");
    });

    expect(cloudMocks.saveCloudState).toHaveBeenCalledTimes(1);
    expect(cloudMocks.saveCloudState.mock.calls[0][0].inventory).toEqual(["iron-key"]);
  });

  it("does not call cloud save when cloud save is unavailable", async () => {
    const store = await initGameState("castle", "great-hall");
    store.update((state) => {
      state.inventory.push("iron-key");
    });

    expect(cloudMocks.saveCloudState).not.toHaveBeenCalled();
  });
});
