import type { AnimalKind, PlotType } from '../world/TileType';

export interface Pt {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Plot extends Rect {
  id: number;
  type: PlotType;
  gates: Pt[];
}

export interface CarrotSpawn extends Pt {
  field: boolean; // true = inside a carrot field (worth more, summons farmer)
  plot: number; // plot id or -1
}

export interface AnimalSpawn extends Pt {
  kind: AnimalKind;
  plot: number;
}

export interface LevelData {
  seed: string;
  width: number;
  height: number;
  ground: Int16Array;
  objects: Int16Array;
  decor: Int16Array;
  /** 1 = bunny/farmer may stand here */
  walkable: Uint8Array;
  /** plot id per tile (including its fence ring), -1 = path/border */
  plotOf: Int16Array;
  /** 1 = tile is a carrot-field interior */
  carrotField: Uint8Array;
  plots: Plot[];
  carrots: CarrotSpawn[];
  clovers: Pt[];
  animals: AnimalSpawn[];
  /** walkable tiles outside plots (the path network) */
  pathTiles: Pt[];
  spawn: Pt & { dir: Pt };
  farmerHome: Pt;
  attempts: number;
}

export function idx(x: number, y: number, w: number): number {
  return y * w + x;
}
