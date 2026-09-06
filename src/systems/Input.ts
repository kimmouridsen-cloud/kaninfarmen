import Phaser from 'phaser';
import type { Pt } from '../gen/LevelData';

export const DIR = {
  UP: { x: 0, y: -1 },
  RIGHT: { x: 1, y: 0 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
} as const;

/**
 * Unifies keyboard (arrows/WASD/space) and touch (swipe + tap, plus a D-pad the
 * HUD can feed via `pressDir`). Produces a `desiredDir` that stays queued until
 * consumed, and a one-shot boost request.
 */
export class GameInput {
  desiredDir: Pt | null = null;
  /** After a lane shift the turn intent lives on for a short while (ms timestamp), else forever. */
  private expiresAt = Infinity;
  private boostRequested = false;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  private wasd: Record<string, Phaser.Input.Keyboard.Key> | null = null;
  private space: Phaser.Input.Keyboard.Key | null = null;
  private swipeStart: { x: number; y: number; t: number } | null = null;
  private readonly startedAt: number;

  constructor(private scene: Phaser.Scene) {
    this.startedAt = scene.time.now;
    const kb = scene.input.keyboard;
    if (kb) {
      this.cursors = kb.createCursorKeys();
      this.wasd = kb.addKeys('W,A,S,D') as Record<string, Phaser.Input.Keyboard.Key>;
      this.space = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      this.space.on('down', () => (this.boostRequested = true));
      // Event-driven so a tap shorter than one frame is never lost.
      const map: Record<string, Pt> = { LEFT: DIR.LEFT, RIGHT: DIR.RIGHT, UP: DIR.UP, DOWN: DIR.DOWN, A: DIR.LEFT, D: DIR.RIGHT, W: DIR.UP, S: DIR.DOWN };
      for (const [k, dir] of Object.entries(map)) kb.on(`keydown-${k}`, () => this.pressDir(dir));
    }
    scene.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (scene.time.now - this.startedAt < 400) return; // ignore the click that started the scene
      this.swipeStart = { x: p.x, y: p.y, t: p.downTime };
    });
    scene.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (!this.swipeStart) return;
      const dx = p.x - this.swipeStart.x;
      const dy = p.y - this.swipeStart.y;
      const dist = Math.hypot(dx, dy);
      if (dist >= 24) {
        this.pressDir(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? DIR.RIGHT : DIR.LEFT) : dy > 0 ? DIR.DOWN : DIR.UP);
      } else if (p.upTime - this.swipeStart.t < 300) {
        this.boostRequested = true;
      }
      this.swipeStart = null;
    });
  }

  /** Called by the HUD's on-screen D-pad. */
  pressDir(dir: Pt): void {
    this.desiredDir = dir;
    this.expiresAt = Infinity;
  }

  /** Keep the current intent only for `seconds` more (used after a lane shift). */
  expireIn(seconds: number): void {
    this.expiresAt = this.scene.time.now + seconds * 1000;
  }

  update(): void {
    if (this.desiredDir && this.scene.time.now > this.expiresAt) {
      this.desiredDir = null;
      this.expiresAt = Infinity;
    }
    const c = this.cursors;
    const w = this.wasd;
    // Held keys keep the request alive (so holding "left" before a junction works).
    if (c?.left.isDown || w?.A.isDown) this.pressDir(DIR.LEFT);
    else if (c?.right.isDown || w?.D.isDown) this.pressDir(DIR.RIGHT);
    else if (c?.up.isDown || w?.W.isDown) this.pressDir(DIR.UP);
    else if (c?.down.isDown || w?.S.isDown) this.pressDir(DIR.DOWN);
  }

  consumeBoost(): boolean {
    const b = this.boostRequested;
    this.boostRequested = false;
    return b;
  }

  destroy(): void {
    this.scene.input.off('pointerdown');
    this.scene.input.off('pointerup');
    this.scene.input.keyboard?.removeAllListeners();
    this.space?.removeAllListeners();
  }
}
