import Phaser from 'phaser';
import { TILE } from '../config';
import type { LevelData } from '../gen/LevelData';

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
  const map = scene.make.tilemap({ tileWidth: TILE, tileHeight: TILE, width: level.width, height: level.height });
  const tileset = map.addTilesetImage(tilesetKey, tilesetKey, TILE, TILE, 0, 0)!;
  const ground = map.createBlankLayer('ground', tileset)!;
  const decor = map.createBlankLayer('decor', tileset)!;
  const objects = map.createBlankLayer('objects', tileset)!;
  ground.putTilesAt(to2D(level.ground, level.width, level.height), 0, 0);
  decor.putTilesAt(to2D(level.decor, level.width, level.height), 0, 0);
  objects.putTilesAt(to2D(level.objects, level.width, level.height), 0, 0);
  ground.setDepth(0);
  decor.setDepth(1);
  objects.setDepth(2);
  return { map, ground, objects, decor };
}
