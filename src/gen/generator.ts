import { BORDER, MAP_H, MAP_W, RING_PATH_W } from '../config';
import { D, G, O, type AnimalKind, type PlotType } from '../world/TileType';
import { bsp } from './bsp';
import { idx, type AnimalSpawn, type CarrotSpawn, type LevelData, type Plot, type Pt, type Rect } from './LevelData';
import { Rng } from './rng';

const W = MAP_W;
const H = MAP_H;

const DIRS: Pt[] = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
];

interface Work {
  rng: Rng;
  ground: Int16Array;
  objects: Int16Array;
  decor: Int16Array;
  walkable: Uint8Array;
  plotOf: Int16Array;
  carrotField: Uint8Array;
  fence: Uint8Array; // 1 = fence or gate here (for autotiling)
  plots: Plot[];
  carrots: CarrotSpawn[];
  clovers: Pt[];
  animals: AnimalSpawn[];
  farmerHome: Pt;
}

/** Generate a farm. Retries with a derived seed if the balance checks fail. */
export function generateLevel(seed: string): LevelData {
  let s = seed;
  for (let attempt = 1; attempt <= 6; attempt++) {
    const lvl = tryGenerate(s, attempt);
    if (lvl) return lvl;
    s = `${seed}-r${attempt}`;
  }
  // Last resort: accept whatever comes out (should not happen in practice).
  return tryGenerate(`${seed}-final`, 7, true)!;
}

function tryGenerate(seed: string, attempt: number, force = false): LevelData | null {
  const rng = new Rng(seed);
  const n = W * H;
  const wk: Work = {
    rng,
    ground: new Int16Array(n).fill(G.GRASS),
    objects: new Int16Array(n).fill(-1),
    decor: new Int16Array(n).fill(-1),
    walkable: new Uint8Array(n),
    plotOf: new Int16Array(n).fill(-1),
    carrotField: new Uint8Array(n),
    fence: new Uint8Array(n),
    plots: [],
    carrots: [],
    clovers: [],
    animals: [],
    farmerHome: { x: 0, y: 0 },
  };

  placeBorder(wk);
  placeRingPath(wk);

  const interior: Rect = {
    x: BORDER + RING_PATH_W,
    y: BORDER + RING_PATH_W,
    w: W - 2 * (BORDER + RING_PATH_W),
    h: H - 2 * (BORDER + RING_PATH_W),
  };
  const { leaves, corridors } = bsp(rng, interior);
  for (const c of corridors) fillRect(wk, c, (x, y) => setPath(wk, x, y));

  assignPlotTypes(wk, leaves);
  for (const p of wk.plots) fillPlot(wk, p);
  autotileFences(wk);
  decorate(wk);
  placePathCarrots(wk);

  const spawn = pickSpawn(wk);
  if (!spawn && !force) return null;
  if (spawn) {
    // Nothing to pick up right where the bunny starts.
    const near = (p: Pt) => Math.abs(p.x - spawn.x) + Math.abs(p.y - spawn.y) <= 2;
    wk.carrots = wk.carrots.filter((c) => !near(c));
    wk.clovers = wk.clovers.filter((c) => !near(c));
  }

  const ok = validate(wk, spawn ?? { x: BORDER, y: BORDER, dir: DIRS[1] });
  if (!ok && !force) return null;

  return {
    seed,
    width: W,
    height: H,
    ground: wk.ground,
    objects: wk.objects,
    decor: wk.decor,
    walkable: wk.walkable,
    plotOf: wk.plotOf,
    carrotField: wk.carrotField,
    plots: wk.plots,
    carrots: wk.carrots,
    clovers: wk.clovers,
    animals: wk.animals,
    spawn: spawn ?? { x: BORDER, y: BORDER, dir: DIRS[1] },
    farmerHome: wk.farmerHome,
    attempts: attempt,
  };
}

// ---------------------------------------------------------------- helpers

function inBounds(x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < W && y < H;
}

function fillRect(wk: Work, r: Rect, fn: (x: number, y: number) => void): void {
  for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) fn(x, y);
}

function setPath(wk: Work, x: number, y: number): void {
  const i = idx(x, y, W);
  wk.ground[i] = wk.rng.chance(0.12) ? G.PATH2 : G.PATH;
  wk.walkable[i] = 1;
}

