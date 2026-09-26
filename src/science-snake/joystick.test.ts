import { describe, it, expect } from "vitest";
import { joystickDirection, clampKnobOffset } from "./joystick";

describe("joystickDirection", () => {
  it("is null inside the dead zone, so a resting thumb does nothing", () => {
    expect(joystickDirection(0, 0, 10)).toBeNull();
    expect(joystickDirection(6, -6, 10)).toBeNull();
  });

  it("picks each of the four directions (screen y grows downward)", () => {
    expect(joystickDirection(0, -40, 10)).toBe("up");
    expect(joystickDirection(0, 40, 10)).toBe("down");
    expect(joystickDirection(-40, 0, 10)).toBe("left");
    expect(joystickDirection(40, 0, 10)).toBe("right");
  });

  it("goes by whichever axis the finger is further along, so every point outside the dead zone maps to one direction", () => {
    expect(joystickDirection(30, -20, 10)).toBe("right");
    expect(joystickDirection(-20, 30, 10)).toBe("down");
  });
});

describe("clampKnobOffset", () => {
  it("follows the finger inside the disc", () => {
    expect(clampKnobOffset(10, -5, 40)).toEqual({ x: 10, y: -5 });
  });

  it("stops at the disc's edge, keeping the finger's direction", () => {
    expect(clampKnobOffset(0, -100, 40)).toEqual({ x: 0, y: -40 });
    const { x, y } = clampKnobOffset(30, 40, 25);
    expect(Math.hypot(x, y)).toBeCloseTo(25);
    expect(y / x).toBeCloseTo(40 / 30);
  });
});
