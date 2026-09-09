import Phaser from 'phaser';
import { GAME_H, GAME_W } from '../config';
import { randomSeed } from '../gen/rng';
import { S } from '../i18n/da';
import { sfx } from '../systems/audio';
import { FONT } from '../ui/style';

interface GameOverData {
  score: number;
  record: boolean;
  seed: string;
  carrots: number;
  best: number;
}

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOver');
  }

  create(data: GameOverData): void {
    const cx = GAME_W / 2;
    const st = (size: number, color = '#344d40') => ({ fontFamily: FONT, fontSize: `${size}px`, fontStyle: 'bold', color, strokeThickness: 0 });
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x000000, 0.55).setOrigin(0);
    const panel = this.add.container(cx, GAME_H / 2);
    panel.add(this.add.graphics().fillStyle(0xfff5df, 1).fillRoundedRect(-320, -220, 640, 440, 28).lineStyle(6, 0xf0e2c2, 1).strokeRoundedRect(-320, -220, 640, 440, 28));
    panel.add(this.add.text(0, -170, S.gameOver, st(52)).setOrigin(0.5));
    panel.add(this.add.text(0, -100, `${S.score}: ${data.score}`, st(38, '#92502f')).setOrigin(0.5));
    panel.add(this.add.text(0, -55, `${S.carrotsEaten}: ${data.carrots}`, st(24, '#92502f')).setOrigin(0.5));
    if (data.record) {
      const t = this.add.text(0, -10, S.newRecord, st(32, '#527452')).setOrigin(0.5);
      panel.add(t);
      this.tweens.add({ targets: t, scale: 1.15, duration: 400, yoyo: true, repeat: -1 });
    } else {
      panel.add(this.add.text(0, -10, `${S.highScore}: ${data.best}`, st(24, '#726455')).setOrigin(0.5));
    }
    panel.add(this.add.text(0, 30, `${S.seed}: ${data.seed}`, st(18, '#726455')).setOrigin(0.5));

    const btn = (y: number, label: string, onClick: () => void) => {
      const r = this.add.rectangle(0, y, 380, 62, 0xdfa16a, 0.001).setInteractive({ useHandCursor: true });
      const gfx = this.add.graphics();
      const paint = (c: number) => gfx.clear().fillStyle(c, 1).fillRoundedRect(-190, y - 31, 380, 62, 20).lineStyle(4, 0x94775b, 1).strokeRoundedRect(-190, y - 31, 380, 62, 20);
      paint(0xdfa16a);
      const t = this.add.text(0, y, label, { ...st(24, '#1b2a1b'), strokeThickness: 0 }).setOrigin(0.5);
      r.on('pointerover', () => paint(0xedba83));
      r.on('pointerout', () => paint(0xdfa16a));
      panel.add(gfx);
      r.on('pointerdown', onClick);
      panel.add([r, t]);
    };
    const restart = (seed: string) => {
      sfx.play('start');
      this.scene.stop('GameOver');
      this.scene.stop('Hud');
      this.scene.get('Game').scene.restart({ seed });
    };
    btn(100, S.playAgain, () => restart(randomSeed()));
    btn(170, `${S.playAgain} (${S.seed.toLowerCase()} ${data.seed})`, () => restart(data.seed));
    this.input.keyboard?.once('keydown-SPACE', () => restart(randomSeed()));
    this.input.keyboard?.once('keydown-ENTER', () => restart(randomSeed()));

    panel.setScale(0.7).setAlpha(0);
    this.tweens.add({ targets: panel, scale: 1, alpha: 1, duration: 300, ease: 'Back.out' });
  }
}
