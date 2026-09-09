import Phaser from 'phaser';
import {
  ART_SCALE,
  FARMER_CATCH_DIST,
  FARMER_CHASE_TIMEOUT,
  FARMER_GIVEUP_DIST,
  FARMER_REPATH_MS,
  FARMER_SPEED,
  PATROL_CHASE_TIMEOUT,
  PATROL_GIVEUP_DIST,
  PATROL_SIGHT_TILES,
  PATROL_SPEED,
} from '../config';
import type { Pt } from '../gen/LevelData';
import { sfx } from '../systems/audio';
import type { Pathfinder } from '../systems/Pathfinder';
import { FONT } from '../ui/style';
import type { World } from '../world/World';

export type FarmerState = 'hidden' | 'spawning' | 'chase' | 'stunned' | 'home' | 'patrol';
export type FarmerKind = 'boss' | 'patrol';

export interface FarmerEvents {
  onCatch: () => void;
  onState: (s: FarmerState) => void;
}

export class Farmer extends Phaser.GameObjects.Container {
  mode: FarmerState = 'hidden';
  readonly sprite: Phaser.GameObjects.Sprite;
  readonly shadow: Phaser.GameObjects.Image;
  private path: Pt[] = [];
  private repathMs = 0;
  private timer = 0;
  private walkPhase = 0;
  private facing: Pt = { x: 0, y: 1 };
  private alert: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    private world: World,
    private pathfinder: Pathfinder,
    private events: FarmerEvents,
    readonly kind: FarmerKind = 'boss',
  ) {
    super(scene, 0, 0);
    this.shadow = scene.add.image(0, 2, 'shadow').setScale(ART_SCALE * 0.75, ART_SCALE * 0.6).setAlpha(0.8);
    this.sprite = scene.add.sprite(0, 0, kind === 'boss' ? 'farmer' : 'farmhand', 0).setOrigin(0.5, 0.9).setScale(ART_SCALE);
    this.add([this.shadow, this.sprite]);
    this.setDepth(11);
    this.setVisible(false);
    scene.add.existing(this as unknown as Phaser.GameObjects.GameObject);
    this.alert = scene.add
      .text(0, 0, '!', { fontFamily: FONT, fontSize: '14px', color: '#ff3b3b', fontStyle: 'bold', stroke: '#000', strokeThickness: 3 })
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

  get onMap(): boolean {
    return this.mode !== 'hidden';
  }

  /** Appear (or, when `move` is false, stay put) with a "!" and start chasing shortly after. */
  spawnAt(tile: Pt, move = true): void {
    const c = this.world.center(tile.x, tile.y);
    if (move) this.setPosition(c.x, c.y);
    else sfx.play('shout'); // a patrolling farmhand just spotted the bunny
    this.setVisible(true);
    this.path = [];
    this.timer = 0.7;
    this.setMode('spawning');
    this.alert.setVisible(true).setAlpha(1);
    this.alert.setPosition(this.x, this.y - 22);
    this.scene.tweens.add({ targets: this.alert, y: { from: this.y - 22, to: this.y - 28 }, alpha: { from: 1, to: 0 }, duration: 900 });
  }

  /** Start wandering the paths from this tile (patrol farmhands). */
  startPatrol(tile: Pt): void {
    const c = this.world.center(tile.x, tile.y);
    this.setPosition(c.x, c.y);
    this.setVisible(true);
    this.path = [];
    this.timer = 0;
    this.setMode('patrol');
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
    if (this.kind === 'patrol') {
      this.path = [];
      this.timer = 0;
      this.setMode('patrol');
      return;
    }
    const home = this.world.level.farmerHome;
    this.path = this.pathfinder.find(this.tile, home) ?? [];
    this.setMode('home');
  }

  private pickPatrolTarget(): void {
    // Random path tile (outside plots) reachable from here, 8..40 tiles away.
    const paths = this.world.level.pathTiles;
    for (let tries = 0; tries < 12; tries++) {
      const t = paths[Math.floor(Math.random() * paths.length)];
      const d = Math.abs(t.x - this.tile.x) + Math.abs(t.y - this.tile.y);
      if (d < 8 || d > 40) continue;
      const p = this.pathfinder.find(this.tile, t, 3000);
      if (p && p.length) {
        this.path = p;
        return;
      }
    }
    this.path = [];
  }

  private canSee(bunnyTile: Pt): boolean {
    const dx = bunnyTile.x - this.tile.x;
    const dy = bunnyTile.y - this.tile.y;
    if (dx * dx + dy * dy > PATROL_SIGHT_TILES * PATROL_SIGHT_TILES) return false;
    // Must share a corridor: straight walkable line between the two.
    if (dx !== 0 && dy !== 0) return Math.abs(dx) + Math.abs(dy) <= 3;
    const sx = Math.sign(dx);
    const sy = Math.sign(dy);
    for (let x = this.tile.x + sx, y = this.tile.y + sy; x !== bunnyTile.x || y !== bunnyTile.y; x += sx, y += sy) {
      if (!this.world.isWalkable(x, y)) return false;
    }
    return true;
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
        this.updateVisual(0);
        return;
      case 'stunned':
        this.timer -= dt;
        this.sprite.setAngle(Math.sin(this.timer * 20) * 12);
        if (this.timer <= 0) {
          this.sprite.setAngle(0);
          this.goHome();
        }
        return;
      case 'chase': {
        this.timer += dt;
        this.repathMs -= dt * 1000;
        const distTiles = Math.abs(bunnyTile.x - this.tile.x) + Math.abs(bunnyTile.y - this.tile.y);
        const timeout = this.kind === 'boss' ? FARMER_CHASE_TIMEOUT : PATROL_CHASE_TIMEOUT;
        const giveUp = this.kind === 'boss' ? FARMER_GIVEUP_DIST : PATROL_GIVEUP_DIST;
        if (this.timer > timeout || distTiles > giveUp) {
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
      case 'patrol': {
        if (this.canSee(bunnyTile)) {
          this.spawnAt(this.tile, false);
          return;
        }
        this.timer -= dt;
        if (!this.path.length) {
          if (this.timer <= 0) {
            this.pickPatrolTarget();
            this.timer = 1 + Math.random() * 2; // pause before the next stroll if none found
          }
          this.updateVisual(0);
          return;
        }
        this.followPath(dt, PATROL_SPEED);
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
      this.updateVisual(0);
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
    this.updateVisual(step);
  }

  private face(p: Pt): void {
    const dx = p.x - this.x;
    const dy = p.y - this.y;
    this.facing = Math.abs(dx) > Math.abs(dy) ? { x: Math.sign(dx), y: 0 } : { x: 0, y: Math.sign(dy) || 1 };
  }

  private updateVisual(step: number): void {
    this.walkPhase = (this.walkPhase + step / 12) % 1;
    const bob = step > 0 ? Math.abs(Math.sin(this.walkPhase * Math.PI * 2)) : 0;
    this.sprite.y = -bob * 1.5;
    this.sprite.setAngle(step > 0 ? Math.sin(this.walkPhase * Math.PI * 2) * 4 : 0);
    let frame = 2;
    if (this.facing.y > 0) frame = 0;
    else if (this.facing.y < 0) frame = 1;
    this.sprite.setFrame(frame);
    this.sprite.setFlipX(this.facing.x < 0);
  }
}
