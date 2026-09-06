// Usage: npx vite-node tests/dump.ts <seed>
import { generateLevel } from '../src/gen/generator';
import { idx } from '../src/gen/LevelData';
import { G, O } from '../src/world/TileType';

const seed = (globalThis as unknown as { process: { argv: string[] } }).process.argv[2] ?? 'kanin-42';
const l = generateLevel(seed);
const W = l.width;
const carrots = new Set(l.carrots.map((c) => idx(c.x, c.y, W)));
const animals = new Set(l.animals.map((c) => idx(c.x, c.y, W)));
let out = '';
for (let y = 0; y < l.height; y++) {
  let row = '';
  for (let x = 0; x < W; x++) {
    const i = idx(x, y, W);
    const o = l.objects[i];
    const g = l.ground[i];
    let ch = '?';
    if (l.spawn.x === x && l.spawn.y === y) ch = 'B';
    else if (l.farmerHome.x === x && l.farmerHome.y === y) ch = 'F';
    else if (carrots.has(i)) ch = 'c';
    else if (animals.has(i)) ch = 'a';
    else if (o === O.GATE) ch = '=';
    else if (o >= O.FENCE_BASE && o <= O.FENCE_BASE + 15) ch = '#';
    else if (o === O.TREE || o === O.TREE2) ch = 'T';
    else if (o === O.HEDGE) ch = 'H';
    else if (o === O.BUSH) ch = 'b';
    else if (o === O.HOUSE_ROOF || o === O.HOUSE_WALL || o === O.HOUSE_DOOR) ch = 'h';
    else if (o === O.BARN_ROOF || o === O.BARN_WALL || o === O.BARN_DOOR) ch = 'L';
    else if (o === O.ROCK) ch = 'o';
    else if (o === O.TROUGH) ch = 'u';
    else if (g === G.PATH || g === G.PATH2) ch = '.';
    else if (g === G.CARROT_SOIL) ch = ':';
    else if (g === G.SOIL || g === G.SOIL2) ch = l.decor[i] >= 0 ? 'w' : ',';
    else if (g === G.WATER || g === G.WATER_EDGE) ch = '~';
    else if (g === G.PEN) ch = 'p';
    else if (g === G.YARD) ch = 'y';
    else if (g === G.MEADOW) ch = '*';
    else if (g === G.GRASS || g === G.GRASS2) ch = ' ';
    else if (g === G.FOREST_FLOOR) ch = 't';
    row += ch;
  }
  out += row + '\n';
}
console.log(out);
console.log('plots:', l.plots.map((p) => `${p.type}(${p.w}x${p.h})`).join(' '));
console.log('carrots', l.carrots.length, 'field', l.carrots.filter((c) => c.field).length, 'clovers', l.clovers.length, 'animals', l.animals.length, 'attempts', l.attempts);
