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
    const st = (size: number, color = '#ffffff') => ({ fontFamily: FONT, fontSize: `${size}px`, color, stroke: '#1b2a1b', strokeThickness: Math.max(4, size / 5) });
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x000000, 0.65).setOrigin(0);
    const panel = this.add.container(cx, GAME_H / 2);
    panel.add(this.add.rectangle(0, 0, 640, 440, 0x2f5a28, 1).setStrokeStyle(6, 0xf0e2c2));
    panel.add(this.add.text(0, -170, S.gameOver, st(30)).setOrigin(0.5));
    panel.add(this.add.text(0, -100, `${S.score}: ${data.score}`, st(24, '#f7e04a')).setOrigin(0.5));
    panel.add(this.add.text(0, -55, `${S.carrotsEaten}: ${data.carrots}`, st(14, '#f28b26')).setOrigin(0.5));
    if (data.record) {
      const t = this.add.text(0, -10, S.newRecord, st(20, '#7de08a')).setOrigin(0.5);
      panel.add(t);
      this.tweens.add({ targets: t, scale: 1.15, duration: 400, yoyo: true, repeat: -1 });
    } else {
      panel.add(this.add.text(0, -10, `${S.highScore}: ${data.best}`, st(14, '#d8d2c6')).setOrigin(0.5));
    }
    panel.add(this.add.text(0, 30, `${S.seed}: ${data.seed}`, st(10, '#d8d2c6')).setOrigin(0.5));

    const btn = (y: number, label: string, onClick: () => void) => {
      const r = this.add.rectangle(0, y, 360, 60, 0xf28b26).setStrokeStyle(4, 0x1b2a1b).setInteractive({ useHandCursor: true });
      const t = this.add.text(0, y, label, st(14, '#1b2a1b')).setOrigin(0.5);
      r.on('pointerover', () => r.setFillStyle(0xffa64d));
      r.on('pointerout', () => r.setFillStyle(0xf28b26));
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
