import Phaser from "phaser";
import type { IconKind } from "./catchItems";

/** Warm gold for on-theme ("correct") icons, muted slate for off-theme
 * ("decoy") icons — a difference in temperature/category, not a
 * red/green right-wrong signal, matching the project's no-punishing-
 * feedback ethos (see DECISIONS.md's meaning-check entries). */
export const CORRECT_ICON_COLOR = 0xd88a1f;
export const DECOY_ICON_COLOR = 0x7788a0;

/**
 * Draws one Phase 0 spike icon into `gfx`, centered on the graphics
 * object's own local origin so callers can freely position/scale/rotate
 * it by moving the container. `size` is the icon's rough bounding box
 * (a square of that side length). Procedural/vector only — no raster
 * art, per DECISIONS.md's 2026-08-03 art entry and CATCH_MECHANIC_PLAN's
 * Phase 0 art decision.
 */
export function drawIcon(gfx: Phaser.GameObjects.Graphics, kind: IconKind, size: number): void {
  const color = kind === "tv" || kind === "toy" || kind === "phone" ? DECOY_ICON_COLOR : CORRECT_ICON_COLOR;
  const s = size;

  switch (kind) {
    case "book": {
      gfx.fillStyle(color, 1);
      gfx.fillRoundedRect(-s * 0.42, -s * 0.32, s * 0.84, s * 0.64, s * 0.06);
      gfx.lineStyle(Math.max(2, s * 0.04), 0xffffff, 0.9);
      gfx.lineBetween(0, -s * 0.28, 0, s * 0.28);
      for (const dy of [-s * 0.14, 0, s * 0.14]) {
        gfx.lineBetween(-s * 0.3, dy, -s * 0.08, dy);
        gfx.lineBetween(s * 0.08, dy, s * 0.3, dy);
      }
      break;
    }
    case "pencil": {
      // Phaser 4's Graphics dropped the canvas-style save/rotate/restore
      // API Phaser 3 had, so the diagonal pencil is built by rotating its
      // outline points by hand instead of rotating the drawing context.
      const angle = Phaser.Math.DegToRad(-40);
      const rot = (x: number, y: number) => rotatePoint(x, y, angle);
      gfx.fillStyle(color, 1);
      gfx.fillPoints(
        [
          rot(-s * 0.09, -s * 0.42),
          rot(s * 0.09, -s * 0.42),
          rot(s * 0.09, s * 0.28),
          rot(0, s * 0.46),
          rot(-s * 0.09, s * 0.28),
        ],
        true,
      );
      gfx.fillStyle(0xffffff, 0.9);
      gfx.fillPoints(
        [rot(-s * 0.09, -s * 0.42), rot(s * 0.09, -s * 0.42), rot(s * 0.09, -s * 0.34), rot(-s * 0.09, -s * 0.34)],
        true,
      );
      break;
    }
    case "clock": {
      gfx.fillStyle(color, 1);
      gfx.fillCircle(0, 0, s * 0.4);
      gfx.fillStyle(0xfff6e6, 1);
      gfx.fillCircle(0, 0, s * 0.32);
      gfx.lineStyle(Math.max(2, s * 0.05), color, 1);
      gfx.lineBetween(0, 0, 0, -s * 0.2);
      gfx.lineBetween(0, 0, s * 0.15, s * 0.04);
      break;
    }
    case "star": {
      gfx.fillStyle(color, 1);
      gfx.fillPoints(starPoints(s * 0.42, s * 0.18), true);
      break;
    }
    case "tv": {
      gfx.fillStyle(color, 1);
      gfx.fillRoundedRect(-s * 0.42, -s * 0.3, s * 0.84, s * 0.56, s * 0.06);
      gfx.fillStyle(0xf0f4f8, 1);
      gfx.fillRoundedRect(-s * 0.34, -s * 0.22, s * 0.68, s * 0.4, s * 0.04);
      gfx.lineStyle(Math.max(2, s * 0.04), color, 1);
      gfx.lineBetween(-s * 0.16, s * 0.32, s * 0.16, s * 0.32);
      break;
    }
    case "toy": {
      gfx.fillStyle(color, 1);
      gfx.fillCircle(0, 0, s * 0.4);
      gfx.lineStyle(Math.max(2, s * 0.05), 0xf0f4f8, 0.9);
      gfx.beginPath();
      gfx.arc(0, 0, s * 0.4, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(340));
      gfx.strokePath();
      gfx.lineBetween(0, -s * 0.4, 0, s * 0.4);
      break;
    }
    case "phone": {
      gfx.fillStyle(color, 1);
      gfx.fillRoundedRect(-s * 0.24, -s * 0.42, s * 0.48, s * 0.84, s * 0.1);
      gfx.fillStyle(0xf0f4f8, 1);
      gfx.fillCircle(0, -s * 0.3, s * 0.03);
      gfx.lineStyle(Math.max(2, s * 0.03), 0xf0f4f8, 0.9);
      gfx.lineBetween(-s * 0.1, s * 0.32, s * 0.1, s * 0.32);
      break;
    }
  }
}

function starPoints(outerRadius: number, innerRadius: number): Phaser.Math.Vector2[] {
  const points: Phaser.Math.Vector2[] = [];
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    points.push(new Phaser.Math.Vector2(Math.cos(angle) * radius, Math.sin(angle) * radius));
  }
  return points;
}

function rotatePoint(x: number, y: number, angle: number): Phaser.Math.Vector2 {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return new Phaser.Math.Vector2(x * cos - y * sin, x * sin + y * cos);
}
