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
    this.cameras.main.setBackgroundColor('#f4ecd9');
    const g = this.add.graphics();
    // A quiet illustrated landscape, framed like a page in a storybook.
    g.fillStyle(0xe5e8d4).fillRoundedRect(24, 24, GAME_W - 48, GAME_H - 48, 30);
    g.fillStyle(0xf8df9b).fillCircle(1050, 132, 58);
    g.fillStyle(0xfff9eb, .8);
    for (const [x, y, r] of [[140, 110, 25], [176, 100, 35], [217, 112, 24], [875, 80, 20], [907, 74, 27], [940, 83, 19]]) g.fillCircle(x, y, r);
    g.fillStyle(0xc0cba3).fillEllipse(290, 540, 1050, 480);
    g.fillStyle(0xa5b787).fillEllipse(1090, 620, 1150, 600);
    g.fillStyle(0x8fa675).fillEllipse(330, 770, 1300, 610);
    // Winding cream path into the little farm.
    g.fillStyle(0xe8d5ad).beginPath().moveTo(510, 696).lineTo(790, 696)
      .lineTo(1000, 500).lineTo(1050, 404).lineTo(1028, 404).lineTo(934, 510).closePath().fillPath();
    g.fillStyle(0xc17b60).fillRoundedRect(1000, 327, 128, 97, 5);
    g.fillStyle(0x895447).fillTriangle(982, 332, 1064, 270, 1146, 332);
    g.fillStyle(0xfff3d9).fillRect(1050, 366, 30, 58).fillRect(1016, 351, 20, 23).fillRect(1092, 351, 20, 23);
    g.lineStyle(3, 0xc17b60).lineBetween(1050, 366, 1080, 424).lineBetween(1080, 366, 1050, 424);
    for (const [x, y, scale] of [[140, 390, 2.1], [220, 450, 1.7], [1150, 490, 1.8]]) {
      g.fillStyle(0x806a4d).fillRoundedRect(x - 6, y, 12, 65, 5);
      g.fillStyle(0x597a56).fillCircle(x - 20, y, 23 * scale).fillCircle(x + 20, y - 12, 21 * scale);
      g.fillStyle(0x739063).fillCircle(x, y - 32, 24 * scale);
      g.fillStyle(0x99ae77).fillEllipse(x - 12, y - 46, 40 * scale, 25 * scale);
    }
    // Paper title card keeps the typography readable against the scenery.
    g.fillStyle(0x52664c, .13).fillRoundedRect(cx - 365, 71, 730, 244, 28);
    g.fillStyle(0xfff8e8).fillRoundedRect(cx - 365, 65, 730, 244, 28);
    g.lineStyle(2, 0xd6c5a4).strokeRoundedRect(cx - 353, 77, 706, 220, 21);
    this.add.text(cx, 110, S.eyebrow, { fontFamily: FONT, fontSize: '17px', color: '#917455', letterSpacing: 3 }).setOrigin(.5);
    this.add.text(cx, 181, S.title, { fontFamily: FONT, fontSize: '88px', fontStyle: 'bold', color: '#3f604c' }).setOrigin(.5);
    this.add.text(cx, 258, S.tagline, { fontFamily: FONT, fontSize: '25px', color: '#80694f' }).setOrigin(.5);

    const bunny = this.add.image(cx - 265, 434, 'bunny_big', 2).setScale(.72);
    this.tweens.add({ targets: bunny, y: 421, angle: -3, duration: 650, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    const farmer = this.add.image(cx + 230, 444, 'farmer_big', 2).setScale(.53).setFlipX(true);
    this.tweens.add({ targets: farmer, angle: 2, duration: 950, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    g.fillStyle(0x435d43, .18).fillRoundedRect(cx - 176, 362, 352, 82, 24);
    const button = this.add.graphics();
    const paint = (color: number) => button.clear().fillStyle(color).fillRoundedRect(cx - 176, 356, 352, 82, 24);
    paint(0x3f604c);
    const hit = this.add.rectangle(cx, 397, 352, 82, 0xffffff, 0).setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => paint(0x52765b));
    hit.on('pointerout', () => paint(0x3f604c));
    this.add.text(cx, 397, S.pressToStart, { fontFamily: FONT, fontSize: '32px', color: '#fff5df' }).setOrigin(.5);
    const hs = readHighScore();
    if (hs.score > 0) this.add.text(cx, 473, `${S.highScore}: ${hs.score}`, { fontFamily: FONT, fontSize: '23px', color: '#344d40' }).setOrigin(.5);
    for (let i = 0; i < 10; i++) {
      const x = 70 + i * 123;
      const y = 555 + (i % 3) * 24;
      this.add.image(x, y, 'items', 'carrot').setScale(.9).setAngle((i % 3 - 1) * 18);
    }
    g.fillStyle(0xfff5df, .93).fillRoundedRect(200, GAME_H - 91, GAME_W - 400, 48, 20);
    this.add.text(cx, GAME_H - 67, S.controlsHint, { fontFamily: FONT, fontSize: '18px', color: '#435d43' }).setOrigin(.5);

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
