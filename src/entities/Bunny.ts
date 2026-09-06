import Phaser from 'phaser';
import {
  BOOST_COOLDOWN,
  BOOST_MULT,
  BOOST_TIME,
  BUNNY_BASE_SPEED,
  BUNNY_MAX_SPEED,
  BUNNY_RADIUS,
  INVULN_TIME,
  LATE_TURN_MAX,
  TILE,
  TURN_TOLERANCE,
} from '../config';
import type { Pt } from '../gen/LevelData';
import type { GameInput } from '../systems/Input';
import type { World } from '../world/World';

export type HitKind = 'frontal' | 'graze';

export interface BunnyEvents {
  onHit: (kind: HitKind) => void;
  onHop: () => void;
  onBoost: () => void;
}

/**
 * The bunny auto-runs along its facing direction. Turns are lane-snapped:
 * a turn happens when the tile to the side opens up (at least 3 walkable
 * tiles that way, so a parallel lane in the same corridor never counts).
 * Pressing late (just past an opening) still turns but grazes the fence.
 */
export class Bunny extends Phaser.GameObjects.Sprite {
  dir: Pt = { x: 1, y: 0 };
  baseSpeed = BUNNY_BASE_SPEED;
  /** external multiplier (dizzy) */
  speedMult = 1;
  boostTimer = 0;
  boostCooldown = 0;
  stunTimer = 0;
  invulnTimer = 0;
  /** After a crash the bunny sits still until the player picks a direction (or this runs out). */
  waitTimer = 0;
  private hopDist = 0;
  private hopFrame = 0;
  private lastGraze = 0;
  private lastFrontal = 0;
  private sceneTime = 0;

  constructor(
    scene: Phaser.Scene,
    private world: World,
    tile: Pt,
    dir: Pt,
    private events: BunnyEvents,
  ) {
    const c = world.center(tile.x, tile.y);
    super(scene, c.x, c.y, 'bunny', 4);
    this.dir = { ...dir };
    this.setOrigin(0.5, 0.75);
    this.setDepth(10);
    scene.add.existing(this);
  }

  get tile(): Pt {
    return this.world.tileOf(this.x, this.y);
  }

  get currentSpeed(): number {
    const boost = this.boostTimer > 0 ? BOOST_MULT : 1;
    return this.baseSpeed * this.speedMult * boost;
  }

  get boostReady(): boolean {
    return this.boostCooldown <= 0 && this.boostTimer <= 0;
  }

  /** Raise base speed with score (ramps the challenge). */
  setDifficulty(score: number): void {
    this.baseSpeed = Math.min(BUNNY_MAX_SPEED, BUNNY_BASE_SPEED + score / 45);
  }

  update(dt: number, input: GameInput): void {
    this.sceneTime += dt;
    if (this.boostTimer > 0) this.boostTimer -= dt;
    else if (this.boostCooldown > 0) this.boostCooldown -= dt;
    if (this.invulnTimer > 0) this.invulnTimer -= dt;
    this.setAlpha(this.invulnTimer > 0 ? (Math.floor(this.sceneTime * 12) % 2 ? 0.35 : 1) : 1);

    if (input.consumeBoost() && this.boostReady && this.stunTimer <= 0) {
      this.boostTimer = BOOST_TIME;
      this.boostCooldown = BOOST_COOLDOWN;
      this.events.onBoost();
    }

    if (this.stunTimer > 0) {
      this.stunTimer -= dt;
      this.updateFrame(0);
      return;
    }
    if (this.waitTimer > 0) {
      this.waitTimer -= dt;
      if (input.desiredDir) {
        const d = input.desiredDir;
        // Any direction that is open from here is accepted; otherwise keep facing away from the wall.
        if (this.world.isWalkable(this.tile.x + d.x, this.tile.y + d.y)) this.dir = { ...d };
        input.desiredDir = null;
        this.waitTimer = 0;
      } else {
        this.updateFrame(0);
        return;
      }
    }

    const step = this.currentSpeed * dt;
    if (input.desiredDir) this.tryTurn(input, step);
    this.moveForward(step);
    this.updateFrame(step);
  }

  // ------------------------------------------------------------ turning

  private alongOffset(): number {
    const t = this.tile;
    const c = this.world.center(t.x, t.y);
    return this.dir.x !== 0 ? (this.x - c.x) * this.dir.x : (this.y - c.y) * this.dir.y;
  }