function placeBorder(wk: Work): void {
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const d = Math.min(x, y, W - 1 - x, H - 1 - y);
      if (d >= BORDER) continue;
      const i = idx(x, y, W);
      wk.ground[i] = G.FOREST_FLOOR;
      if (d === BORDER - 1) {
        wk.objects[i] = O.HEDGE; // continuous hedge line facing the ring path
      } else if (d === BORDER - 2) {
        wk.objects[i] = wk.rng.chance(0.6) ? (wk.rng.chance(0.5) ? O.TREE : O.TREE2) : O.BUSH;
      } else {
        wk.objects[i] = wk.rng.chance(0.85) ? (wk.rng.chance(0.5) ? O.TREE : O.TREE2) : O.BUSH;
      }
    }
  }
}

function placeRingPath(wk: Work): void {
  for (let y = BORDER; y < H - BORDER; y++) {
    for (let x = BORDER; x < W - BORDER; x++) {
      const d = Math.min(x - BORDER, y - BORDER, W - 1 - BORDER - x, H - 1 - BORDER - y);
      if (d < RING_PATH_W) setPath(wk, x, y);
    }
  }
}

function assignPlotTypes(wk: Work, leaves: Rect[]): void {
  const rng = wk.rng;
  const ordered = leaves.slice().sort((a, b) => b.w * b.h - a.w * a.h);
  const types: PlotType[] = new Array(leaves.length);

  // Largest leaf is the farmyard.
  const yardRect = ordered[0];
  const weights: { item: PlotType; w: number }[] = [
    { item: 'carrot', w: 2 },
    { item: 'wheat', w: 2 },
    { item: 'corn', w: 2 },
    { item: 'cabbage', w: 1.5 },
    { item: 'pumpkin', w: 1 },
    { item: 'cows', w: 1.5 },
    { item: 'pigs', w: 1.5 },
    { item: 'chickens', w: 1 },
    { item: 'sheep', w: 1 },
    { item: 'meadow', w: 1.5 },
    { item: 'pond', w: 0.7 },
  ];

  let ponds = 0;
  leaves.forEach((r, i) => {
    if (r === yardRect) {
      types[i] = 'farmyard';
      return;
    }
    let t = rng.weighted(weights);
    if (t === 'pond') {
      if (ponds >= 1 || r.w * r.h < 100) t = 'meadow';
      else ponds++;
    }
    if (t === 'carrot' && r.w * r.h < 60) t = 'wheat';
    types[i] = t;
  });

  // Constraint: 3..6 carrot fields.
  const carrotIdx = () => types.map((t, i) => (t === 'carrot' ? i : -1)).filter((i) => i >= 0);
  const candidates = rng.shuffle(
    leaves.map((r, i) => i).filter((i) => types[i] !== 'farmyard' && types[i] !== 'pond' && leaves[i].w * leaves[i].h >= 60),
  );
  let guard = 0;
  while (carrotIdx().length < 3 && guard++ < 50) {
    const i = candidates.find((c) => types[c] !== 'carrot');
    if (i === undefined) break;
    types[i] = 'carrot';
  }
  while (carrotIdx().length > 6) {
    const list = carrotIdx();
    types[rng.pick(list)] = rng.pick(['wheat', 'corn', 'cabbage'] as PlotType[]);
  }

  leaves.forEach((r, i) => wk.plots.push({ ...r, id: i, type: types[i], gates: [] }));
}

