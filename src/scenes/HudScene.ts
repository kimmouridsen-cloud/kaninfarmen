import Phaser from 'phaser';
import { GAME_H, GAME_W } from '../config';
import type { LevelData, Pt } from '../gen/LevelData';
import { S } from '../i18n/da';
import { bus, EV } from '../systems/EventBus';
import { DIR, type GameInput } from '../systems/Input';
import { FONT } from '../ui/style';
import { Minimap } from '../world/Minimap';

interface HudData {
  level: LevelData;
  input: GameInput;
}

export class HudScene extends Phaser.Scene {
  private hearts!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private multText!: Phaser.GameObjects.Text;
  private carrotText!: Phaser.GameObjects.Text;
  private message!: Phaser.GameObjects.Text;
  private alarmBar!: Phaser.GameObjects.Rectangle;
  private alarmBg!: Phaser.GameObjects.Container;
  private dizzyOverlay!: Phaser.GameObjects.Rectangle;
  private dizzyText!: Phaser.GameObjects.Text;
  private chaseText!: Phaser.GameObjects.Text;
  private boostText!: Phaser.GameObjects.Text;
  private minimap!: Minimap;
  private msgTween: Phaser.Tweens.Tween | null = null;

  constructor() {
    super('Hud');
  }

  create(data: HudData): void {
    const st = (size: number, color = '#ffffff') => ({ fontFamily: FONT, fontSize: `${size}px`, fontStyle: 'bold', color, stroke: '#344d40', strokeThickness: 3 });

    // soft vignette + rounded panels give the smooth look some depth
    this.add.image(GAME_W / 2, GAME_H / 2, 'vignette').setDisplaySize(GAME_W, GAME_H).setAlpha(0.24);
    const panel = (x: number, y: number, w: number, h: number) =>
      this.add.graphics().fillStyle(0x344d40, 0.12).fillRoundedRect(x, y + 4, w, h, 18).fillStyle(0xfff5df, 0.96).fillRoundedRect(x, y, w, h, 18).lineStyle(2, 0xd6c5a4, 1).strokeRoundedRect(x, y, w, h, 18);
    panel(12, 12, 250, 150);

    this.hearts = this.add.text(28, 18, '', { ...st(34, '#bd705d'), strokeThickness: 0, fontFamily: 'Arial, sans-serif' });
    this.scoreText = this.add.text(28, 62, '0', { ...st(42, '#344d40'), strokeThickness: 0 });
    this.multText = this.add.text(150, 70, '', { ...st(30, '#92502f'), strokeThickness: 0 }).setVisible(false);
    this.carrotText = this.add.text(28, 120, '', { ...st(20, '#92502f'), strokeThickness: 0 });

    this.minimap = new Minimap(this, data.level, GAME_W - 176, 12);

    this.message = this.add.text(GAME_W / 2, GAME_H * 0.3, '', st(56)).setOrigin(0.5).setAlpha(0);

    // carrot-field alarm bar
    const barW = 320;
    const bg = this.add.graphics().fillStyle(0x000000, 0.55).fillRoundedRect(-barW / 2, -12, barW, 24, 12).lineStyle(3, 0xffffff, 0.8).strokeRoundedRect(-barW / 2, -12, barW, 24, 12);
    this.alarmBar = this.add.rectangle(-barW / 2 + 4, 0, 0, 16, 0xff5b5b).setOrigin(0, 0.5);
    const label = this.add.text(0, -30, S.farmerComing, st(22, '#ff9b9b')).setOrigin(0.5);
    this.alarmBg = this.add.container(GAME_W / 2, GAME_H - 60, [bg, this.alarmBar, label]).setVisible(false);

    this.dizzyOverlay = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x7a3cff, 0.22).setOrigin(0).setVisible(false);
    this.dizzyText = this.add.text(GAME_W / 2, 96, S.dizzy, st(32, '#e0c8ff')).setOrigin(0.5).setVisible(false);
    this.chaseText = this.add.text(GAME_W / 2, 52, S.farmerChasing, st(48, '#ff5b5b')).setOrigin(0.5).setVisible(false);
    this.tweens.add({ targets: this.chaseText, scale: 1.15, duration: 250, yoyo: true, repeat: -1 });

