import { describe, it, expect, beforeEach, vi } from "vitest";

const puzzleMocks = vi.hoisted(() => ({
  openDialPuzzle: vi.fn(),
}));
vi.mock("../ui/puzzleOverlay", () => puzzleMocks);

const cloudMocks = vi.hoisted(() => ({
  isCloudSaveAvailable: vi.fn(() => false),
  loadCloudState: vi.fn(),
  saveCloudState: vi.fn(),
}));
vi.mock("../firebase/save", () => cloudMocks);

import { initGameState } from "./gameState";
import { handleHotspotTap } from "./interactions";
import type { Hotspot, DialPuzzleConfig } from "./types";

let onTravel: (roomId: string) => void;

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = `
    <div id="inventory-bar"></div>
    <div id="clue-text"></div>
  `;
  puzzleMocks.openDialPuzzle.mockReset();
  onTravel = vi.fn<(roomId: string) => void>();
});

function baseHotspot(overrides: Partial<Hotspot> & Pick<Hotspot, "interaction">): Hotspot {
  return { id: "spot", label: "Spot", x: 0, y: 0, width: 0.1, height: 0.1, ...overrides };
}

describe("handleHotspotTap: examine", () => {
  it("shows the clue text and sets the flag when configured", async () => {
    const store = await initGameState("castle", "great-hall");
    const onRoomChanged = vi.fn();
    const hotspot = baseHotspot({
      interaction: { type: "examine", text: "A clue.", setsFlag: "clue-found" },
    });

    handleHotspotTap(hotspot, store, {}, onRoomChanged, onTravel);

    expect(document.getElementById("clue-text")?.textContent).toBe("A clue.");
    expect(store.hasFlag("clue-found")).toBe(true);
    expect(onRoomChanged).toHaveBeenCalledTimes(1);
    expect(onTravel).not.toHaveBeenCalled();
  });

  it("shows text but does not trigger a room refresh when no flag is configured", async () => {
    const store = await initGameState("castle", "great-hall");
    const onRoomChanged = vi.fn();
    const hotspot = baseHotspot({ interaction: { type: "examine", text: "Just flavor text." } });

    handleHotspotTap(hotspot, store, {}, onRoomChanged, onTravel);

    expect(document.getElementById("clue-text")?.textContent).toBe("Just flavor text.");
    expect(onRoomChanged).not.toHaveBeenCalled();
  });
});

describe("handleHotspotTap: puzzle", () => {
  const config: DialPuzzleConfig = {
    id: "test-dial",
    title: "t",
    instructions: "i",
    symbols: ["a"],
    answer: ["a"],
    reward: { item: "iron-key", setsFlag: "dial-solved" },
    successText: "Solved!",
  };

  it("awards the item, sets the flag, and refreshes the room when solved", async () => {
    const store = await initGameState("castle", "great-hall");
    const onRoomChanged = vi.fn();
    puzzleMocks.openDialPuzzle.mockImplementation((_cfg: unknown, onSolved: () => void) => onSolved());

    handleHotspotTap(
      baseHotspot({ interaction: { type: "puzzle", puzzleId: "test-dial" } }),
      store,
      { "test-dial": config },
      onRoomChanged,
      onTravel,
    );

    expect(store.get().inventory).toContain("iron-key");
    expect(store.hasFlag("dial-solved")).toBe(true);
    expect(document.getElementById("clue-text")?.textContent).toBe("Solved!");
    expect(onRoomChanged).toHaveBeenCalledTimes(1);
    expect(onTravel).not.toHaveBeenCalled();
  });

  it("does nothing if the referenced puzzle id is unknown", async () => {
    const store = await initGameState("castle", "great-hall");
    const onRoomChanged = vi.fn();

    handleHotspotTap(baseHotspot({ interaction: { type: "puzzle", puzzleId: "missing" } }), store, {}, onRoomChanged, onTravel);

    expect(puzzleMocks.openDialPuzzle).not.toHaveBeenCalled();
    expect(onRoomChanged).not.toHaveBeenCalled();
    expect(store.get().inventory).toEqual([]);
  });

  it("does not award anything if the puzzle overlay is closed without solving", async () => {
    const store = await initGameState("castle", "great-hall");
    const onRoomChanged = vi.fn();
    puzzleMocks.openDialPuzzle.mockImplementation(() => {
      /* user closes without solving: onSolved is never called */
    });

    handleHotspotTap(
      baseHotspot({ interaction: { type: "puzzle", puzzleId: "test-dial" } }),
      store,
      { "test-dial": config },
      onRoomChanged,
      onTravel,
    );

    expect(store.get().inventory).toEqual([]);
    expect(onRoomChanged).not.toHaveBeenCalled();
  });
});

