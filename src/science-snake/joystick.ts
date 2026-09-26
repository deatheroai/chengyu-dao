import type { Direction } from "./snakeGrid";

/**
 * Pure maths for the on-screen joystick (science-snake.html's
 * #joystick, wired in joystickControl.ts). Replaced a 4-button D-pad
 * per your "sometimes it is hard to aim on the buttons, I tapped on
 * empty space in between" (2026-09-26): the whole disc is one target,
 * split into four wedges by its diagonals, so there's no gap between
 * directions to miss.
 */

/**
 * The direction for a finger `dx`/`dy` pixels from the disc's centre,
 * by whichever axis it's further along (screen y grows downward), or
 * null inside the `deadZone` radius — resting a thumb on the knob in
 * the middle does nothing until it slides out.
 */
export function joystickDirection(dx: number, dy: number, deadZone: number): Direction | null {
  if (Math.hypot(dx, dy) < deadZone) return null;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? "right" : "left";
  return dy > 0 ? "down" : "up";
}

/** Where to draw the knob: following the finger, but kept inside the
 * disc (`maxDistance` from the centre). */
export function clampKnobOffset(dx: number, dy: number, maxDistance: number): { x: number; y: number } {
  const distance = Math.hypot(dx, dy);
  if (distance <= maxDistance) return { x: dx, y: dy };
  const scale = maxDistance / distance;
  return { x: dx * scale, y: dy * scale };
}
