import Phaser from "phaser";

/**
 * The child's own on-screen character — a plain kid figure, deliberately
 * not "correct" or "decoy" colored so it doesn't read as either catch
 * category. Shared between PlatformCatchScene and IdiomDoorScene rather
 * than duplicated (it used to be copy-pasted, and PlatformCatchScene
 * built it by drawing a full focus-scene icon and then tearing pieces
 * back off — this is what that should have been from the start).
 */
export const PLAYER_SHIRT = 0x3d8f6f;

export function drawPlayerFigure(gfx: Phaser.GameObjects.Graphics, size: number): void {
  const s = size;
  gfx.lineStyle(Math.max(2, s * 0.05), PLAYER_SHIRT, 1);
  gfx.lineBetween(-s * 0.08, s * 0.22, -s * 0.1, s * 0.4);
  gfx.lineBetween(s * 0.08, s * 0.22, s * 0.1, s * 0.4);
  gfx.fillStyle(PLAYER_SHIRT, 1);
  gfx.fillRoundedRect(-s * 0.16, -s * 0.06, s * 0.32, s * 0.3, s * 0.08);
  gfx.lineStyle(Math.max(2, s * 0.045), 0xf3c88f, 1);
  gfx.lineBetween(s * 0.12, s * 0.04, s * 0.2, s * 0.16);
  gfx.lineBetween(-s * 0.12, s * 0.04, -s * 0.2, s * 0.16);
  gfx.fillStyle(0xf3c88f, 1);
  gfx.fillCircle(0, -s * 0.18, s * 0.16);
  gfx.fillStyle(0x4a3420, 1);
  gfx.beginPath();
  gfx.slice(0, -s * 0.18, s * 0.17, Phaser.Math.DegToRad(195), Phaser.Math.DegToRad(345), false);
  gfx.fillPath();
}
