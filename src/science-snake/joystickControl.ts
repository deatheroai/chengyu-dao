import type { Direction } from "./snakeGrid";
import { joystickDirection, clampKnobOffset } from "./joystick";

/** Dead zone as a share of the disc's radius — roughly the knob itself. */
const DEAD_ZONE_RATIO = 0.3;

/**
 * Wires the joystick disc (science-snake.html's #joystick). Touching
 * anywhere on it counts: the knob jumps to the finger and follows it as
 * it slides, and the snake turns the moment the finger is outside the
 * middle — so a slide and a plain tap on one side both work. Only a
 * *change* of direction is sent during one touch, so holding a thumb
 * still doesn't spam requests. Letting go springs the knob back.
 *
 * Uses pointer events with pointer capture (not click), so a slide that
 * wanders off the disc keeps steering, and it responds the instant a
 * finger lands — same reasoning the old D-pad's pointerdown had.
 */
export function wireJoystick(base: HTMLElement, knob: HTMLElement, onDirection: (direction: Direction) => void): void {
  let activePointer: number | null = null;
  let lastSent: Direction | null = null;

  const update = (event: PointerEvent): void => {
    const rect = base.getBoundingClientRect();
    const radius = rect.width / 2;
    const dx = event.clientX - (rect.left + radius);
    const dy = event.clientY - (rect.top + rect.height / 2);
    const knobOffset = clampKnobOffset(dx, dy, radius - knob.offsetWidth / 2);
    knob.style.transform = `translate(${knobOffset.x}px, ${knobOffset.y}px)`;
    const direction = joystickDirection(dx, dy, radius * DEAD_ZONE_RATIO);
    if (direction && direction !== lastSent) {
      lastSent = direction;
      onDirection(direction);
    }
  };

  const release = (event: PointerEvent): void => {
    if (event.pointerId !== activePointer) return;
    activePointer = null;
    lastSent = null;
    base.classList.remove("active");
    knob.style.transform = "";
  };

  base.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    activePointer = event.pointerId;
    lastSent = null;
    base.classList.add("active");
    try {
      base.setPointerCapture(event.pointerId);
    } catch {
      // A synthetic event (e.g. from a test) has no real pointer to
      // capture — steering from this one event still works.
    }
    update(event);
  });
  base.addEventListener("pointermove", (event) => {
    if (event.pointerId === activePointer) update(event);
  });
  base.addEventListener("pointerup", release);
  base.addEventListener("pointercancel", release);
}
