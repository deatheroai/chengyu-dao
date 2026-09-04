import { describe, it, expect } from "vitest";
import { stepRun, type RunState, type RunConfig } from "./runPhysics";

// fallGravityMultiplier: 1 (symmetric) here deliberately — these tests
// exercise stepRun's generic run/jump mechanics, not the fall-vs-rise
// asymmetry itself (see the dedicated "asymmetric fall gravity"
// describe block below for that).
const CFG: RunConfig = { runSpeed: 200, gravity: 1400, jumpVelocity: -700, groundY: 500, fallGravityMultiplier: 1 };

function state(overrides: Partial<RunState> = {}): RunState {
  return { x: 0, y: 500, vy: 0, grounded: true, ...overrides };
}

describe("stepRun", () => {
  it("always moves forward at runSpeed, whether grounded or airborne", () => {
    const grounded = stepRun(state(), false, 1, CFG);
    expect(grounded.x).toBe(200);

    const airborne = stepRun(state({ grounded: false, vy: -300, y: 400 }), false, 1, CFG);
    expect(airborne.x).toBe(200);
  });

  it("stays grounded and at rest when idle", () => {
    const next = stepRun(state(), false, 1 / 60, CFG);
    expect(next.grounded).toBe(true);
    expect(next.y).toBe(500);
    expect(next.vy).toBe(0);
  });

  it("launches upward and becomes airborne on jump", () => {
    const next = stepRun(state(), true, 1 / 60, CFG);
    expect(next.grounded).toBe(false);
    expect(next.vy).toBeLessThan(0);
    expect(next.y).toBeLessThan(500);
  });

  it("ignores a jump press while already airborne (no double jump)", () => {
    const airborne = state({ grounded: false, vy: -200, y: 480 });
    const next = stepRun(airborne, true, 1 / 60, CFG);
    // Gravity still applies — jumpPressed only launches from grounded.
    expect(next.vy).toBeGreaterThan(-200);
  });

  it("gravity accumulates while airborne", () => {
    let s = state({ grounded: false, vy: -400, y: 300 });
    s = stepRun(s, false, 1 / 60, CFG);
    const vyAfterOneStep = s.vy;
    s = stepRun(s, false, 1 / 60, CFG);
    expect(s.vy).toBeGreaterThan(vyAfterOneStep);
  });

  it("lands on the ground after falling through it in one big step", () => {
    const falling = state({ y: 490, vy: 800, grounded: false });
    const next = stepRun(falling, false, 1 / 10, CFG);
    expect(next.grounded).toBe(true);
    expect(next.y).toBe(500);
    expect(next.vy).toBe(0);
  });

  it("completes a full jump arc back to grounded", () => {
    let s = state();
    s = stepRun(s, true, 1 / 60, CFG);
    expect(s.grounded).toBe(false);
    // Run many small steps until it lands again.
    for (let i = 0; i < 120 && !s.grounded; i++) {
      s = stepRun(s, false, 1 / 60, CFG);
    }
    expect(s.grounded).toBe(true);
    expect(s.y).toBe(500);
  });
});

describe("stepRun with asymmetric fall gravity", () => {
  const FALL_CFG: RunConfig = { ...CFG, fallGravityMultiplier: 2 };

  function runFullJumpArc(jumpConfig: RunConfig): { riseSteps: number; fallSteps: number } {
    const dt = 1 / 240; // fine-grained, so step-count differences are meaningful
    let s = state();
    s = stepRun(s, true, dt, jumpConfig);
    let riseSteps = 1;
    while (s.vy < 0) {
      s = stepRun(s, false, dt, jumpConfig);
      riseSteps++;
    }
    let fallSteps = 0;
    while (!s.grounded) {
      s = stepRun(s, false, dt, jumpConfig);
      fallSteps++;
    }
    return { riseSteps, fallSteps };
  }

  it("still uses plain gravity on the way up (rise is unaffected)", () => {
    let symmetric = state({ grounded: false, vy: -400, y: 300 });
    let fast = state({ grounded: false, vy: -400, y: 300 });
    symmetric = stepRun(symmetric, false, 1 / 60, CFG);
    fast = stepRun(fast, false, 1 / 60, FALL_CFG);
    // Both rising (vy < 0 going in), so fallGravityMultiplier shouldn't
    // have applied to either — identical result regardless of the
    // multiplier's value.
    expect(fast.vy).toBe(symmetric.vy);
    expect(fast.y).toBe(symmetric.y);
  });

  it("applies the multiplier once falling (vy >= 0)", () => {
    let symmetric = state({ grounded: false, vy: 10, y: 300 });
    let fast = state({ grounded: false, vy: 10, y: 300 });
    symmetric = stepRun(symmetric, false, 1 / 60, CFG);
    fast = stepRun(fast, false, 1 / 60, FALL_CFG);
    // Same starting vy (>=0, already falling), but fast's gravity is
    // 2x — it should accelerate downward twice as much this step.
    const symmetricDelta = symmetric.vy - 10;
    const fastDelta = fast.vy - 10;
    expect(fastDelta).toBeCloseTo(2 * symmetricDelta, 5);
  });

  it("reaches the ground in fewer steps than it took to reach the apex, unlike the symmetric case", () => {
    const symmetric = runFullJumpArc(CFG);
    const fast = runFullJumpArc(FALL_CFG);
    // Symmetric gravity: a fall from the same height it launched from
    // takes about as long as the rise did (roughly equal step counts).
    expect(fast.fallSteps).toBeLessThan(symmetric.fallSteps);
    // The actual "lands vertical, not curved or slow" property: with
    // fallGravityMultiplier > 1, the fall is now measurably shorter
    // than the rise that preceded it — unlike the symmetric case, where
    // they're (roughly) equal.
    expect(fast.fallSteps).toBeLessThan(fast.riseSteps);
  });

  it("does not change how high the jump reaches (only how it comes down)", () => {
    let symmetric = state();
    let fast = state();
    symmetric = stepRun(symmetric, true, 1 / 240, CFG);
    fast = stepRun(fast, true, 1 / 240, FALL_CFG);
    let symmetricMinY = symmetric.y;
    let fastMinY = fast.y;
    for (let i = 0; i < 500 && !symmetric.grounded; i++) {
      symmetric = stepRun(symmetric, false, 1 / 240, CFG);
      symmetricMinY = Math.min(symmetricMinY, symmetric.y);
    }
    for (let i = 0; i < 500 && !fast.grounded; i++) {
      fast = stepRun(fast, false, 1 / 240, FALL_CFG);
      fastMinY = Math.min(fastMinY, fast.y);
    }
    expect(fastMinY).toBeCloseTo(symmetricMinY, 0);
  });
});
