import Phaser from 'phaser';
import { FARMER_CATCH_DIST, FARMER_CHASE_TIMEOUT, FARMER_GIVEUP_DIST, FARMER_REPATH_MS, FARMER_SPEED, TILE } from '../config';
import type { Pt } from '../gen/LevelData';
import type { Pathfinder } from '../systems/Pathfinder';
import type { World } from '../world/World';

export type FarmerState = 'hidden' | 'spawning' | 'chase' | 'stunned' | 'home';

export interface FarmerEvents {
  onCatch: () => void;
  onState: (s: FarmerState) => void;
}

export class Farmer extends Phaser.GameObjects.Sprite {
  mode: FarmerState = 'hidden';
  private path: Pt[] = [];
  private repathMs = 0;
  private timer = 0;
  private walkDist = 0;
  private walkFrame = 0;
  private facing: Pt = { x: 0, y: 1 };
  private alert: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    private world: World,
    private pathfinder: Pathfinder,
    private events: FarmerEvents,
  ) {
    super(scene, 0, 0, 'farmer', 0);
    this.setOrigin(0.5, 0.85);
    this.setDepth(11);
    this.setVisible(false);
    scene.add.existing(this);
    this.alert = scene.add
      .text(0, 0, '!', { fontFamily: 'monospace', fontSize: '12px', color: '#ff3b3b', fontStyle: 'bold', stroke: '#000', strokeThickness: 2 })
      .setOrigin(0.5, 1)
      .setDepth(12)
      .setVisible(false);
  }

  get tile(): Pt {
    return this.world.tileOf(this.x, this.y);
  }

  get busy(): boolean {
    return this.mode === 'chase' || this.mode === 'spawning' || this.mode === 'stunned';
  }

  spawnAt(tile: Pt): void {
    const c = this.world.center(tile.x, tile.y);
    this.setPosition(c.x, c.y);
    this.setVisible(true);
    this.path = [];
    this.timer = 0.7;
    this.setMode('spawning');
    this.alert.setVisible(true);
    this.scene.tweens.add({ targets: this.alert, y: { from: c.y - 22, to: c.y - 28 }, alpha: { from: 1, to: 0 }, duration: 900 });
    this.alert.setPosition(c.x, c.y - 22);
  }

  setMode(s: FarmerState): void {
    if (this.mode === s) return;
    this.mode = s;
    this.events.onState(s);
  }

  stun(seconds: number): void {
    this.timer = seconds;
    this.setMode('stunned');
  }

  private goHome(): void {
    const home = this.world.level.farmerHome;
    this.path = this.pathfinder.find(this.tile, home) ?? [];
    this.setMode('home');
  }

  update(dt: number, bunny: Pt, bunnyTile: Pt): void {
    switch (this.mode) {
      case 'hidden':
        return;
      case 'spawning':
        this.timer -= dt;
        if (this.timer <= 0) {
          this.timer = 0;
          this.repathMs = 0;
          this.setMode('chase');
        }
        this.face(bunny);
        this.updateFrame(0);
        return;
      case 'stunned':
        this.timer -= dt;
        this.setAngle(Math.sin(this.timer * 20) * 8);
        if (this.timer <= 0) {
          this.setAngle(0);
          this.goHome();
        }
        return;
      case 'chase': {
        this.timer += dt;
        this.repathMs -= dt * 1000;
        const distTiles = Math.abs(bunnyTile.x - this.tile.x) + Math.abs(bunnyTile.y - this.tile.y);
        if (this.timer > FARMER_CHASE_TIMEOUT || distTiles > FARMER_GIVEUP_DIST) {
          this.goHome();
          return;
        }
        if (this.repathMs <= 0) {
          this.repathMs = FARMER_REPATH_MS;
          const p = this.pathfinder.find(this.tile, bunnyTile);
          if (p) this.path = p;
          else if (!this.path.length) {
            this.goHome();
            return;
          }
        }
        this.followPath(dt, FARMER_SPEED);
        if (Phaser.Math.Distance.Between(this.x, this.y, bunny.x, bunny.y) < FARMER_CATCH_DIST) {
          this.events.onCatch();
        }
        return;
      }
      case 'home': {
        this.followPath(dt, FARMER_SPEED * 0.8);
        if (!this.path.length) {
          this.setVisible(false);
          this.setMode('hidden');
        }
        return;
      }
    }
  }

  private followPath(dt: number, speed: number): void {
    if (!this.path.length) {
      this.updateFrame(0);
      return;
    }
    const target = this.world.center(this.path[0].x, this.path[0].y);
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.hypot(dx, dy);
    const step = speed * dt;
    if (dist <= step) {
      this.x = target.x;
      this.y = target.y;
      this.path.shift();
    } else {
      this.x += (dx / dist) * step;
      this.y += (dy / dist) * step;
    }
    if (Math.abs(dx) > Math.abs(dy)) this.facing = { x: Math.sign(dx), y: 0 };
    else if (dy !== 0) this.facing = { x: 0, y: Math.sign(dy) };
    this.updateFrame(step);
  }

  private face(p: Pt): void {
    const dx = p.x - this.x;
    const dy = p.y - this.y;
    this.facing = Math.abs(dx) > Math.abs(dy) ? { x: Math.sign(dx), y: 0 } : { x: 0, y: Math.sign(dy) || 1 };
  }

  private updateFrame(step: number): void {
    this.walkDist += step;
    if (this.walkDist >= TILE / 2) {
      this.walkDist = 0;
      this.walkFrame ^= 1;
    }
    let base = 4;
    if (this.facing.y > 0) base = 0;
    else if (this.facing.y < 0) base = 2;
    this.setFlipX(this.facing.x < 0);
    this.setFrame(base + (step > 0 ? this.walkFrame : 0));
  }
}
