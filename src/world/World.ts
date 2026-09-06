import { TILE } from '../config';
import type { LevelData, Pt } from '../gen/LevelData';

/** Thin query layer over LevelData in tile and pixel space. */
export class World {
  readonly w: number;
  readonly h: number;
  constructor(public readonly level: LevelData) {
    this.w = level.width;
    this.h = level.height;
  }
  idx(tx: number, ty: number): number {
    return ty * this.w + tx;
  }
  inBounds(tx: number, ty: number): boolean {
    return tx >= 0 && ty >= 0 && tx < this.w && ty < this.h;
  }
  isWalkable(tx: number, ty: number): boolean {
    return this.inBounds(tx, ty) && this.level.walkable[this.idx(tx, ty)] === 1;
  }
  isCarrotField(tx: number, ty: number): boolean {
    return this.inBounds(tx, ty) && this.level.carrotField[this.idx(tx, ty)] === 1;
  }
  plotAt(tx: number, ty: number): number {
    return this.inBounds(tx, ty) ? this.level.plotOf[this.idx(tx, ty)] : -1;
  }
  tileOf(px: number, py: number): Pt {
    return { x: Math.floor(px / TILE), y: Math.floor(py / TILE) };
  }
  center(tx: number, ty: number): Pt {
    return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
  }
}
