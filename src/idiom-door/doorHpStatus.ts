import { isHpLow } from "./doorHp";

/**
 * Mirrors the door stage's HP (doorHp.ts) into a DOM live region — same
 * small "one attribute + one line of text" pattern as
 * balloonHpStatus.ts/doorStatus.ts, kept as its own module for the same
 * reason those stayed separate: genuinely separate state a test or
 * future stage might want to read independently of catch progress.
 *
 * 2026-09-09: also mirrors `doorHp.ts`'s `isHpLow` as a `data-low`
 * attribute — style.css's `#door-hp[data-low="true"]` gives the counter
 * an urgent pulsing/red treatment, and swaps in a ⚠️ so the warning
 * doesn't rely on color alone. Computed here (from `hp` alone) rather
 * than threaded through every call site, so IdiomDoorScene's existing
 * `updateDoorHpStatus(this.hpState.hp)` calls don't need to change.
 *
 * 2026-09-11 ("low hp needs to be more obvious, it is now a tiny icon
 * on screen"): the same `low` value also drives `#low-hp-vignette`'s
 * `data-visible` — a full-viewport pulsing edge glow (style.css), so
 * the warning doesn't live only in a small corner chip a child's eyes
 * may not be on mid-jump.
 */
export function updateDoorHpStatus(hp: number): void {
  const el = document.getElementById("door-hp");
  if (!el) return;

  const low = isHpLow({ hp });
  el.setAttribute("data-hp", String(hp));
  el.setAttribute("data-low", String(low));
  el.textContent = low ? `⚠️ ❤️ ${hp}` : `❤️ ${hp}`;

  const vignette = document.getElementById("low-hp-vignette");
  vignette?.setAttribute("data-visible", String(low));
}
