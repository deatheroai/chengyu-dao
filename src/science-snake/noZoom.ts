/**
 * Stops phones zooming the game in on a quick double tap. Found in a
 * playtest (2026-09-30): tapping to steer zoomed the answer room in on
 * an iPhone, and since the page blocks pinch-zoom (the viewport meta's
 * `user-scalable=no`), there was no way back out short of a reload.
 *
 * style.css's `touch-action: manipulation` on the page is the main fix
 * — it tells the browser taps are just taps. This is the backstop for
 * browsers that still zoom anyway: a second tap landing within
 * `DOUBLE_TAP_MS` of the first has its default action (the zoom)
 * cancelled. Buttons, links and text fields are left alone, so a quick
 * second press of a real button still counts, and typing (the golden
 * apple's answer box) is unaffected.
 */

export const DOUBLE_TAP_MS = 350;

const LEAVE_ALONE = "button, a, input, textarea, select, label";

export function preventDoubleTapZoom(root: Document = document): void {
  let lastTapAt = 0;
  root.addEventListener(
    "touchend",
    (event) => {
      const now = event.timeStamp || Date.now();
      const target = event.target instanceof Element ? event.target : null;
      const isDoubleTap = now - lastTapAt < DOUBLE_TAP_MS;
      lastTapAt = now;
      if (isDoubleTap && event.cancelable && !target?.closest(LEAVE_ALONE)) event.preventDefault();
    },
    { passive: false },
  );
  // Desktop Safari/Chrome trackpad double-click zoom, and iOS's older
  // pinch gesture events, for the same reason.
  root.addEventListener("dblclick", (event) => event.preventDefault());
  root.addEventListener("gesturestart", (event) => event.preventDefault());
}
