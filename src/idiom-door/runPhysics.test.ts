import { describe, it, expect } from "vitest";
import { stepRun, type RunState, type RunConfig } from "./runPhysics";

const CFG: RunConfig = { runSpeed: 200, gravity: 1400, jumpVelocity: -700, groundY: 500 };

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
