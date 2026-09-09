import Phaser from 'phaser';
import { ART_SCALE, TILE } from '../config';
import type { AnimalSpawn, Plot } from '../gen/LevelData';

/** Livestock that wanders slowly inside its pen. Purely decorative. */
export class Animal extends Phaser.GameObjects.Sprite {
  private target: { x: number; y: number };
  private pause = 0;
  private speed: number;
  private area: { x0: number; y0: number; x1: number; y1: number };

  constructor(scene: Phaser.Scene, spawn: AnimalSpawn, plot: Plot) {
    super(scene, spawn.x * TILE + TILE / 2, spawn.y * TILE + TILE / 2, 'animals', spawn.kind);
    this.setOrigin(0.5, 0.88);
    this.setScale(ART_SCALE);
    this.setDepth(9);
    // stay well inside the fence and off the trough tile
    this.area = {
      x0: (plot.x + 2) * TILE + 6,
      y0: (plot.y + 2) * TILE + 8,
      x1: (plot.x + plot.w - 2) * TILE - 6,
      y1: (plot.y + plot.h - 2) * TILE - 4,
    };
    this.speed = spawn.kind === 'chicken' ? 18 : spawn.kind === 'pig' ? 12 : 9;
    this.target = { x: this.x, y: this.y };
    this.pause = Math.random() * 3;
    scene.add.existing(this);
  }

  private walkPhase = 0;

  update(dt: number): void {
    if (this.pause > 0) {
      this.pause -= dt;
      if (this.pause <= 0) {
        this.target = {
          x: Phaser.Math.Between(this.area.x0, this.area.x1),
          y: Phaser.Math.Between(this.area.y0, this.area.y1),
        };
      }
      return;
    }
    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const d = Math.hypot(dx, dy);
    if (d < 1) {
      this.pause = 1 + Math.random() * 4;
      return;
    }
    const step = Math.min(d, this.speed * dt);
    this.x += (dx / d) * step;
    this.y += (dy / d) * step;
    if (Math.abs(dx) > 0.5) this.setFlipX(dx > 0);
    this.walkPhase += step / 6;
    this.setAngle(Math.sin(this.walkPhase) * 3);
  }
}
