export interface BalloonCatchState {
  resolved: boolean;
}

export function initialBalloonCatchState(): BalloonCatchState {
  return { resolved: false };
}

export type BalloonCatchOutcome = "correct" | "wrong" | "already-resolved";

export interface BalloonCatchResult {
  state: BalloonCatchState;
  outcome: BalloonCatchOutcome;
}

/**
 * Pure catch transition for the balloon-sentence stage: unlike the door
 * puzzle's ordered, multi-step progress, there's exactly one thing to
 * find here (the balloon showing the idiom used correctly), so the
 * state is just "resolved or not." Catching a wrong (decoy) balloon is
 * a gentle no-op — same no-fail-state ethos as everywhere else in this
 * project — the child can just keep flying around and try another.
 */
export function attemptBalloonCatch(state: BalloonCatchState, isCorrect: boolean): BalloonCatchResult {
  if (state.resolved) {
    return { state, outcome: "already-resolved" };
  }
  if (isCorrect) {
    return { state: { resolved: true }, outcome: "correct" };
  }
  return { state, outcome: "wrong" };
}
