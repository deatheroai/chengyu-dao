export type AttemptStatus = "choosing" | "correct" | "wrong-try-again" | "revealed";

export interface AttemptState {
  attempts: number;
  status: AttemptStatus;
}

export const DEFAULT_MAX_ATTEMPTS = 2;

/**
 * Pure state transition for the application-check retry flow. Per
 * SNIPPET_PLANS.md: "no punishing wrong-answer state" — a wrong pick
 * just invites another look, and after `maxAttempts` wrong picks the
 * answer is revealed with an explanation rather than leaving the child
 * stuck guessing indefinitely. There is no "you failed" state.
 */
export function evaluateAttempt(
  selectedIsCorrect: boolean,
  priorAttempts: number,
  maxAttempts: number = DEFAULT_MAX_ATTEMPTS,
): AttemptState {
  const attempts = priorAttempts + 1;

  if (selectedIsCorrect) {
    return { attempts, status: "correct" };
  }
  if (attempts >= maxAttempts) {
    return { attempts, status: "revealed" };
  }
  return { attempts, status: "wrong-try-again" };
}
