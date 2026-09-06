import Phaser from 'phaser';
import { FOG_RADIUS_TILES, TILE } from '../config';
import type { Pt } from '../gen/LevelData';
import type { World } from './World';

/**
 * Darkness over the whole map that is permanently erased around the bunny as
 * it explores. One RenderTexture, one soft brush blit every few pixels moved.
 */
export class FogOfWar {
  readonly rt: Phaser.GameObjects.RenderTexture;
  readonly seen: Uint8Array;
  private brush: Phaser.GameObjects.Image;
  private lastX = -1e9;
  private lastY = -1e9;
  private newlySeen: Pt[] = [];

  constructor(scene: Phaser.Scene, private world: World) {
    this.rt = scene.add.renderTexture(0, 0, world.w * TILE, world.h * TILE).setOrigin(0, 0).setDepth(50);
    this.rt.fill(0x070a14, 1);
    this.brush = scene.make.image({ key: 'fogbrush', add: false }).setOrigin(0.5, 0.5);
    this.brush.setScale((FOG_RADIUS_TILES * 2 * TILE) / 256 / 0.82);
    this.seen = new Uint8Array(world.w * world.h);
  }

  reveal(px: number, py: number, force = false): void {
    if (!force && Math.hypot(px - this.lastX, py - this.lastY) < 5) return;
    this.lastX = px;
    this.lastY = py;
    this.brush.setPosition(px, py);
    this.rt.erase(this.brush);

    const t = this.world.tileOf(px, py);
    const r = Math.ceil(FOG_RADIUS_TILES * 0.85);
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > r * r) continue;
        const x = t.x + dx;
        const y = t.y + dy;
        if (!this.world.inBounds(x, y)) continue;
        const i = this.world.idx(x, y);
        if (this.seen[i]) continue;
        this.seen[i] = 1;
        this.newlySeen.push({ x, y });
      }
    }
  }

  /** Drain tiles revealed since the last call (for the minimap). */
  takeNewlySeen(): Pt[] {
    const out = this.newlySeen;
    this.newlySeen = [];
    return out;
  }

  destroy(): void {
    this.rt.destroy();
    this.brush.destroy();
  }
}
