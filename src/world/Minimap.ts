import Phaser from 'phaser';
import type { LevelData, Pt } from '../gen/LevelData';
import { G, O } from './TileType';

const SCALE = 1.5;

/** HUD minimap drawn into a small canvas texture, one pixel per tile. */
export class Minimap {
  readonly container: Phaser.GameObjects.Container;
  private tex: Phaser.Textures.CanvasTexture;
  private img: Phaser.GameObjects.Image;
  private bunnyDot: Phaser.GameObjects.Arc;
  private farmerDots: Phaser.GameObjects.Arc[] = [];
  private dirty = false;

  constructor(scene: Phaser.Scene, private level: LevelData, x: number, y: number) {
    const w = level.width;
    const h = level.height;
    const key = `minimap-${Math.random().toString(36).slice(2)}`;
    this.tex = scene.textures.createCanvas(key, w, h)!;
    this.tex.context.fillStyle = '#10141c';
    this.tex.context.fillRect(0, 0, w, h);
    this.tex.refresh();

    const frame = scene.add.graphics().fillStyle(0x1b2a1b, 0.55).fillRoundedRect(-4, -4, w * SCALE + 16, h * SCALE + 16, 12).lineStyle(3, 0xf0e2c2, 0.8).strokeRoundedRect(-4, -4, w * SCALE + 16, h * SCALE + 16, 12);
    this.img = scene.add.image(4, 4, key).setOrigin(0).setScale(SCALE);
    this.bunnyDot = scene.add.circle(0, 0, 2.5, 0xffffff).setStrokeStyle(1, 0x000000);
    for (let i = 0; i < 6; i++) this.farmerDots.push(scene.add.circle(0, 0, 2.5, 0xff3b3b).setStrokeStyle(1, 0x000000).setVisible(false));
    this.container = scene.add.container(x, y, [frame, this.img, this.bunnyDot, ...this.farmerDots]);
  }

  markSeen(tiles: Pt[]): void {
    if (!tiles.length) return;
    const ctx = this.tex.context;
    const w = this.level.width;
    for (const t of tiles) {
      const i = t.y * w + t.x;
      ctx.fillStyle = this.colorFor(this.level.ground[i], this.level.objects[i], this.level.carrotField[i] === 1);
      ctx.fillRect(t.x, t.y, 1, 1);
    }
    this.dirty = true;
  }

  private colorFor(g: number, o: number, carrot: boolean): string {
    if (o === O.TREE || o === O.TREE2 || o === O.HEDGE || o === O.BUSH) return '#2f5a28';
    if (o >= O.FENCE_BASE && o <= O.FENCE_BASE + 15) return '#7a4f2a';
    if (o === O.HOUSE_ROOF || o === O.HOUSE_WALL || o === O.HOUSE_DOOR) return '#c8463a';
    if (o === O.BARN_ROOF || o === O.BARN_WALL || o === O.BARN_DOOR) return '#8a3a30';
    if (carrot) return '#f28b26';
    switch (g) {
      case G.PATH:
      case G.PATH2:
        return '#d8b87f';
      case G.WATER:
      case G.WATER_EDGE:
        return '#3f86c9';
      case G.SOIL:
      case G.SOIL2:
        return '#8c5c34';
      case G.PEN:
        return '#a3784c';
      case G.YARD:
        return '#d6c39a';
      case G.MEADOW:
        return '#7cc45c';
      case G.FOREST_FLOOR:
        return '#2f5a28';
      default:
        return '#5fa646';
    }
  }

  update(bunny: Pt, farmers: Pt[]): void {
    if (this.dirty) {
      this.tex.refresh();
      this.dirty = false;
    }
    this.bunnyDot.setPosition(4 + bunny.x * SCALE, 4 + bunny.y * SCALE);
    this.farmerDots.forEach((dot, i) => {
      const f = farmers[i];
      if (f) dot.setVisible(true).setPosition(4 + f.x * SCALE, 4 + f.y * SCALE);
      else dot.setVisible(false);
    });
  }

  destroy(): void {
    this.container.destroy();
    this.tex.destroy();
  }
}