function fillPlot(wk: Work, p: Plot): void {
  const rng = wk.rng;
  const inner: Rect = { x: p.x + 1, y: p.y + 1, w: p.w - 2, h: p.h - 2 };
  fillRect(wk, p, (x, y) => (wk.plotOf[idx(x, y, W)] = p.id));

  const fenced = p.type !== 'pond' && p.type !== 'meadow';
  if (fenced) {
    fillRect(wk, p, (x, y) => {
      const edge = x === p.x || y === p.y || x === p.x + p.w - 1 || y === p.y + p.h - 1;
      if (edge) wk.fence[idx(x, y, W)] = 1;
    });
  }

  switch (p.type) {
    case 'carrot':
      fillRect(wk, inner, (x, y) => {
        const i = idx(x, y, W);
        wk.ground[i] = G.CARROT_SOIL;
        wk.walkable[i] = 1;
        wk.carrotField[i] = 1;
        const rel = (x - inner.x) % 2 === 0 && (y - inner.y) % 2 === 0;
        if (rel && rng.chance(0.85)) wk.carrots.push({ x, y, field: true, plot: p.id });
      });
      addGates(wk, p, rng.int(1, 2));
      break;
    case 'wheat':
    case 'corn':
    case 'cabbage':
    case 'pumpkin': {
      const crop = { wheat: D.WHEAT, corn: D.CORN, cabbage: D.CABBAGE, pumpkin: D.PUMPKIN }[p.type];
      fillRect(wk, inner, (x, y) => {
        const i = idx(x, y, W);
        wk.ground[i] = rng.chance(0.15) ? G.SOIL2 : G.SOIL;
        const row = (y - inner.y) % 2 === 0;
        if (row && rng.chance(0.92)) wk.decor[i] = crop;
      });
      break;
    }
    case 'cows':
    case 'pigs':
    case 'chickens':
    case 'sheep': {
      const kind: AnimalKind = { cows: 'cow', pigs: 'pig', chickens: 'chicken', sheep: 'sheep' }[p.type] as AnimalKind;
      fillRect(wk, inner, (x, y) => {
        const i = idx(x, y, W);
        wk.ground[i] = p.type === 'pigs' ? G.PEN : rng.chance(0.2) ? G.GRASS2 : G.GRASS;
        if (rng.chance(0.03)) wk.decor[i] = D.TUFT;
      });
      // trough near a corner
      wk.objects[idx(inner.x + 1, inner.y + 1, W)] = O.TROUGH;
      const count = rng.int(2, 4);
      for (let k = 0; k < count; k++) {
        wk.animals.push({ x: rng.int(inner.x + 1, inner.x + inner.w - 2), y: rng.int(inner.y + 1, inner.y + inner.h - 2), kind, plot: p.id });
      }
      break;
    }
    case 'pond': {
      fillRect(wk, p, (x, y) => {
        const i = idx(x, y, W);
        const dx = Math.min(x - p.x, p.x + p.w - 1 - x);
        const dy = Math.min(y - p.y, p.y + p.h - 1 - y);
        const d = Math.min(dx, dy);
        if (d >= 2) {
          wk.ground[i] = G.WATER;
        } else if (d === 1) {
          wk.ground[i] = rng.chance(0.5) ? G.WATER_EDGE : G.GRASS;
          if (wk.ground[i] === G.GRASS) {
            wk.walkable[i] = 1;
            if (rng.chance(0.15)) wk.objects[i] = O.ROCK, (wk.walkable[i] = 0);
          }
        } else {
          wk.ground[i] = G.GRASS;
          wk.walkable[i] = 1;
          if (rng.chance(0.08)) wk.decor[i] = D.FLOWER2;
        }
      });
      break;
    }
    case 'meadow': {
      fillRect(wk, p, (x, y) => {
        const i = idx(x, y, W);
        wk.ground[i] = rng.chance(0.5) ? G.MEADOW : G.GRASS;
        wk.walkable[i] = 1;
        const edge = x === p.x || y === p.y || x === p.x + p.w - 1 || y === p.y + p.h - 1;
        if (!edge && rng.chance(0.06)) {
          wk.objects[i] = rng.pick([O.TREE, O.TREE2, O.BUSH, O.ROCK]);
          wk.walkable[i] = 0;
        } else if (rng.chance(0.12)) {
          wk.decor[i] = rng.pick([D.FLOWER1, D.FLOWER2, D.FLOWER3, D.TUFT]);
        }
      });
      break;
    }
    case 'farmyard': {
      fillRect(wk, inner, (x, y) => {
        const i = idx(x, y, W);
        wk.ground[i] = G.YARD;
        wk.walkable[i] = 1;
      });
      // House (4x3) top-left, barn (4x3) top-right, both fully inside the yard.
      placeBuilding(wk, inner.x + 1, inner.y + 1, 4, 3, O.HOUSE_ROOF, O.HOUSE_WALL, O.HOUSE_DOOR);
      if (inner.w >= 11) placeBuilding(wk, inner.x + inner.w - 5, inner.y + 1, 4, 3, O.BARN_ROOF, O.BARN_WALL, O.BARN_DOOR);
      else if (inner.h >= 8) placeBuilding(wk, inner.x + 1, inner.y + 5, 4, 3, O.BARN_ROOF, O.BARN_WALL, O.BARN_DOOR);
      addGates(wk, p, 1);
      const g = p.gates[0];
      // Farmer's home = the yard tile just inside the gate.
      const inside = DIRS.map((d) => ({ x: g.x + d.x, y: g.y + d.y })).find((t) => wk.ground[idx(t.x, t.y, W)] === G.YARD);
      wk.farmerHome = inside ?? g;
      break;
    }
  }
}

