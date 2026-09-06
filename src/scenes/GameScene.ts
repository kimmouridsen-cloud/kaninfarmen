import Phaser from 'phaser';
import {
  CARROT_FIELD_POINTS,
  CARROT_PATH_POINTS,
  COMBO_WINDOW,
  DIZZY_BUNNY_MULT,
  DIZZY_FARMER_CHANCE,
  DIZZY_TIME,
  DIZZY_TIMESCALE,
  FIELD_ALARM_TIME,
  HIGHSCORE_KEY,
  MULTIPLIERS,
  PATROL_COUNT,
  PATROL_MIN_SPAWN_DIST,
  START_LIVES,
  TILE,
  ZOOM,
} from '../config';
import { Animal } from '../entities/Animal';
import { Bunny, type HitKind } from '../entities/Bunny';
import { Farmer } from '../entities/Farmer';
import { Pickups } from '../entities/Pickups';
import { generateLevel } from '../gen/generator';
import type { LevelData, Pt } from '../gen/LevelData';
import { S } from '../i18n/da';
import { sfx } from '../systems/audio';
import { bus, EV } from '../systems/EventBus';
import { GameInput } from '../systems/Input';
import { Pathfinder } from '../systems/Pathfinder';
import { Explored } from '../world/Explored';
import { buildTilemap } from '../world/TilemapBuilder';
import { World } from '../world/World';
import { readHighScore } from './MenuScene';

export interface GameSceneData {
  seed: string;
}

export class GameScene extends Phaser.Scene {
  private level!: LevelData;
  private world!: World;
  private bunny!: Bunny;
  private farmer!: Farmer;
  private farmers: Farmer[] = [];
  private pickups!: Pickups;
  private animals: Animal[] = [];
  private explored!: Explored;
  private gameInput!: GameInput;
  private pathfinder!: Pathfinder;
  private debug = false;

  // rules state
  private score = 0;
  private lives = START_LIVES;
  private multIndex = 0;
  private comboTimer = 0;
  private carrotsEaten = 0;
  private fieldTime = 0;
  private inField = false;
  private dizzyTimer = 0;
  private timeScale = 1;
  private over = false;
  private dust!: Phaser.GameObjects.Particles.ParticleEmitter;
  private bits!: Phaser.GameObjects.Particles.ParticleEmitter;
  private stars!: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor() {
    super('Game');
  }

  init(data: GameSceneData): void {
    this.level = generateLevel(data.seed);
    this.debug = new URLSearchParams(location.search).get('debug') === '1';
    this.score = 0;
    this.lives = START_LIVES;
    this.multIndex = 0;
    this.comboTimer = 0;
    this.carrotsEaten = 0;
    this.fieldTime = 0;
    this.inField = false;
    this.dizzyTimer = 0;
    this.timeScale = 1;
    this.over = false;
    this.animals = [];
  }

