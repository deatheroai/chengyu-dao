import { describe, it, expect } from "vitest";
import { stepFlight, type FlightState, type FlightConfig, type FlightInput } from "./balloonPhysics";

const cfg: FlightConfig = {
  accel: 800,
  maxSpeed: 200,
  drag: 2,
  bounds: { minX: 0, maxX: 900, minY: 0, maxY: 500 },
};

const noInput: FlightInput = { left: false, right: false, up: false, down: false };
const start: FlightState = { x: 400, y: 250, vx: 0, vy: 0 };

describe("stepFlight", () => {
  it("stays put with no input and no existing velocity", () => {
    const next = stepFlight(start, noInput, 1 / 60, cfg);
    expect(next.x).toBe(start.x);
    expect(next.y).toBe(start.y);
    expect(next.vx).toBe(0);
    expect(next.vy).toBe(0);
  });

  it("accelerates in the pressed direction", () => {
    const next = stepFlight(start, { ...noInput, right: true }, 1 / 60, cfg);
    expect(next.vx).toBeGreaterThan(0);
    expect(next.x).toBeGreaterThan(start.x);
  });

  it("opposite-direction inputs cancel out", () => {
    const next = stepFlight(start, { ...noInput, left: true, right: true }, 1 / 60, cfg);
    expect(next.vx).toBe(0);
  });

  it("never exceeds maxSpeed even after sustained acceleration", () => {
    let state = start;
    for (let i = 0; i < 300; i++) {
      state = stepFlight(state, { ...noInput, right: true, down: true }, 1 / 60, cfg);
    }
    const speed = Math.hypot(state.vx, state.vy);
    expect(speed).toBeLessThanOrEqual(cfg.maxSpeed + 1e-6);
  });

  it("decays velocity toward zero once input stops (drag)", () => {
    let state = stepFlight(start, { ...noInput, right: true }, 1 / 60, cfg);
    const movingSpeed = Math.hypot(state.vx, state.vy);
    expect(movingSpeed).toBeGreaterThan(0);
    for (let i = 0; i < 120; i++) {
      state = stepFlight(state, noInput, 1 / 60, cfg);
    }
    // 2 simulated seconds at drag=2/s is several e-foldings of decay —
    // not exactly zero (drag never fully reaches it, asymptotically),
    // but well under 5% of where it started.
    expect(Math.hypot(state.vx, state.vy)).toBeLessThan(movingSpeed * 0.05);
  });

  it("clamps position at the bounds and zeroes the offending velocity component", () => {
    const atLeftWall: FlightState = { x: 2, y: 250, vx: -500, vy: 0 };
    const next = stepFlight(atLeftWall, noInput, 1 / 60, cfg);
    expect(next.x).toBe(cfg.bounds.minX);
    expect(next.vx).toBe(0);
  });

  it("clamps at every edge (right, top, bottom), not just the left", () => {
    const right = stepFlight({ x: cfg.bounds.maxX - 1, y: 250, vx: 500, vy: 0 }, noInput, 1 / 60, cfg);
    expect(right.x).toBe(cfg.bounds.maxX);
    expect(right.vx).toBe(0);

    const top = stepFlight({ x: 400, y: 1, vy: -500, vx: 0 }, noInput, 1 / 60, cfg);
    expect(top.y).toBe(cfg.bounds.minY);
    expect(top.vy).toBe(0);

    const bottom = stepFlight({ x: 400, y: cfg.bounds.maxY - 1, vy: 500, vx: 0 }, noInput, 1 / 60, cfg);
    expect(bottom.y).toBe(cfg.bounds.maxY);
    expect(bottom.vy).toBe(0);
  });

  it("is deterministic: same state/input/dt/config always produces the same result", () => {
    const a = stepFlight(start, { ...noInput, up: true, left: true }, 1 / 60, cfg);
    const b = stepFlight(start, { ...noInput, up: true, left: true }, 1 / 60, cfg);
    expect(a).toEqual(b);
  });
});
