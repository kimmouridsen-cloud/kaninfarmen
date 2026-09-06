import { FOG_RADIUS_TILES } from '../config';
import type { Pt } from '../gen/LevelData';
import type { World } from './World';

/** Tracks which tiles the bunny has been near, so the minimap fills in as the farm is explored. */
export class Explored {
  readonly seen: Uint8Array;
  private lastX = -1e9;
  private lastY = -1e9;
  private newlySeen: Pt[] = [];

  constructor(private world: World) {
    this.seen = new Uint8Array(world.w * world.h);
  }

  reveal(px: number, py: number, force = false): void {
    if (!force && Math.hypot(px - this.lastX, py - this.lastY) < 8) return;
    this.lastX = px;
    this.lastY = py;
    const t = this.world.tileOf(px, py);
    const r = Math.ceil(FOG_RADIUS_TILES);
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
}