    this.boostText = this.add.text(GAME_W - 24, GAME_H - 20, S.boostReady, st(20, '#7de08a')).setOrigin(1, 1);

    this.buildTouchControls(data.input);

    bus.on(EV.LIVES, (n: number) => {
      this.hearts.setText('♥'.repeat(Math.max(0, n)) + '♡'.repeat(Math.max(0, 3 - n)));
      this.tweens.add({ targets: this.hearts, scale: 1.3, duration: 120, yoyo: true });
    });
    bus.on(EV.SCORE, (score: number, mult: number) => {
      this.scoreText.setText(String(score));
      this.multText.setVisible(mult > 1).setText(S.combo(mult));
      if (mult > 1) this.tweens.add({ targets: this.multText, scale: 1.4, duration: 100, yoyo: true });
    });
    bus.on(EV.CARROTS, (n: number, total: number) => this.carrotText.setText(`${S.carrotsEaten}: ${n}/${total}`));
    bus.on(EV.MESSAGE, (text: string, color: string) => this.showMessage(text, color));
    bus.on(EV.FIELD_ALARM, (f: number) => {
      this.alarmBg.setVisible(f >= 0);
      if (f >= 0) this.alarmBar.width = Math.max(0, (barW - 4) * f);
    });
    bus.on(EV.DIZZY, (on: boolean) => {
      this.dizzyOverlay.setVisible(on);
      this.dizzyText.setVisible(on);
    });
    bus.on(EV.FARMER, (chasing: boolean) => this.chaseText.setVisible(chasing));
    bus.on(EV.BOOST, (ready: boolean) => this.boostText.setVisible(ready));
    bus.on(EV.SEEN, (tiles: Pt[]) => this.minimap.markSeen(tiles));
    bus.on(EV.POSITIONS, (b: Pt, f: Pt[]) => this.minimap.update(b, f));
  }

  private showMessage(text: string, color: string): void {
    this.msgTween?.stop();
    this.message.setText(text).setColor(color).setAlpha(1).setScale(0.6);
    this.msgTween = this.tweens.add({
      targets: this.message,
      scale: 1,
      duration: 160,
      ease: 'Back.out',
      onComplete: () => {
        this.msgTween = this.tweens.add({ targets: this.message, alpha: 0, delay: 600, duration: 300 });
      },
    });
  }

  private buildTouchControls(input: GameInput): void {
    if (!this.sys.game.device.input.touch) return;
    const cx = 120;
    const cy = GAME_H - 120;
    const mk = (dx: number, dy: number, dir: Pt, glyph: string) => {
      const b = this.add
        .circle(cx + dx, cy + dy, 36, 0xffffff, 0.22)
        .setStrokeStyle(3, 0xffffff, 0.5)
        .setInteractive({ useHandCursor: true });
      this.add.text(cx + dx, cy + dy, glyph, { fontFamily: 'Arial, sans-serif', fontSize: '28px', color: '#ffffff' }).setOrigin(0.5).setAlpha(0.8);
      b.on('pointerdown', () => {
        input.pressDir(dir);
        b.setFillStyle(0xffffff, 0.45);
      });
      b.on('pointerup', () => b.setFillStyle(0xffffff, 0.22));
      b.on('pointerout', () => b.setFillStyle(0xffffff, 0.22));
    };
    mk(0, -70, DIR.UP, '▲');
    mk(0, 70, DIR.DOWN, '▼');
    mk(-70, 0, DIR.LEFT, '◀');
    mk(70, 0, DIR.RIGHT, '▶');
  }
}