describe("handleHotspotTap: unlock", () => {
  const interaction = {
    type: "unlock" as const,
    requiresItem: "iron-key",
    successText: "Unlocked!",
    setsFlag: "door-open",
    failText: "Locked.",
  };

  it("succeeds and sets the flag when the required item is held", async () => {
    const store = await initGameState("castle", "great-hall");
    store.update((s) => {
      s.inventory.push("iron-key");
    });
    const onRoomChanged = vi.fn();

    handleHotspotTap(baseHotspot({ interaction }), store, {}, onRoomChanged, onTravel);

    expect(document.getElementById("clue-text")?.textContent).toBe("Unlocked!");
    expect(store.hasFlag("door-open")).toBe(true);
    expect(onRoomChanged).toHaveBeenCalledTimes(1);
    expect(onTravel).not.toHaveBeenCalled();
  });

  it("fails without changing state when the required item is missing", async () => {
    const store = await initGameState("castle", "great-hall");
    const onRoomChanged = vi.fn();

    handleHotspotTap(baseHotspot({ interaction }), store, {}, onRoomChanged, onTravel);

    expect(document.getElementById("clue-text")?.textContent).toBe("Locked.");
    expect(store.hasFlag("door-open")).toBe(false);
    expect(onRoomChanged).not.toHaveBeenCalled();
    expect(onTravel).not.toHaveBeenCalled();
  });

  it("travels instead of refreshing in-place when travelTo is set and the item is held", async () => {
    const store = await initGameState("castle", "great-hall");
    store.update((s) => {
      s.inventory.push("iron-key");
    });
    const onRoomChanged = vi.fn();
    const travelInteraction = { ...interaction, travelTo: "armory" };

    handleHotspotTap(baseHotspot({ interaction: travelInteraction }), store, {}, onRoomChanged, onTravel);

    expect(store.hasFlag("door-open")).toBe(true);
    expect(onTravel).toHaveBeenCalledWith("armory");
    expect(onRoomChanged).not.toHaveBeenCalled();
  });

  it("does not travel when the required item is missing, even with travelTo set", async () => {
    const store = await initGameState("castle", "great-hall");
    const onRoomChanged = vi.fn();
    const travelInteraction = { ...interaction, travelTo: "armory" };

    handleHotspotTap(baseHotspot({ interaction: travelInteraction }), store, {}, onRoomChanged, onTravel);

    expect(onTravel).not.toHaveBeenCalled();
    expect(onRoomChanged).not.toHaveBeenCalled();
  });
});

describe("handleHotspotTap: travel", () => {
  it("calls onTravel with the target room and does not touch state", async () => {
    const store = await initGameState("castle", "great-hall");
    const onRoomChanged = vi.fn();

    handleHotspotTap(baseHotspot({ interaction: { type: "travel", toRoom: "great-hall" } }), store, {}, onRoomChanged, onTravel);

    expect(onTravel).toHaveBeenCalledWith("great-hall");
    expect(onTravel).toHaveBeenCalledTimes(1);
    expect(onRoomChanged).not.toHaveBeenCalled();
    expect(store.get().flags).toEqual({});
  });
});
