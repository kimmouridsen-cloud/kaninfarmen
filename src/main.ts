import Phaser from 'phaser';
import { GAME_H, GAME_W } from './config';
import { BootScene } from './scenes/BootScene';
import { GameOverScene } from './scenes/GameOverScene';
import { GameScene } from './scenes/GameScene';
import { HudScene } from './scenes/HudScene';
import { MenuScene } from './scenes/MenuScene';

const useCanvas = new URLSearchParams(location.search).get('canvas') === '1';

const boot = () =>
  ((window as unknown as { __phaser: Phaser.Game }).__phaser = new Phaser.Game({
  type: useCanvas ? Phaser.CANVAS : Phaser.AUTO,
  parent: 'game',
  width: GAME_W,
  height: GAME_H,
  backgroundColor: '#344d40',
  pixelArt: false,
  roundPixels: false,
  antialias: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: { activePointers: 3 },
  scene: [BootScene, MenuScene, GameScene, HudScene, GameOverScene],
  }));

// Wait for the UI font so text is measured correctly; never block the game on it.
const ready = document.fonts ? document.fonts.load('bold 16px "Fredoka"').catch(() => undefined) : Promise.resolve();
Promise.race([ready, new Promise((r) => setTimeout(r, 1500))]).then(boot);
