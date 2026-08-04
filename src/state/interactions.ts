import type { GameStateStore } from "./gameState";
import type { Hotspot } from "./types";
import type { DialPuzzleConfig } from "./types";
import { openDialPuzzle } from "../ui/puzzleOverlay";
import { showClueText, renderInventory } from "../ui/inventory";

export function handleHotspotTap(
  hotspot: Hotspot,
  store: GameStateStore,
  puzzles: Record<string, DialPuzzleConfig>,
  onRoomChanged: () => void,
  onTravel: (roomId: string) => void,
): void {
  const interaction = hotspot.interaction;

  if (interaction.type === "examine") {
    showClueText(interaction.text);
    if (interaction.setsFlag) {
      store.update((state) => {
        state.flags[interaction.setsFlag as string] = true;
      });
      onRoomChanged();
    }
    return;
  }

  if (interaction.type === "puzzle") {
    const config = puzzles[interaction.puzzleId];
    if (!config) return;
    openDialPuzzle(config, () => {
      store.update((state) => {
        if (config.reward.item) state.inventory.push(config.reward.item);
        state.flags[config.reward.setsFlag] = true;
      });
      renderInventory(store.get().inventory);
      showClueText(config.successText);
      onRoomChanged();
    });
    return;
  }

  if (interaction.type === "unlock") {
    if (store.hasItem(interaction.requiresItem)) {
      showClueText(interaction.successText);
      store.update((state) => {
        state.flags[interaction.setsFlag] = true;
      });
      if (interaction.travelTo) {
        onTravel(interaction.travelTo);
      } else {
        onRoomChanged();
      }
    } else {
      showClueText(interaction.failText);
    }
    return;
  }

  if (interaction.type === "travel") {
    onTravel(interaction.toRoom);
  }
}
