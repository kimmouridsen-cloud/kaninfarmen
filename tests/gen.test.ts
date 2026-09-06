import { describe, expect, it } from 'vitest';
import { generateLevel, floodFill } from '../src/gen/generator';
import { idx } from '../src/gen/LevelData';
import { O } from '../src/world/TileType';

const SEEDS = ['gulerod-1234', 'kanin-42', 'bonde-7', 'mark-999', 'hegn-1', 'ko-2', 'gris-3', 'eng-4', 'sol-5', 'regn-6'];

describe('generateLevel', () => {
  it('is deterministic for a fixed seed', () => {
    const a = generateLevel('kanin-42');
    const b = generateLevel('kanin-42');
    expect(Array.from(a.ground)).toEqual(Array.from(b.ground));
    expect(Array.from(a.objects)).toEqual(Array.from(b.objects));
    expect(a.spawn).toEqual(b.spawn);
  });

  for (const seed of SEEDS) {
    it(`seed ${seed}: constraints hold`, () => {
      const lvl = generateLevel(seed);
      const W = lvl.width;
      const carrotPlots = lvl.plots.filter((p) => p.type === 'carrot');
      expect(carrotPlots.length).toBeGreaterThanOrEqual(3);
      expect(carrotPlots.length).toBeLessThanOrEqual(6);
      expect(lvl.plots.filter((p) => p.type === 'farmyard').length).toBe(1);
      expect(lvl.plots.filter((p) => p.type === 'pond').length).toBeLessThanOrEqual(1);

      // spawn is walkable and everything important is reachable
      expect(lvl.walkable[idx(lvl.spawn.x, lvl.spawn.y, W)]).toBe(1);
      const reach = floodFill(lvl.walkable, lvl.spawn);
      for (const p of carrotPlots) {
        expect(p.gates.length).toBeGreaterThan(0);
        expect(p.gates.some((g) => reach[idx(g.x, g.y, W)])).toBe(true);
      }
      expect(reach[idx(lvl.farmerHome.x, lvl.farmerHome.y, W)]).toBe(1);
      for (const c of lvl.carrots) expect(reach[idx(c.x, c.y, W)]).toBe(1);
      expect(lvl.carrots.filter((c) => !c.field).length).toBeGreaterThan(40);

      // No dead ends on walkable path tiles outside plots: every corridor tile has >= 2 walkable neighbours
      let deadEnds = 0;
      for (let y = 1; y < W - 1; y++)
        for (let x = 1; x < W - 1; x++) {
          const i = idx(x, y, W);
          if (!lvl.walkable[i] || lvl.plotOf[i] !== -1) continue;
          const n = [i - W, i + W, i - 1, i + 1].filter((j) => lvl.walkable[j]).length;
          if (n < 2) deadEnds++;
        }
      expect(deadEnds).toBe(0);

      // Fence masks are consistent: a fence tile with mask bit N must have a fence/gate to the north
      for (let y = 1; y < W - 1; y++)
        for (let x = 1; x < W - 1; x++) {
          const o = lvl.objects[idx(x, y, W)];
          if (o < O.FENCE_BASE || o > O.FENCE_BASE + 15) continue;
          const mask = o - O.FENCE_BASE;
          const isF = (j: number) => (lvl.objects[j] >= O.FENCE_BASE && lvl.objects[j] <= O.FENCE_BASE + 15) || lvl.objects[j] === O.GATE;
          expect(!!(mask & 1)).toBe(isF(idx(x, y - 1, W)));
          expect(!!(mask & 2)).toBe(isF(idx(x + 1, y, W)));
          expect(!!(mask & 4)).toBe(isF(idx(x, y + 1, W)));
          expect(!!(mask & 8)).toBe(isF(idx(x - 1, y, W)));
        }
    });
  }
});
