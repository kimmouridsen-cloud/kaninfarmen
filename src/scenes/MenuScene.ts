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
    this.cameras.main.setBackgroundColor('#5fb2e6');
    // sky → grass gradient backdrop
    const g = this.add.graphics();
    g.fillGradientStyle(0x6fc0f0, 0x6fc0f0, 0xbfe6ff, 0xbfe6ff, 1).fillRect(0, 0, GAME_W, GAME_H * 0.62);
    g.fillStyle(0x79c651, 1).fillEllipse(GAME_W / 2, GAME_H * 0.62 + 260, GAME_W * 1.6, 620);
    g.fillStyle(0x6fbb48, 1).fillEllipse(GAME_W / 2 + 200, GAME_H * 0.62 + 330, GAME_W * 1.2, 520);
    for (const [x, y, r] of [[180, 110, 46], [240, 96, 60], [310, 116, 44], [980, 150, 40], [1040, 132, 56], [1100, 152, 42]] as [number, number, number][])
      g.fillStyle(0xffffff, 0.9).fillCircle(x, y, r);

    // decorative carrots
    for (let i = 0; i < 14; i++) {
      const img = this.add.image(Phaser.Math.Between(40, GAME_W - 40), Phaser.Math.Between(GAME_H * 0.55, GAME_H - 40), 'items', 'carrot').setScale(1.4).setAlpha(0.9);
      this.tweens.add({ targets: img, angle: Phaser.Math.Between(-20, 20), duration: Phaser.Math.Between(1500, 3000), yoyo: true, repeat: -1 });
    }
    const bunny = this.add.image(cx - 330, 330, 'bunny_big', 2).setScale(0.85);
    this.tweens.add({ targets: bunny, y: 286, duration: 350, yoyo: true, repeat: -1, ease: 'Quad.out' });
    const farmer = this.add.image(cx + 330, 320, 'farmer_big', 2).setScale(0.7).setFlipX(true);
    this.tweens.add({ targets: farmer, x: cx + 320, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    this.add.text(cx, 140, S.title, { fontFamily: FONT, fontSize: '110px', fontStyle: 'bold', color: '#ffffff', stroke: '#2f6f2a', strokeThickness: 14, shadow: { offsetX: 0, offsetY: 8, color: '#00000055', blur: 12, fill: true } }).setOrigin(0.5);
    this.add.text(cx, 232, S.tagline, { fontFamily: FONT, fontSize: '30px', fontStyle: 'bold', color: '#fff3b0', stroke: '#2f6f2a', strokeThickness: 6 }).setOrigin(0.5);

    const start = this.add
      .text(cx, 400, S.pressToStart, { fontFamily: FONT, fontSize: '44px', fontStyle: 'bold', color: '#ffffff', stroke: '#2f6f2a', strokeThickness: 10 })
      .setOrigin(0.5);
    this.tweens.add({ targets: start, scale: 1.08, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    const hs = readHighScore();
    if (hs.score > 0) {
      this.add.text(cx, 480, `${S.highScore}: ${hs.score}`, { fontFamily: FONT, fontSize: '30px', fontStyle: 'bold', color: '#ffb050', stroke: '#2f6f2a', strokeThickness: 6 }).setOrigin(0.5);
    }
    this.add.text(cx, GAME_H - 50, S.controlsHint, { fontFamily: FONT, fontSize: '20px', fontStyle: 'bold', color: '#ffffff', stroke: '#2f6f2a', strokeThickness: 5 }).setOrigin(0.5);

    this.add.text(GAME_W - 12, GAME_H - 8, `build ${__BUILD__}`, { fontFamily: FONT, fontSize: '14px', color: '#ffffff' }).setOrigin(1, 1).setAlpha(0.7);

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
