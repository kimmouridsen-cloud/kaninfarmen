import Phaser from 'phaser';
import { buildSmoothTextures } from '../world/SmoothArt';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    buildSmoothTextures(this);
    this.scene.start('Menu');
  }
}
