import Phaser from 'phaser';
import {
  ART_SCALE,
  BOOST_COOLDOWN,
  BOOST_MULT,
  BOOST_TIME,
  BUNNY_BASE_SPEED,
  BUNNY_MAX_SPEED,
  BUNNY_RADIUS,
  INVULN_TIME,
  LANE_SHIFT_INTENT_TIME,
  LATE_TURN_MAX,
  TILE,
  TURN_TOLERANCE,
} from '../config';
import type { Pt } from '../gen/LevelData';
import type { GameInput } from '../systems/Input';
import type { World } from '../world/World';

/** The bunny is drawn a little larger than one tile so it reads well. */
const BUNNY_VISUAL = 1.3;

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
 *
 * Visuals: a shadow blob plus a body sprite that hops (offset + squash) as
 * the bunny moves. The container position is the logical position.
 */
export class Bunny extends Phaser.GameObjects.Container {
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
  readonly sprite: Phaser.GameObjects.Sprite;
  readonly shadow: Phaser.GameObjects.Image;
  /** Target lane centre (on the axis perpendicular to travel) while switching lanes, or null. */
  private laneTarget: number | null = null;
  private lastShiftDir: Pt | null = null;
  private hopPhase = 0;
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
    super(scene, c.x, c.y);
    this.dir = { ...dir };
    this.shadow = scene.add.image(0, 3, 'shadow').setScale(ART_SCALE * 0.7, ART_SCALE * 0.6).setAlpha(0.8);
    this.sprite = scene.add.sprite(0, 0, 'bunny', 2).setOrigin(0.5, 0.86).setScale(ART_SCALE * BUNNY_VISUAL);
    this.add([this.shadow, this.sprite]);
    this.setDepth(10);
    scene.add.existing(this as unknown as Phaser.GameObjects.GameObject);
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
    this.sprite.setAlpha(this.invulnTimer > 0 ? (Math.floor(this.sceneTime * 12) % 2 ? 0.35 : 1) : 1);

    if (input.consumeBoost() && this.boostReady && this.stunTimer <= 0) {
      this.boostTimer = BOOST_TIME;
      this.boostCooldown = BOOST_COOLDOWN;
      this.events.onBoost();
    }

    if (this.stunTimer > 0) {
      this.stunTimer -= dt;
      this.updateVisual(0, dt);
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
        this.updateVisual(0, dt);
        return;
      }
    }

    const step = this.currentSpeed * dt;
    if (this.laneTarget !== null) this.updateLaneShift(dt);
    else if (input.desiredDir && !this.justShifted(input)) this.tryTurn(input, step);
    this.moveForward(step);
    this.updateVisual(step, dt);
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
    this.laneTarget = null;
    this.lastShiftDir = null;
  }

  /** After a shift, the same intent must not immediately shift again; it may still turn at an opening. */
  private justShifted(input: GameInput): boolean {
    const d = input.desiredDir!;
    if (!this.lastShiftDir || this.lastShiftDir.x !== d.x || this.lastShiftDir.y !== d.y) {
      this.lastShiftDir = null;
      return false;
    }
    return !this.sideOpen(this.tile, d) && !this.canLateTurn(d);
  }

  private canLateTurn(d: Pt): boolean {
    const t = this.tile;
    const prev = { x: t.x - this.dir.x, y: t.y - this.dir.y };
    return this.world.isWalkable(prev.x, prev.y) && this.sideOpen(prev, d) && this.alongOffset() + TILE <= LATE_TURN_MAX;
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
      if (past <= LATE_TURN_MAX) {
        this.lateTurn(prev, d, input);
        return;
      }
    }
    // No turn possible, but the neighbouring lane is free: switch lanes (to grab a carrot etc.).
    if (this.world.isWalkable(t.x + d.x, t.y + d.y)) {
      const c = this.world.center(t.x + d.x, t.y + d.y);
      this.laneTarget = d.x !== 0 ? c.x : c.y;
      this.lastShiftDir = { ...d };
      input.expireIn(LANE_SHIFT_INTENT_TIME); // still turn if an opening comes up soon
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

  /** Slide sideways to the neighbouring lane while still running forward. */
  private updateLaneShift(dt: number): void {
    const target = this.laneTarget!;
    const horizontal = this.dir.y !== 0; // lateral axis is x when running vertically
    const cur = horizontal ? this.x : this.y;
    const lateral = Math.max(90, this.currentSpeed * 1.4) * dt;
    const next = Math.abs(target - cur) <= lateral ? target : cur + Math.sign(target - cur) * lateral;
    if (horizontal) this.x = next;
    else this.y = next;
    if (next === target) this.laneTarget = null;
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
    this.laneTarget = null;
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

  private updateVisual(step: number, dt: number): void {
    // Hop cycle driven by distance travelled; one hop per ~14 px.
    const prev = this.hopPhase;
    this.hopPhase = (this.hopPhase + step / 14) % 1;
    if (step > 0 && this.hopPhase < prev) this.events.onHop();
    const lift = step > 0 ? Math.sin(this.hopPhase * Math.PI) : 0;
    const boosted = this.boostTimer > 0 ? 1.3 : 1;
    this.sprite.y = -lift * 3.5 * boosted;
    // squash at landing, stretch mid-air
    const stretch = step > 0 ? 1 + (lift - 0.5) * 0.16 : 1;
    this.sprite.setScale((ART_SCALE * BUNNY_VISUAL) / stretch, ART_SCALE * BUNNY_VISUAL * stretch);
    this.shadow.setScale(ART_SCALE * 0.7 * (1 - lift * 0.25), ART_SCALE * 0.6 * (1 - lift * 0.25)).setAlpha(0.8 - lift * 0.3);
    // facing + lean into the run direction
    let frame = 2;
    if (this.dir.y > 0) frame = 0;
    else if (this.dir.y < 0) frame = 1;
    this.sprite.setFrame(frame);
    this.sprite.setFlipX(this.dir.x < 0);
    const lean = step > 0 ? this.dir.x * 6 : 0;
    this.sprite.setAngle(lean + (this.stunTimer > 0 ? Math.sin(this.sceneTime * 30) * 10 : 0));
    void dt;
  }
}
