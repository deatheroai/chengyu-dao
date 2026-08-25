import { describe, it, expect } from "vitest";
import { stepPhysics, type PhysicsState, type Surface, type PhysicsConfig } from "./platformPhysics";

const GROUND: Surface = { xMin: 0, xMax: 1000, y: 500 };
const PLATFORM: Surface = { xMin: 200, xMax: 300, y: 400 };
const SURFACES = [GROUND, PLATFORM];

const CFG: PhysicsConfig = { gravity: 900, moveSpeed: 150, jumpVelocity: -400, minX: 0, maxX: 1000 };

function state(overrides: Partial<PhysicsState> = {}): PhysicsState {
  return { x: 50, y: 500, vy: 0, grounded: true, ...overrides };
}

describe("stepPhysics", () => {
  it("stays put and grounded when idle on the ground", () => {
    const next = stepPhysics(state(), { moveDir: 0, jumpPressed: false }, SURFACES, 1 / 60, CFG);
    expect(next).toEqual({ x: 50, y: 500, vy: 0, grounded: true });
  });

  it("moves horizontally at moveSpeed while grounded", () => {
    const next = stepPhysics(state(), { moveDir: 1, jumpPressed: false }, SURFACES, 1, CFG);
    expect(next.x).toBeCloseTo(200);
    expect(next.grounded).toBe(true);
    expect(next.vy).toBe(0);
  });

  it("clamps horizontal movement to [minX, maxX]", () => {
    const next = stepPhysics(state({ x: 990 }), { moveDir: 1, jumpPressed: false }, SURFACES, 1, CFG);
    expect(next.x).toBe(1000);
  });

  it("launches upward and becomes airborne on jump", () => {
    const next = stepPhysics(state(), { moveDir: 0, jumpPressed: true }, SURFACES, 1 / 60, CFG);
    expect(next.grounded).toBe(false);
    expect(next.vy).toBeLessThan(0);
    expect(next.y).toBeLessThan(500);
  });

  it("ignores a jump press while already airborne", () => {
    const airborne = state({ grounded: false, vy: -200, y: 480 });
    const next = stepPhysics(airborne, { moveDir: 0, jumpPressed: true }, SURFACES, 1 / 60, CFG);
    // Gravity still applies — jumpPressed only launches from grounded.
    expect(next.vy).toBeGreaterThan(-200);
  });

  it("gravity accumulates while airborne", () => {
    let s = state({ grounded: false, vy: -400, y: 300 });
    s = stepPhysics(s, { moveDir: 0, jumpPressed: false }, SURFACES, 1 / 60, CFG);
    const vyAfterOneStep = s.vy;
    s = stepPhysics(s, { moveDir: 0, jumpPressed: false }, SURFACES, 1 / 60, CFG);
    expect(s.vy).toBeGreaterThan(vyAfterOneStep);
  });

  it("lands on the ground after falling through it", () => {
    // Falling fast enough that a naive point-in-band check could skip
    // clean over the surface in one step; the swept check must still
    // catch it.
    const falling = state({ y: 490, vy: 800, grounded: false });
    const next = stepPhysics(falling, { moveDir: 0, jumpPressed: false }, SURFACES, 1 / 10, CFG);
    expect(next.grounded).toBe(true);
    expect(next.y).toBe(500);
    expect(next.vy).toBe(0);
  });

  it("lands on a platform when falling within its x-span", () => {
    const falling = state({ x: 250, y: 390, vy: 300, grounded: false });
    const next = stepPhysics(falling, { moveDir: 0, jumpPressed: false }, SURFACES, 1 / 20, CFG);
    expect(next.grounded).toBe(true);
    expect(next.y).toBe(400);
  });

  it("falls off a platform's edge when walking past its x-span", () => {
    const onPlatform = state({ x: 295, y: 400, vy: 0, grounded: true });
    const next = stepPhysics(onPlatform, { moveDir: 1, jumpPressed: false }, SURFACES, 1 / 10, CFG);
    expect(next.x).toBeGreaterThan(300);
    expect(next.grounded).toBe(false);
    expect(next.vy).toBeGreaterThan(0);
  });

  it("does not fall through the platform to the ground below in one step from resting on it", () => {
    const onPlatform = state({ x: 250, y: 400, vy: 0, grounded: true });
    const next = stepPhysics(onPlatform, { moveDir: 0, jumpPressed: false }, SURFACES, 1 / 10, CFG);
    expect(next).toEqual({ x: 250, y: 400, vy: 0, grounded: true });
  });
});