function placeBuilding(wk: Work, x: number, y: number, w: number, h: number, roof: number, wall: number, door: number): void {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) {
      const i = idx(xx, yy, W);
      const bottom = yy === y + h - 1;
      wk.objects[i] = bottom ? (xx === x + 1 ? door : wall) : roof;
      wk.walkable[i] = 0;
      wk.decor[i] = -1;
    }
  }
}

/** Turn `count` fence tiles (not corners) that face a path into gates. */
function addGates(wk: Work, p: Plot, count: number): void {
  const candidates: Pt[] = [];
  for (let x = p.x + 1; x < p.x + p.w - 1; x++) {
    candidates.push({ x, y: p.y }, { x, y: p.y + p.h - 1 });
  }
  for (let y = p.y + 1; y < p.y + p.h - 1; y++) {
    candidates.push({ x: p.x, y }, { x: p.x + p.w - 1, y });
  }
  const good = candidates.filter((c) => {
    // outside neighbour must be a path tile, inside neighbour must be walkable
    return DIRS.some((d) => {
      const ox = c.x + d.x;
      const oy = c.y + d.y;
      const ix = c.x - d.x;
      const iy = c.y - d.y;
      if (!inBounds(ox, oy) || !inBounds(ix, iy)) return false;
      const og = wk.ground[idx(ox, oy, W)];
      return (og === G.PATH || og === G.PATH2) && wk.walkable[idx(ix, iy, W)] === 1 && wk.objects[idx(ix, iy, W)] === -1;
    });
  });
  wk.rng.shuffle(good);
  for (let k = 0; k < count && k < good.length; k++) {
    const g = good[k];
    // keep gates apart
    if (p.gates.some((o) => Math.abs(o.x - g.x) + Math.abs(o.y - g.y) < 4)) continue;
    p.gates.push(g);
    const i = idx(g.x, g.y, W);
    wk.objects[i] = O.GATE;
    wk.walkable[i] = 1;
    wk.ground[i] = G.PATH;
  }
}

/** Fence tiles become a 4-bit-mask variant based on fence/gate neighbours. */
function autotileFences(wk: Work): void {
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = idx(x, y, W);
      if (!wk.fence[i] || wk.objects[i] === O.GATE) continue;
      let mask = 0;
      if (y > 0 && wk.fence[i - W]) mask |= 1;
      if (x < W - 1 && wk.fence[i + 1]) mask |= 2;
      if (y < H - 1 && wk.fence[i + W]) mask |= 4;
      if (x > 0 && wk.fence[i - 1]) mask |= 8;
      wk.objects[i] = O.FENCE_BASE + mask;
      wk.walkable[i] = 0;
      wk.decor[i] = -1;
    }
  }
}

function decorate(wk: Work): void {
  const rng = wk.rng;
  for (let y = BORDER; y < H - BORDER; y++) {
    for (let x = BORDER; x < W - BORDER; x++) {
      const i = idx(x, y, W);
      if (wk.plotOf[i] !== -1) continue; // only corridors / ring path
      const g = wk.ground[i];
      if (g !== G.PATH && g !== G.PATH2) continue;
      // verge: path tile that touches a fence/hedge — occasionally a tuft or flower
      const nearEdge = DIRS.some((d) => {
        const j = idx(x + d.x, y + d.y, W);
        return inBounds(x + d.x, y + d.y) && (wk.fence[j] || wk.objects[j] === O.HEDGE);
      });
      if (nearEdge && rng.chance(0.07)) wk.decor[i] = rng.pick([D.TUFT, D.FLOWER1, D.STONES]);
    }
  }
}

