import Phaser from 'phaser';
import { ART_SCALE, TILE } from '../config';
import type { LevelData, Pt } from '../gen/LevelData';

export type PickupKind = 'carrot' | 'clover';

export interface Pickup {
  kind: PickupKind;
  field: boolean;
  tile: Pt;
  sprite: Phaser.GameObjects.Image;
}

/** All collectibles, indexed by tile so collection is an O(1) lookup. */
export class Pickups {
  private byTile = new Map<number, Pickup>();
  readonly total: number;

  constructor(private scene: Phaser.Scene, level: LevelData) {
    const w = level.width;
    for (const c of level.carrots) this.add('carrot', c, c.field, w);
    for (const c of level.clovers) this.add('clover', c, false, w);
    this.total = level.carrots.length;
  }

  private add(kind: PickupKind, t: Pt, field: boolean, w: number): void {
    const sprite = this.scene.add.image(t.x * TILE + TILE / 2, t.y * TILE + TILE / 2 + 1, 'items', kind).setScale(ART_SCALE).setDepth(5);
    if (kind === 'clover') {
      this.scene.tweens.add({ targets: sprite, y: sprite.y - 2, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    } else {
      // carrots sway gently, offset per tile so they don't move in lockstep
      this.scene.tweens.add({ targets: sprite, angle: { from: -6, to: 6 }, duration: 900 + ((t.x * 7 + t.y * 13) % 5) * 90, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }
    this.byTile.set(t.y * w + t.x, { kind, field, tile: t, sprite });
  }

  /** Returns and removes the pickup on this tile, if any. */
  take(index: number): Pickup | undefined {
    const p = this.byTile.get(index);
    if (!p) return undefined;
    this.byTile.delete(index);
    const s = p.sprite;
    this.scene.tweens.add({
      targets: s,
      scale: ART_SCALE * 1.6,
      alpha: 0,
      y: s.y - 6,
      duration: 180,
      onComplete: () => s.destroy(),
    });
    return p;
  }

  get remainingCarrots(): number {
    let n = 0;
    for (const p of this.byTile.values()) if (p.kind === 'carrot') n++;
    return n;
  }
}
