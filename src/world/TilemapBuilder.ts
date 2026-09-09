import Phaser from 'phaser';
import { ART_PX, ART_SCALE } from '../config';
import type { LevelData } from '../gen/LevelData';
import { TILE_MARGIN, TILE_SPACING } from './SmoothArt';

export interface BuiltMap {
  map: Phaser.Tilemaps.Tilemap;
  ground: Phaser.Tilemaps.TilemapLayer;
  objects: Phaser.Tilemaps.TilemapLayer;
  decor: Phaser.Tilemaps.TilemapLayer;
}

function to2D(arr: Int16Array, w: number, h: number): number[][] {
  const rows: number[][] = new Array(h);
  for (let y = 0; y < h; y++) {
    const row: number[] = new Array(w);
    for (let x = 0; x < w; x++) row[x] = arr[y * w + x];
    rows[y] = row;
  }
  return rows;
}

export function buildTilemap(scene: Phaser.Scene, level: LevelData, tilesetKey = 'tiles'): BuiltMap {
  // Tiles are drawn at ART_PX and the layers scaled down to the 16 px world (smooth look).
  const map = scene.make.tilemap({ tileWidth: ART_PX, tileHeight: ART_PX, width: level.width, height: level.height });
  const tileset = map.addTilesetImage(tilesetKey, tilesetKey, ART_PX, ART_PX, TILE_MARGIN, TILE_SPACING)!;
  const ground = map.createBlankLayer('ground', tileset)!;
  const decor = map.createBlankLayer('decor', tileset)!;
  const objects = map.createBlankLayer('objects', tileset)!;
  ground.putTilesAt(to2D(level.ground, level.width, level.height), 0, 0);
  decor.putTilesAt(to2D(level.decor, level.width, level.height), 0, 0);
  objects.putTilesAt(to2D(level.objects, level.width, level.height), 0, 0);
  ground.setDepth(0).setScale(ART_SCALE);
  decor.setDepth(1).setScale(ART_SCALE);
  objects.setDepth(2).setScale(ART_SCALE);
  return { map, ground, objects, decor };
}
