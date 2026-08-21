import type { CatchItemDef, IconKind } from "../catch-meaning/catchItems";

export type SurfaceKind = "ground" | "platformA" | "platformB";

export interface PlacedItem extends CatchItemDef {
  /** Horizontal position as a fraction of scene width (0-1). */
  xFrac: number;
  surface: SurfaceKind;
}

/**
 * Phase 2 fixed layout for the same Phase 0 spike idiom (一心一意) —
 * see CATCH_MECHANIC_PLAN.md's Phase 2 section. A deliberate mix of
 * ground-level (just walk to it) and platform (needs a jump) placements
 * so both movement and jumping actually get used, not just one.
 */
// The player spawns at PLAYER_START_XFRAC (see PlatformCatchScene) —
// every ground item needs enough clearance from that spawn point that
// the child doesn't materialize already overlapping (and instantly
// "catching") something before ever pressing a control. Found the hard
// way: with an earlier layout, "phone" sat close enough to spawn that
// the status chip showed a decoy catch before any input at all.
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
