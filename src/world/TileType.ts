/**
 * Tile ids. All three tilemap layers share one tileset image, so ids are global
 * tileset indices. Ground 0..15, objects 16..47, decor 48..63.
 * Index -1 = empty tile.
 */
export const EMPTY = -1;

export const G = {
  GRASS: 0,
  PATH: 1,
  SOIL: 2,
  CARROT_SOIL: 3,
  WATER: 4,
  PEN: 5,
  YARD: 6,
  MEADOW: 7,
  FOREST_FLOOR: 8,
  GRASS2: 9,
  PATH2: 10,
  WATER_EDGE: 11,
  SOIL2: 12,
} as const;

export const O = {
  FENCE_BASE: 16, // 16..31 = fence with 4-bit neighbour mask (N=1, E=2, S=4, W=8)
  GATE: 32,
  TREE: 33,
  HEDGE: 34,
  HOUSE_WALL: 35,
  HOUSE_ROOF: 36,
  BARN_WALL: 37,
  BARN_ROOF: 38,
  ROCK: 39,
  BUSH: 40,
  HOUSE_DOOR: 41,
  TROUGH: 42,
  BARN_DOOR: 43,
  TREE2: 44,
} as const;

export const D = {
  FLOWER1: 48,
  FLOWER2: 49,
  WHEAT: 50,
  CORN: 51,
  CABBAGE: 52,
  TUFT: 53,
  PUMPKIN: 54,
  FLOWER3: 55,
  STONES: 56,
} as const;

export const TILESET_COLS = 8;
export const TILESET_ROWS = 8;

/** Objects that physically block movement. */
export function isSolidObject(id: number): boolean {
  return id >= O.FENCE_BASE && id !== O.GATE && id <= O.TREE2 && id !== O.TROUGH;
}

export type PlotType =
  | 'carrot'
  | 'wheat'
  | 'corn'
  | 'cabbage'
  | 'pumpkin'
  | 'cows'
  | 'pigs'
  | 'chickens'
  | 'sheep'
  | 'pond'
  | 'farmyard'
  | 'meadow';

export type AnimalKind = 'cow' | 'pig' | 'chicken' | 'sheep';
