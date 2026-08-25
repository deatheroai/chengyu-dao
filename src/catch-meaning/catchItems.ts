/**
 * Phase 0 feasibility-spike content (CATCH_MECHANIC_PLAN.md): a single
 * idiom's catch-icon set, hand-designed rather than research-agent
 * sourced — icon selection is a visual/content-accuracy judgment call,
 * the exact kind of thing Phase 0 exists to get your review on before
 * doing this for all 15 idioms in Phase 1.
 *
 * 一心一意 already has approved content built around one concrete
 * scenario (doing homework with the TV on and toys nearby) that splits
 * cleanly into on-theme "focus" imagery and off-theme "distraction"
 * imagery naming the idiom's own dailyLifeScenario — see idioms.ts.
 */

export type IconKind = "book" | "pencil" | "clock" | "star" | "tv" | "toy" | "phone";

export interface CatchItemDef {
  id: string;
  kind: "correct" | "decoy";
  icon: IconKind;
}

/** Correct (on-theme) and decoy (off-theme) icons for the Phase 0 spike
 * idiom. Kept separate from IdiomContent for now — this is prototype
 * data, not yet part of the shared content model. */
export const SPIKE_IDIOM_ID = "yi-xin-yi-yi";

// Interleaved correct/decoy so a mix of both is on screen from the very
// start (rather than all decoys trailing in after every correct item),
// both for the intended "several pieces mixed together" feel and so
// early falls aren't dominated by one kind — see CatchScene's staggered
// spawn offsets, which key off array index.
export const catchItemDefs: CatchItemDef[] = [
  { id: "book", kind: "correct", icon: "book" },
  { id: "tv", kind: "decoy", icon: "tv" },
  { id: "pencil", kind: "correct", icon: "pencil" },
  { id: "toy", kind: "decoy", icon: "toy" },
  { id: "clock", kind: "correct", icon: "clock" },
  { id: "phone", kind: "decoy", icon: "phone" },
  { id: "star", kind: "correct", icon: "star" },
];