function placePathCarrots(wk: Work): void {
  const rng = wk.rng;
  const placed: Pt[] = [];
  for (let y = BORDER; y < H - BORDER; y++) {
    for (let x = BORDER; x < W - BORDER; x++) {
      const i = idx(x, y, W);
      if (wk.plotOf[i] !== -1 || !wk.walkable[i]) continue;
      const g = wk.ground[i];
      if (g !== G.PATH && g !== G.PATH2) continue;
      if (wk.decor[i] !== -1) continue;
      if (rng.chance(1 / 60)) {
        wk.clovers.push({ x, y });
        continue;
      }
      if (!rng.chance(0.16)) continue;
      if (placed.some((p) => Math.abs(p.x - x) + Math.abs(p.y - y) < 4)) continue;
      placed.push({ x, y });
      wk.carrots.push({ x, y, field: false, plot: -1 });
    }
  }
}

function pickSpawn(wk: Work): (Pt & { dir: Pt }) | null {
  const rng = wk.rng;
  const gates = wk.plots.filter((p) => p.type === 'carrot').flatMap((p) => p.gates);
  const home = wk.farmerHome;
  const options: Pt[] = [];
  for (let y = BORDER; y < H - BORDER; y++) {
    for (let x = BORDER; x < W - BORDER; x++) {
      const i = idx(x, y, W);
      if (wk.plotOf[i] !== -1 || !wk.walkable[i]) continue;
      if (Math.abs(x - home.x) + Math.abs(y - home.y) < 25) continue;
      if (gates.some((g) => Math.abs(g.x - x) + Math.abs(g.y - y) < 8)) continue;
      options.push({ x, y });
    }
  }
  rng.shuffle(options);
  for (const o of options) {
    // need at least 4 walkable tiles straight ahead in some direction
    for (const d of rng.shuffle(DIRS.slice())) {
      let ok = true;
      for (let k = 1; k <= 4; k++) {
        const t = idx(o.x + d.x * k, o.y + d.y * k, W);
        if (!inBounds(o.x + d.x * k, o.y + d.y * k) || !wk.walkable[t]) {
          ok = false;
          break;
        }
      }
      if (ok) return { ...o, dir: d };
    }
  }
  return null;
}

/** Connectivity + balance checks. Also carves fixes when a carrot gate is unreachable. */
function validate(wk: Work, spawn: Pt): boolean {
  const reach = floodFill(wk.walkable, spawn);
  const carrotPlots = wk.plots.filter((p) => p.type === 'carrot');
  if (carrotPlots.length < 3) return false;
  if (!carrotPlots.every((p) => p.gates.length > 0 && p.gates.some((g) => reach[idx(g.x, g.y, W)]))) return false;
  if (!reach[idx(wk.farmerHome.x, wk.farmerHome.y, W)]) return false;
  let pathCount = 0;
  for (let i = 0; i < W * H; i++) if (wk.plotOf[i] === -1 && wk.walkable[i]) pathCount++;
  if (pathCount / (W * H) < 0.1) return false;
  // Remove carrots/clovers that ended up unreachable (e.g. inside meadow trees).
  wk.carrots = wk.carrots.filter((c) => reach[idx(c.x, c.y, W)]);
  wk.clovers = wk.clovers.filter((c) => reach[idx(c.x, c.y, W)]);
  return true;
}

export function floodFill(walkable: Uint8Array, start: Pt): Uint8Array {
  const seen = new Uint8Array(W * H);
  const stack = [idx(start.x, start.y, W)];
  seen[stack[0]] = 1;
  while (stack.length) {
    const i = stack.pop()!;
    const x = i % W;
    const y = (i - x) / W;
    for (const d of DIRS) {
      const nx = x + d.x;
      const ny = y + d.y;
      if (!inBounds(nx, ny)) continue;
      const j = idx(nx, ny, W);
      if (seen[j] || !walkable[j]) continue;
      seen[j] = 1;
      stack.push(j);
    }
  }
  return seen;
}
