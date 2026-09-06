import Phaser from 'phaser';
import { buildPlaceholderTextures } from '../world/PlaceholderArt';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    buildPlaceholderTextures(this);
    this.scene.start('Menu');
  }
}