  /** True if moving from tile `t` in direction `d` has at least 3 walkable tiles. */
  private sideOpen(t: Pt, d: Pt): boolean {
    for (let k = 1; k <= 3; k++) if (!this.world.isWalkable(t.x + d.x * k, t.y + d.y * k)) return false;
    return true;
  }

  private snapTo(t: Pt): void {
    const c = this.world.center(t.x, t.y);
    this.x = c.x;
    this.y = c.y;
  }

  private tryTurn(input: GameInput, step: number): void {
    const d = input.desiredDir!;
    if (d.x === this.dir.x && d.y === this.dir.y) {
      input.desiredDir = null;
      return;
    }
    if (d.x === -this.dir.x && d.y === -this.dir.y) {
      this.dir = { ...d };
      input.desiredDir = null;
      return;
    }
    const t = this.tile;
    const along = this.alongOffset();
    if (this.sideOpen(t, d)) {
      const reachesCentre = along < 0 && along + step >= 0;
      if (Math.abs(along) <= TURN_TOLERANCE || reachesCentre) {
        this.snapTo(t);
        this.dir = { ...d };
        input.desiredDir = null;
      } else if (along > TURN_TOLERANCE) {
        const next = { x: t.x + this.dir.x, y: t.y + this.dir.y };
        const nextOpen = this.world.isWalkable(next.x, next.y) && this.sideOpen(next, d);
        if (!nextOpen && along <= LATE_TURN_MAX) this.lateTurn(t, d, input);
      }
      return;
    }
    // Side is blocked here — maybe we just passed the opening.
    const prev = { x: t.x - this.dir.x, y: t.y - this.dir.y };
    if (this.world.isWalkable(prev.x, prev.y) && this.sideOpen(prev, d)) {
      const past = along + TILE;
      if (past <= LATE_TURN_MAX) this.lateTurn(prev, d, input);
    }
  }

  private lateTurn(t: Pt, d: Pt, input: GameInput): void {
    this.snapTo(t);
    this.dir = { ...d };
    input.desiredDir = null;
    if (this.sceneTime - this.lastGraze > 1.5 && this.invulnTimer <= 0) {
      this.lastGraze = this.sceneTime;
      this.events.onHit('graze');
    }
  }

  // ------------------------------------------------------------ movement

  private moveForward(step: number): void {
    const nx = this.x + this.dir.x * step;
    const ny = this.y + this.dir.y * step;
    const fx = nx + this.dir.x * BUNNY_RADIUS;
    const fy = ny + this.dir.y * BUNNY_RADIUS;
    const ft = this.world.tileOf(fx, fy);
    if (this.world.isWalkable(ft.x, ft.y)) {
      this.x = nx;
      this.y = ny;
      return;
    }
    // Blocked: clamp to the tile edge and report a frontal hit.
    if (this.dir.x > 0) this.x = ft.x * TILE - BUNNY_RADIUS - 0.01;
    else if (this.dir.x < 0) this.x = (ft.x + 1) * TILE + BUNNY_RADIUS + 0.01;
    else if (this.dir.y > 0) this.y = ft.y * TILE - BUNNY_RADIUS - 0.01;
    else this.y = (ft.y + 1) * TILE + BUNNY_RADIUS + 0.01;
    this.onFrontal();
  }

  private onFrontal(): void {
    if (this.sceneTime - this.lastFrontal < 0.3) return;
    this.lastFrontal = this.sceneTime;
    // Bounce back the way we came.
    this.dir = { x: -this.dir.x, y: -this.dir.y };
    this.stunTimer = 0.5;
    this.waitTimer = 2.5;
    this.boostTimer = 0;
    if (this.invulnTimer > 0) return; // free bump while blinking
    this.invulnTimer = INVULN_TIME;
    this.events.onHit('frontal');
  }

  /** Called when the farmer catches the bunny. */
  wriggleFree(): void {
    this.invulnTimer = INVULN_TIME + 0.6;
    this.stunTimer = 0.4;
    this.boostTimer = BOOST_TIME;
    this.boostCooldown = BOOST_COOLDOWN;
  }

  // ------------------------------------------------------------ visuals

  private updateFrame(step: number): void {
    this.hopDist += step;
    if (this.hopDist >= 7) {
      this.hopDist = 0;
      this.hopFrame ^= 1;
      if (this.hopFrame) this.events.onHop();
    }
    let base = 4; // side
    if (this.dir.y > 0) base = 0;
    else if (this.dir.y < 0) base = 2;
    this.setFlipX(this.dir.x < 0);
    this.setFrame(base + (step > 0 ? this.hopFrame : 0));
  }
}
