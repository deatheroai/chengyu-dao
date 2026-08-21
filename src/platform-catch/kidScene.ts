import Phaser from "phaser";
import type { IconKind } from "../catch-meaning/catchItems";
import { drawIcon, CORRECT_ICON_COLOR, DECOY_ICON_COLOR } from "../catch-meaning/drawIcon";

/**
 * Phase 2 icon rework (CATCH_MECHANIC_PLAN.md): a small figurative
 * scene — a kid actually engaged in the idiom's meaning — rather than
 * Phase 0's abstract prop-only icons. Same kid figure both times;
 * "focused" is upright, reaching toward the prop in front; "distracted"
 * is turned/slouched toward it instead. Reuses drawIcon's existing prop
 * shapes (book/pencil/clock/star/tv/toy/phone) as the thing the kid is
 * engaging with, rather than throwing that work away.
 */
export function buildFocusSceneIcon(scene: Phaser.Scene, icon: IconKind, kind: "correct" | "decoy", size: number): Phaser.GameObjects.Container {
  const container = scene.add.container(0, 0);
  const shirtColor = kind === "correct" ? CORRECT_ICON_COLOR : DECOY_ICON_COLOR;
  const isFocused = kind === "correct";

  const kid = scene.add.graphics();
  drawKid(kid, shirtColor, isFocused, size);
  if (!isFocused) kid.setAngle(16);
  container.add(kid);

  const prop = scene.add.graphics();
  const propSize = size * 0.52;
  prop.setPosition(isFocused ? size * 0.34 : size * 0.4, isFocused ? size * 0.06 : -size * 0.02);
  drawIcon(prop, icon, propSize);
  container.add(prop);

  return container;
}

function drawKid(gfx: Phaser.GameObjects.Graphics, shirtColor: number, isFocused: boolean, size: number): void {
  const s = size;
  const skin = 0xf3c88f;
  const hair = 0x4a3420;

  gfx.lineStyle(Math.max(2, s * 0.05), shirtColor, 1);
  gfx.lineBetween(-s * 0.08, s * 0.22, -s * 0.1, s * 0.4);
  gfx.lineBetween(s * 0.08, s * 0.22, s * 0.1, s * 0.4);

  gfx.fillStyle(shirtColor, 1);
  gfx.fillRoundedRect(-s * 0.16, -s * 0.06, s * 0.32, s * 0.3, s * 0.08);

  gfx.lineStyle(Math.max(2, s * 0.045), skin, 1);
  if (isFocused) {
    // Reaching down-and-forward toward the prop, head-down posture —
    // reads as engaged with the task right in front of them.
    gfx.lineBetween(s * 0.12, s * 0.02, s * 0.3, s * 0.16);
  } else {
    // Low, slack reach toward the distraction off to the side.
    gfx.lineBetween(s * 0.12, s * 0.08, s * 0.28, s * 0.2);
  }
  gfx.lineBetween(-s * 0.12, s * 0.02, -s * 0.2, s * 0.18);

  gfx.fillStyle(skin, 1);
  gfx.fillCircle(0, -s * 0.18, s * 0.16);

  gfx.fillStyle(hair, 1);
  gfx.beginPath();
  gfx.slice(0, -s * 0.18, s * 0.17, Phaser.Math.DegToRad(195), Phaser.Math.DegToRad(345), false);
  gfx.fillPath();
}
