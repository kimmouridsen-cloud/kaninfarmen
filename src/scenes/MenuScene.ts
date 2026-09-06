import Phaser from 'phaser';
import { GAME_H, GAME_W, HIGHSCORE_KEY } from '../config';
import { randomSeed } from '../gen/rng';
import { S } from '../i18n/da';
import { sfx } from '../systems/audio';
import { FONT } from '../ui/style';

export function readHighScore(): { score: number; seed: string } {
  try {
    const raw = localStorage.getItem(HIGHSCORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return { score: 0, seed: '' };
}

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create(): void {
    const cx = GAME_W / 2;
    this.cameras.main.setBackgroundColor('#2f5a28');

    // decorative carrots
    for (let i = 0; i < 14; i++) {
      const img = this.add.image(Phaser.Math.Between(40, GAME_W - 40), Phaser.Math.Between(40, GAME_H - 40), 'items', 'carrot').setScale(4).setAlpha(0.18);
      this.tweens.add({ targets: img, angle: Phaser.Math.Between(-20, 20), duration: Phaser.Math.Between(1500, 3000), yoyo: true, repeat: -1 });
    }
    const bunny = this.add.image(cx - 330, 300, 'bunny', 4).setScale(9);
    this.tweens.add({ targets: bunny, y: 286, duration: 350, yoyo: true, repeat: -1, ease: 'Quad.out' });
    const farmer = this.add.image(cx + 330, 300, 'farmer', 4).setScale(7).setFlipX(true);
    this.tweens.add({ targets: farmer, x: cx + 320, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    this.add.text(cx, 140, S.title, { fontFamily: FONT, fontSize: '56px', color: '#ffffff', stroke: '#1b2a1b', strokeThickness: 10 }).setOrigin(0.5);
    this.add.text(cx, 230, S.tagline, { fontFamily: FONT, fontSize: '18px', color: '#f7e04a', stroke: '#1b2a1b', strokeThickness: 6 }).setOrigin(0.5);

    const start = this.add
      .text(cx, 380, S.pressToStart, { fontFamily: FONT, fontSize: '26px', color: '#ffffff', stroke: '#1b2a1b', strokeThickness: 8 })
      .setOrigin(0.5);
    this.tweens.add({ targets: start, scale: 1.08, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    const hs = readHighScore();
    if (hs.score > 0) {
      this.add.text(cx, 470, `${S.highScore}: ${hs.score}`, { fontFamily: FONT, fontSize: '20px', color: '#f28b26', stroke: '#1b2a1b', strokeThickness: 6 }).setOrigin(0.5);
    }
    this.add.text(cx, GAME_H - 60, S.controlsHint, { fontFamily: FONT, fontSize: '12px', color: '#d8d2c6', stroke: '#1b2a1b', strokeThickness: 4 }).setOrigin(0.5);

    const seedParam = new URLSearchParams(location.search).get('seed');
    const begin = () => {
      sfx.unlock();
      sfx.play('start');
      this.scene.start('Game', { seed: seedParam || randomSeed() });
    };
    this.input.once('pointerdown', begin);
    this.input.keyboard?.once('keydown', begin);
  }
}
