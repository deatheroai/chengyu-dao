import type { CatchItemDef, IconKind } from "../catch-meaning/catchItems";

export type SurfaceKind = "ground" | "platformA" | "platformB";

export interface PlacedItem extends CatchItemDef {
  /** Horizontal position as a fraction of the *world* width (0-1) —
   * not the viewport, which is narrower; the camera scrolls to follow
   * the character across a wider playable area (see
   * WORLD_WIDTH_MULTIPLIER in PlatformCatchScene). */
  xFrac: number;
  surface: SurfaceKind;
}

/**
 * Phase 2 fixed layout for the same Phase 0 spike idiom (一心一意) —
 * see CATCH_MECHANIC_PLAN.md's Phase 2 section. A deliberate mix of
 * ground-level (just walk to it) and platform (needs a jump) placements
 * so both movement and jumping actually get used, not just one. Catching
 * is a deliberate GRAB action near an item now, not automatic on
 * contact, so the xFrac gaps below matter less for accidental-overlap
 * risk than they used to — they're sized for a wider world giving each
 * item some visual breathing room, not for keeping catch zones apart.
 */
// The player spawns at PLAYER_START_XFRAC (see PlatformCatchScene) —
// kept clear of "phone" mainly so a first-time player doesn't find
// themselves standing on top of something before getting their bearings.
export const placedItems: PlacedItem[] = [
  { id: "phone", kind: "decoy", icon: "phone", xFrac: 0.2, surface: "ground" },
  { id: "book", kind: "correct", icon: "book", xFrac: 0.32, surface: "ground" },
  { id: "tv", kind: "decoy", icon: "tv", xFrac: 0.42, surface: "ground" },
  { id: "pencil", kind: "correct", icon: "pencil", xFrac: 0.5, surface: "platformA" },
  { id: "toy", kind: "decoy", icon: "toy", xFrac: 0.6, surface: "ground" },
  { id: "clock", kind: "correct", icon: "clock", xFrac: 0.78, surface: "platformB" },
  { id: "star", kind: "correct", icon: "star", xFrac: 0.93, surface: "ground" },
];

export type { IconKind };