  create(): void {
    const level = this.level;
    this.world = new World(level);
    buildTilemap(this, level);
    this.pathfinder = new Pathfinder(level.walkable, level.width, level.height);
    this.pickups = new Pickups(this, level);

    for (const a of level.animals) this.animals.push(new Animal(this, a, level.plots[a.plot]));

    this.gameInput = new GameInput(this);
    this.bunny = new Bunny(this, this.world, level.spawn, level.spawn.dir, {
      onHit: (k) => this.onBunnyHit(k),
      onHop: () => {
        sfx.play('hop');
        this.dust.emitParticleAt(this.bunny.x, this.bunny.y + 2, 2);
      },
      onBoost: () => {
        sfx.play('boost');
        bus.emit(EV.BOOST, false);
      },
    });
    const farmerEvents = (f: () => Farmer) => ({
      onCatch: () => this.onCaught(f()),
      onState: () => bus.emit(EV.FARMER, this.farmers.some((x) => x.mode === 'chase' || x.mode === 'spawning')),
    });
    this.farmer = new Farmer(this, this.world, this.pathfinder, farmerEvents(() => this.farmer));
    this.farmers = [this.farmer];
    // Farmhands patrolling the paths, starting far from the bunny.
    const far = level.pathTiles.filter((t) => Math.abs(t.x - level.spawn.x) + Math.abs(t.y - level.spawn.y) >= PATROL_MIN_SPAWN_DIST);
    for (let i = 0; i < PATROL_COUNT && far.length; i++) {
      const hand: Farmer = new Farmer(this, this.world, this.pathfinder, farmerEvents(() => hand), 'patrol');
      hand.startPatrol(Phaser.Utils.Array.RemoveRandomElement(far) as Pt);
      this.farmers.push(hand);
    }

    // particles
    this.dust = this.add.particles(0, 0, 'p_dust', { speed: { min: 5, max: 20 }, lifespan: 300, alpha: { start: 0.8, end: 0 }, quantity: 0, emitting: false }).setDepth(8);
    this.bits = this.add
      .particles(0, 0, 'p_carrot', { speed: { min: 30, max: 70 }, lifespan: 400, gravityY: 120, alpha: { start: 1, end: 0 }, quantity: 0, emitting: false })
      .setDepth(12);
    this.stars = this.add
      .particles(0, 0, 'p_star', { speed: { min: 20, max: 50 }, lifespan: 500, scale: { start: 0.8, end: 0 }, quantity: 0, emitting: false })
      .setDepth(12);

    // camera
    const cam = this.cameras.main;
    cam.setBounds(0, 0, level.width * TILE, level.height * TILE);
    cam.setRoundPixels(true);
    if (this.debug) {
      cam.setZoom(0.45);
      cam.centerOn((level.width * TILE) / 2, (level.height * TILE) / 2);
    } else {
      cam.setZoom(ZOOM);
      cam.startFollow(this.bunny, true, 0.15, 0.15);
    }
    this.explored = new Explored(this.world);
    this.explored.reveal(this.bunny.x, this.bunny.y, true);

    this.scene.launch('Hud', { level, input: this.gameInput });
    this.time.delayedCall(50, () => {
      bus.emit(EV.SCORE, this.score, MULTIPLIERS[this.multIndex]);
      bus.emit(EV.LIVES, this.lives);
      bus.emit(EV.CARROTS, this.carrotsEaten, this.pickups.total);
      bus.emit(EV.BOOST, true);
      bus.emit(EV.SEEN, this.explored.takeNewlySeen());
    });

    // Debug hook for automated screenshots/tests.
    (window as unknown as { __game: () => unknown }).__game = () => ({
      seed: this.level.seed,
      fps: Math.round(this.game.loop.actualFps),
      score: this.score,
      lives: this.lives,
      bunny: { x: Math.round(this.bunny.x), y: Math.round(this.bunny.y), dir: this.bunny.dir, tile: this.bunny.tile, speed: Math.round(this.bunny.currentSpeed) },
      farmer: this.farmer.mode,
      hands: this.farmers.slice(1).map((f) => `${f.mode}@${f.tile.x},${f.tile.y}`),
      desired: this.gameInput.desiredDir,
      dizzy: this.dizzyTimer > 0,
      carrots: this.carrotsEaten,
    });

    (window as unknown as { __cmd: (c: string) => void }).__cmd = (c: string) => {
      if (c === 'dizzy') this.startDizzy();
      else if (c === 'farmer') this.summonFarmer(this.bunny.tile, () => true, this.bunny.dir);
      else if (c === 'graze') this.onBunnyHit('graze');
      else if (c === 'hand') {
        // put the first farmhand 6 tiles ahead of the bunny for testing
        const b = this.bunny.tile;
        const t = { x: b.x + this.bunny.dir.x * 6, y: b.y + this.bunny.dir.y * 6 };
        if (this.farmers[1] && this.world.isWalkable(t.x, t.y)) this.farmers[1].startPatrol(t);
      }
    };

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.gameInput.destroy();
      this.scene.stop('Hud');
      bus.removeAllListeners();
    });
  }

  update(_time: number, delta: number): void {
    if (this.over) return;
    const real = Math.min(delta, 50) / 1000;
    const dt = real * this.timeScale;

    this.gameInput.update();
    this.bunny.setDifficulty(this.score);
    this.bunny.update(dt, this.gameInput);
    if (this.bunny.boostReady && this.bunny.boostCooldown <= 0) bus.emit(EV.BOOST, true);

    const bt = this.bunny.tile;
    for (const f of this.farmers) f.update(dt, this.bunny, bt);
    for (const a of this.animals) a.update(dt);

    this.collect(bt);
    this.updateCombo(real);
    this.updateField(bt, real);
    this.updateDizzy(real);

    this.explored.reveal(this.bunny.x, this.bunny.y);
    const seen = this.explored.takeNewlySeen();
    if (seen.length) bus.emit(EV.SEEN, seen);
    bus.emit(
      EV.POSITIONS,
      bt,
      this.farmers.filter((f) => f.onMap).map((f) => f.tile),
    );
  }

  // ------------------------------------------------------------ rules

  private collect(bt: Pt): void {
    const p = this.pickups.take(this.world.idx(bt.x, bt.y));
    if (!p) return;
    if (p.kind === 'clover') {
      sfx.play('clover');
      this.bunny.boostTimer = Math.max(this.bunny.boostTimer, 3);
      this.bunny.boostCooldown = 0;
      this.stars.emitParticleAt(this.bunny.x, this.bunny.y, 10);
      this.flash(S.boostReady, '#7de08a');
      return;
    }
    const before = this.multIndex;
    if (this.comboTimer > 0 && this.multIndex < MULTIPLIERS.length - 1) this.multIndex++;
    this.comboTimer = COMBO_WINDOW;
    const mult = MULTIPLIERS[this.multIndex];
    this.score += (p.field ? CARROT_FIELD_POINTS : CARROT_PATH_POINTS) * mult;
    this.carrotsEaten++;
    sfx.play(this.multIndex > before ? 'combo' : 'munch');
    this.bits.emitParticleAt(this.bunny.x, this.bunny.y - 4, 6);
    if (this.multIndex > before) this.stars.emitParticleAt(this.bunny.x, this.bunny.y - 6, 6);
    bus.emit(EV.SCORE, this.score, mult);
    bus.emit(EV.CARROTS, this.carrotsEaten, this.pickups.total);
  }

  private updateCombo(real: number): void {
    if (this.comboTimer <= 0) return;
    this.comboTimer -= real;
    if (this.comboTimer <= 0 && this.multIndex > 0) {
      this.multIndex = 0;
      bus.emit(EV.SCORE, this.score, MULTIPLIERS[0]);
    }
  }

  private updateField(bt: Pt, real: number): void {
    const inside = this.world.isCarrotField(bt.x, bt.y);
    if (inside) {
      if (!this.inField) this.inField = true;
      if (!this.farmer.busy) {
        this.fieldTime += real;
        bus.emit(EV.FIELD_ALARM, Math.min(1, this.fieldTime / FIELD_ALARM_TIME));
        if (this.fieldTime >= FIELD_ALARM_TIME) {
          this.fieldTime = -2; // small grace before the alarm can re-arm
          this.summonFarmer(bt, (t) => !this.world.isCarrotField(t.x, t.y));
        }
      }
    } else if (this.inField) {
      this.inField = false;
      this.fieldTime = 0;
      bus.emit(EV.FIELD_ALARM, -1);
    }
  }

  private summonFarmer(near: Pt, filter: (t: Pt) => boolean, prefer?: Pt): void {
    if (this.farmer.mode !== 'hidden') return;
    let ring = this.pathfinder.ring(near, 9, 14).filter(filter);
    if (prefer) {
      // prefer tiles behind the bunny
      const behind = ring.filter((t) => (t.x - near.x) * prefer.x + (t.y - near.y) * prefer.y < 0);
      if (behind.length) ring = behind;
    }
    if (!ring.length) ring = this.pathfinder.ring(near, 6, 20).filter(filter);
    if (!ring.length) return;
    const t = Phaser.Utils.Array.GetRandom(ring);
    this.farmer.spawnAt(t);
    sfx.play('shout');
    this.cameras.main.flash(120, 255, 60, 60, false);
    this.flash(S.farmerComing, '#ff5b5b');
  }

  private onBunnyHit(kind: HitKind): void {
    if (kind === 'frontal') {
      sfx.play('hurt');
      this.cameras.main.shake(260, 0.012);
      this.flash(S.ouch, '#ff5b5b');
      this.loseLife();
      return;
    }
    // graze
    sfx.play('dizzy');
    this.cameras.main.shake(120, 0.005);
    this.startDizzy();
    if (Math.random() < DIZZY_FARMER_CHANCE) {
      this.summonFarmer(this.bunny.tile, () => true, this.bunny.dir);
    }
  }

  private startDizzy(): void {
    this.dizzyTimer = DIZZY_TIME;
    this.timeScale = DIZZY_TIMESCALE;
    this.bunny.speedMult = DIZZY_BUNNY_MULT;
    this.tweens.timeScale = DIZZY_TIMESCALE;
    bus.emit(EV.DIZZY, true);
    this.flash(S.dizzy, '#c58cff');
  }

  private updateDizzy(real: number): void {
    if (this.dizzyTimer <= 0) return;
    this.dizzyTimer -= real;
    const cam = this.cameras.main;
    if (!this.debug) cam.setZoom(ZOOM + Math.sin(this.dizzyTimer * 9) * 0.08);
    if (this.dizzyTimer <= 0) {
      this.timeScale = 1;
      this.bunny.speedMult = 1;
      this.tweens.timeScale = 1;
      if (!this.debug) cam.setZoom(ZOOM);
      bus.emit(EV.DIZZY, false);
    }
  }

  private onCaught(by: Farmer): void {
    if (this.bunny.invulnTimer > 0) return;
    sfx.play('caught');
    this.cameras.main.shake(300, 0.015);
    this.flash(S.caught, '#ff5b5b');
    this.bunny.wriggleFree();
    by.stun(2.5);
    this.fieldTime = 0;
    this.loseLife();
  }

  private loseLife(): void {
    this.lives--;
    this.multIndex = 0;
    this.comboTimer = 0;
    bus.emit(EV.LIVES, this.lives);
    bus.emit(EV.SCORE, this.score, MULTIPLIERS[0]);
    if (this.lives <= 0) this.gameOver();
  }

  private flash(text: string, color: string): void {
    bus.emit(EV.MESSAGE, text, color);
  }

  private gameOver(): void {
    this.over = true;
    sfx.play('gameover');
    const hs = readHighScore();
    const record = this.score > hs.score;
    if (record) {
      try {
        localStorage.setItem(HIGHSCORE_KEY, JSON.stringify({ score: this.score, seed: this.level.seed, date: new Date().toISOString() }));
      } catch {
        /* ignore */
      }
    }
    this.time.delayedCall(900, () => {
      this.scene.launch('GameOver', { score: this.score, record, seed: this.level.seed, carrots: this.carrotsEaten, best: Math.max(hs.score, this.score) });
    });
  }
}
