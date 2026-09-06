/**
 * Programmatic placeholder art so the game is playable before the real
 * pixel-art pack is dropped in. Everything is drawn at true pixel size (16px
 * tiles) so the look is already "pixel art" when zoomed 3x.
 */
import Phaser from 'phaser';
import { TILE } from '../config';
import { D, G, O, TILESET_COLS, TILESET_ROWS } from './TileType';

type Ctx = CanvasRenderingContext2D;

function px(ctx: Ctx, x: number, y: number, c: string, w = 1, h = 1): void {
  ctx.fillStyle = c;
  ctx.fillRect(x, y, w, h);
}

function speckle(ctx: Ctx, ox: number, oy: number, base: string, dots: string, n: number, seed: number): void {
  px(ctx, ox, oy, base, TILE, TILE);
  let s = seed;
  for (let i = 0; i < n; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const x = s % TILE;
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const y = s % TILE;
    px(ctx, ox + x, oy + y, dots);
  }
}

export function buildPlaceholderTextures(scene: Phaser.Scene): void {
  buildTileset(scene);
  buildSprites(scene);
}

function buildTileset(scene: Phaser.Scene): void {
  const tex = scene.textures.createCanvas('tiles', TILESET_COLS * TILE, TILESET_ROWS * TILE)!;
  const ctx = tex.context;
  const at = (id: number) => ({ x: (id % TILESET_COLS) * TILE, y: Math.floor(id / TILESET_COLS) * TILE });

  const grass = '#5fa646';
  const grassDark = '#4b8c38';
  const grassLight = '#7cc45c';

  // ---- ground
  {
    const o = at(G.GRASS);
    speckle(ctx, o.x, o.y, grass, grassDark, 10, 1);
  }
  {
    const o = at(G.GRASS2);
    speckle(ctx, o.x, o.y, grass, grassLight, 8, 7);
    px(ctx, o.x + 4, o.y + 9, grassDark, 1, 2);
    px(ctx, o.x + 11, o.y + 4, grassDark, 1, 2);
  }
  {
    const o = at(G.PATH);
    speckle(ctx, o.x, o.y, '#c9a56a', '#b8935a', 12, 3);
  }
  {
    const o = at(G.PATH2);
    speckle(ctx, o.x, o.y, '#c9a56a', '#d8b87f', 10, 5);
    px(ctx, o.x + 3, o.y + 10, '#a88450', 2, 1);
  }
  {
    const o = at(G.SOIL);
    px(ctx, o.x, o.y, '#7a4f2a', TILE, TILE);
    for (let y = 0; y < TILE; y += 4) px(ctx, o.x, o.y + y, '#6a4222', TILE, 1);
    speckle(ctx, o.x, o.y, 'rgba(0,0,0,0)', '#8c5c34', 0, 2);
  }
  {
    const o = at(G.SOIL2);
    px(ctx, o.x, o.y, '#7a4f2a', TILE, TILE);
    for (let y = 0; y < TILE; y += 4) px(ctx, o.x, o.y + y, '#6a4222', TILE, 1);
    px(ctx, o.x + 5, o.y + 6, '#8c5c34', 2, 1);
    px(ctx, o.x + 10, o.y + 13, '#8c5c34', 2, 1);
  }
  {
    const o = at(G.CARROT_SOIL);
    px(ctx, o.x, o.y, '#6b4423', TILE, TILE);
    for (let y = 1; y < TILE; y += 4) px(ctx, o.x, o.y + y, '#5a3719', TILE, 1);
    for (let x = 2; x < TILE; x += 4) px(ctx, o.x + x, o.y, '#5f3b1c', 1, TILE);
  }
  {
    const o = at(G.WATER);
    px(ctx, o.x, o.y, '#3f86c9', TILE, TILE);
    px(ctx, o.x + 2, o.y + 4, '#6fb0e8', 4, 1);
    px(ctx, o.x + 9, o.y + 10, '#6fb0e8', 4, 1);
  }
  {
    const o = at(G.WATER_EDGE);
    px(ctx, o.x, o.y, '#5a9fd6', TILE, TILE);
    px(ctx, o.x, o.y, '#c9d9a0', TILE, 3);
    px(ctx, o.x + 3, o.y + 8, '#8ec4ee', 5, 1);
  }
  {
    const o = at(G.PEN);
    speckle(ctx, o.x, o.y, '#a3784c', '#8d6740', 14, 9);
  }
  {
    const o = at(G.YARD);
    speckle(ctx, o.x, o.y, '#d6c39a', '#c4b088', 10, 11);
  }
  {
    const o = at(G.MEADOW);
    speckle(ctx, o.x, o.y, '#6db64f', '#8fd66e', 9, 13);
  }
  {
    const o = at(G.FOREST_FLOOR);
    speckle(ctx, o.x, o.y, '#3d6b2f', '#345c28', 12, 17);
  }

  // ---- fences (16 mask variants)
  const wood = '#8b5a2b';
  const woodDark = '#5e3a18';
  for (let mask = 0; mask < 16; mask++) {
    const o = at(O.FENCE_BASE + mask);
    const c = 7; // post column/row
    // post
    px(ctx, o.x + c, o.y + 5, wood, 2, 8);
    px(ctx, o.x + c, o.y + 5, woodDark, 2, 1);
    px(ctx, o.x + c, o.y + 12, woodDark, 2, 1);
    if (mask & 1) px(ctx, o.x + c, o.y, wood, 2, 6); // N
    if (mask & 4) px(ctx, o.x + c, o.y + 11, wood, 2, 5); // S
    if (mask & 2) {
      px(ctx, o.x + c, o.y + 7, wood, 9, 1);
      px(ctx, o.x + c, o.y + 10, wood, 9, 1);
    }
    if (mask & 8) {
      px(ctx, o.x, o.y + 7, wood, 8, 1);
      px(ctx, o.x, o.y + 10, wood, 8, 1);
    }
  }
  {
    const o = at(O.GATE);
    px(ctx, o.x + 1, o.y + 6, '#d9a866', 14, 1);
    px(ctx, o.x + 1, o.y + 10, '#d9a866', 14, 1);
    px(ctx, o.x + 1, o.y + 4, '#d9a866', 2, 9);
    px(ctx, o.x + 13, o.y + 4, '#d9a866', 2, 9);
    px(ctx, o.x + 4, o.y + 7, '#c58f4c', 1, 3);
    px(ctx, o.x + 10, o.y + 7, '#c58f4c', 1, 3);
  }
  const tree = (id: number, leaf: string, leafDark: string) => {
    const o = at(id);
    px(ctx, o.x + 6, o.y + 11, '#5b3a1a', 4, 5);
    px(ctx, o.x + 3, o.y + 3, leaf, 10, 9);
    px(ctx, o.x + 5, o.y + 1, leaf, 6, 2);
    px(ctx, o.x + 1, o.y + 5, leaf, 2, 5);
    px(ctx, o.x + 13, o.y + 5, leaf, 2, 5);
    px(ctx, o.x + 4, o.y + 9, leafDark, 8, 2);
    px(ctx, o.x + 6, o.y + 4, '#9ee07a', 3, 2);
  };
  tree(O.TREE, '#3e8f3a', '#2f6e2c');
  tree(O.TREE2, '#4c9a46', '#357a30');
  {
    const o = at(O.HEDGE);
    px(ctx, o.x, o.y + 2, '#2f7a2c', TILE, 13);
    px(ctx, o.x, o.y + 1, '#3f9a3a', TILE, 3);
    px(ctx, o.x + 2, o.y + 7, '#255f22', 3, 2);
    px(ctx, o.x + 10, o.y + 10, '#255f22', 3, 2);
    px(ctx, o.x + 6, o.y + 4, '#58b850', 2, 1);
  }
  {
    const o = at(O.BUSH);
    px(ctx, o.x + 3, o.y + 5, '#3a8a36', 10, 9);
    px(ctx, o.x + 5, o.y + 3, '#3a8a36', 6, 2);
    px(ctx, o.x + 5, o.y + 11, '#2b6a28', 6, 2);
    px(ctx, o.x + 6, o.y + 6, '#6bc45f', 2, 1);
  }
  {
    const o = at(O.HOUSE_WALL);
    px(ctx, o.x, o.y, '#f0e2c2', TILE, TILE);
    px(ctx, o.x + 5, o.y + 4, '#5ea0d8', 6, 6);
    px(ctx, o.x + 5, o.y + 4, '#e8f4ff', 6, 1);
    px(ctx, o.x + 7, o.y + 4, '#c9bfa5', 1, 6);
    px(ctx, o.x, o.y + 15, '#b9ab8a', TILE, 1);
  }
  {
    const o = at(O.HOUSE_DOOR);
    px(ctx, o.x, o.y, '#f0e2c2', TILE, TILE);
    px(ctx, o.x + 5, o.y + 5, '#8b5a2b', 6, 11);
    px(ctx, o.x + 9, o.y + 10, '#f3d86e', 1, 1);
    px(ctx, o.x, o.y + 15, '#b9ab8a', TILE, 1);
  }
  {
    const o = at(O.HOUSE_ROOF);
    px(ctx, o.x, o.y, '#b8432f', TILE, TILE);
    for (let y = 0; y < TILE; y += 4) px(ctx, o.x, o.y + y, '#8f2f20', TILE, 1);
    px(ctx, o.x + 4, o.y + 2, '#d05a44', 3, 1);
    px(ctx, o.x + 10, o.y + 10, '#d05a44', 3, 1);
  }
  {
    const o = at(O.BARN_WALL);
    px(ctx, o.x, o.y, '#a83a2e', TILE, TILE);
    for (let x = 0; x < TILE; x += 4) px(ctx, o.x + x, o.y, '#8a2c22', 1, TILE);
    px(ctx, o.x, o.y + 15, '#6f2118', TILE, 1);
  }
  {
    const o = at(O.BARN_DOOR);
    px(ctx, o.x, o.y, '#a83a2e', TILE, TILE);
    px(ctx, o.x + 3, o.y + 3, '#f0e2c2', 10, 13);
    px(ctx, o.x + 3, o.y + 3, '#8a2c22', 10, 1);
    px(ctx, o.x + 3, o.y + 3, '#8a2c22', 1, 13);
    px(ctx, o.x + 12, o.y + 3, '#8a2c22', 1, 13);
    px(ctx, o.x + 7, o.y + 3, '#8a2c22', 1, 13);
  }
  {
    const o = at(O.BARN_ROOF);
    px(ctx, o.x, o.y, '#5c5c66', TILE, TILE);
    for (let y = 0; y < TILE; y += 4) px(ctx, o.x, o.y + y, '#46464f', TILE, 1);
  }
  {
    const o = at(O.ROCK);
    px(ctx, o.x + 3, o.y + 6, '#8e8e96', 10, 8);
    px(ctx, o.x + 5, o.y + 4, '#8e8e96', 6, 2);
    px(ctx, o.x + 4, o.y + 12, '#66666e', 8, 2);
    px(ctx, o.x + 6, o.y + 6, '#b5b5bd', 3, 1);
  }
  {
    const o = at(O.TROUGH);
    px(ctx, o.x + 1, o.y + 6, '#8b5a2b', 14, 7);
    px(ctx, o.x + 2, o.y + 7, '#3f86c9', 12, 3);
    px(ctx, o.x + 1, o.y + 12, '#5e3a18', 14, 1);
  }

  // ---- decor
  const flower = (id: number, c: string) => {
    const o = at(id);
    px(ctx, o.x + 4, o.y + 8, '#3f8a34', 1, 4);
    px(ctx, o.x + 3, o.y + 6, c, 3, 3);
    px(ctx, o.x + 4, o.y + 7, '#ffe680');
    px(ctx, o.x + 11, o.y + 10, '#3f8a34', 1, 3);
    px(ctx, o.x + 10, o.y + 8, c, 3, 3);
    px(ctx, o.x + 11, o.y + 9, '#ffe680');
  };
  flower(D.FLOWER1, '#ffffff');
  flower(D.FLOWER2, '#f26d9c');
  flower(D.FLOWER3, '#f9d54a');
  {
    const o = at(D.WHEAT);
    for (const x of [3, 7, 11]) {
      px(ctx, o.x + x, o.y + 6, '#b9a13a', 1, 9);
      px(ctx, o.x + x - 1, o.y + 3, '#e2c95a', 3, 4);
      px(ctx, o.x + x, o.y + 2, '#e2c95a', 1, 1);
    }
  }
  {
    const o = at(D.CORN);
    for (const x of [4, 10]) {
      px(ctx, o.x + x, o.y + 2, '#3e8f3a', 2, 13);
      px(ctx, o.x + x - 2, o.y + 5, '#4faa48', 2, 1);
      px(ctx, o.x + x + 2, o.y + 8, '#4faa48', 2, 1);
      px(ctx, o.x + x, o.y + 6, '#f3d86e', 2, 3);
    }
  }
  {
    const o = at(D.CABBAGE);
    px(ctx, o.x + 3, o.y + 4, '#6fbf6a', 10, 9);
    px(ctx, o.x + 5, o.y + 3, '#6fbf6a', 6, 1);
    px(ctx, o.x + 5, o.y + 6, '#a4e39e', 5, 4);
    px(ctx, o.x + 4, o.y + 12, '#4d9a49', 8, 1);
  }
  {
    const o = at(D.PUMPKIN);
    px(ctx, o.x + 3, o.y + 6, '#ea8a2a', 10, 8);
    px(ctx, o.x + 5, o.y + 5, '#ea8a2a', 6, 1);
    px(ctx, o.x + 7, o.y + 6, '#c9701c', 1, 8);
    px(ctx, o.x + 7, o.y + 3, '#3e8f3a', 2, 3);
  }
  {
    const o = at(D.TUFT);
    px(ctx, o.x + 4, o.y + 9, '#4b8c38', 1, 5);
    px(ctx, o.x + 6, o.y + 7, '#4b8c38', 1, 7);
    px(ctx, o.x + 8, o.y + 9, '#4b8c38', 1, 5);
    px(ctx, o.x + 10, o.y + 8, '#4b8c38', 1, 6);
  }
  {
    const o = at(D.STONES);
    px(ctx, o.x + 3, o.y + 10, '#9a9aa2', 3, 2);
    px(ctx, o.x + 9, o.y + 6, '#9a9aa2', 2, 2);
    px(ctx, o.x + 11, o.y + 12, '#83838b', 2, 1);
  }

  tex.refresh();
}

function buildSprites(scene: Phaser.Scene): void {
  // Bunny: 3 facings (down, up, side) x 2 hop frames, each 16x16.
  const bunny = scene.textures.createCanvas('bunny', 16 * 6, 16)!;
  const b = bunny.context;
  const fur = '#f4f1ea';
  const furDark = '#d8d2c6';
  const ear = '#f5b7c4';
  const drawBunny = (ox: number, facing: 'down' | 'up' | 'side', hop: boolean) => {
    const lift = hop ? -1 : 0;
    // body
    px(b, ox + 4, 8 + lift, fur, 8, 6);
    px(b, ox + 3, 9 + lift, fur, 10, 4);
    px(b, ox + 5, 13 + lift, furDark, 6, 1);
    // head
    px(b, ox + 5, 4 + lift, fur, 6, 5);
    // ears
    if (facing !== 'side') {
      px(b, ox + 5, 0 + lift, fur, 2, 5);
      px(b, ox + 9, 0 + lift, fur, 2, 5);
      px(b, ox + 6, 1 + lift, ear, 1, 3);
      px(b, ox + 9, 1 + lift, ear, 1, 3);
    } else {
      px(b, ox + 6, 0 + lift, fur, 2, 5);
      px(b, ox + 8, 1 + lift, fur, 2, 4);
      px(b, ox + 7, 1 + lift, ear, 1, 3);
    }
    if (facing === 'down') {
      px(b, ox + 6, 6 + lift, '#2b2b2b');
      px(b, ox + 9, 6 + lift, '#2b2b2b');
      px(b, ox + 7, 7 + lift, ear, 2, 1);
    } else if (facing === 'side') {
      px(b, ox + 9, 6 + lift, '#2b2b2b');
      px(b, ox + 10, 7 + lift, ear, 1, 1);
    }
    // tail
    if (facing === 'up') px(b, ox + 7, 13 + lift, '#ffffff', 2, 2);
    if (facing === 'side') px(b, ox + 3, 10 + lift, '#ffffff', 2, 2);
    // feet
    px(b, ox + 4, 14 + lift, furDark, 3, 1);
    px(b, ox + 9, 14 + lift, furDark, 3, 1);
  };
  drawBunny(0, 'down', false);
  drawBunny(16, 'down', true);
  drawBunny(32, 'up', false);
  drawBunny(48, 'up', true);
  drawBunny(64, 'side', false);
  drawBunny(80, 'side', true);
  bunny.refresh();
  for (let i = 0; i < 6; i++) bunny.add(i, 0, i * 16, 0, 16, 16);

  // Farmer + farmhand: 16x20, 2 walk frames x (down, up, side)
  const buildPerson = (key: string, shirt: string, overalls: string, hat: string, beard: string) => {
    const tex = scene.textures.createCanvas(key, 16 * 6, 20)!;
    const f = tex.context;
    const draw = (ox: number, facing: 'down' | 'up' | 'side', step: boolean) => {
      const skin = '#f1c9a5';
      px(f, ox + 5, 15, overalls, 2, step ? 4 : 5);
      px(f, ox + 9, 15, overalls, 2, step ? 5 : 4);
      px(f, ox + 4, 9, shirt, 8, 6);
      px(f, ox + 5, 10, overalls, 6, 5);
      px(f, ox + 3, 10, skin, 1, 4);
      px(f, ox + 12, 10, skin, 1, 4);
      px(f, ox + 5, 3, skin, 6, 6);
      px(f, ox + 3, 3, hat, 10, 1);
      px(f, ox + 5, 0, hat, 6, 3);
      if (facing === 'down') {
        px(f, ox + 6, 5, '#2b2b2b');
        px(f, ox + 9, 5, '#2b2b2b');
        px(f, ox + 6, 8, beard, 4, 1);
      } else if (facing === 'side') {
        px(f, ox + 9, 5, '#2b2b2b');
        px(f, ox + 8, 8, beard, 3, 1);
      } else {
        px(f, ox + 5, 3, '#8b5a2b', 6, 3);
        px(f, ox + 3, 3, hat, 10, 1);
        px(f, ox + 5, 0, hat, 6, 3);
      }
      if (facing === 'side') {
        px(f, ox + 13, 2, '#8b5a2b', 1, 14);
        px(f, ox + 12, 1, '#c0c0c8', 3, 1);
        px(f, ox + 12, 0, '#c0c0c8', 1, 1);
        px(f, ox + 14, 0, '#c0c0c8', 1, 1);
      }
    };
    draw(0, 'down', false);
    draw(16, 'down', true);
    draw(32, 'up', false);
    draw(48, 'up', true);
    draw(64, 'side', false);
    draw(80, 'side', true);
    tex.refresh();
    for (let i = 0; i < 6; i++) tex.add(i, 0, i * 16, 0, 16, 20);
  };
  buildPerson('farmer', '#3b6fb6', '#2f4a7a', '#d9b25a', '#b0674a');
  buildPerson('farmhand', '#c0392b', '#4a5a2f', '#8b5a2b', '#5a3a1a');

  // Animals: 16x16, one frame each (+ mirrored at runtime)
  const animals = scene.textures.createCanvas('animals', 16 * 4, 16)!;
  const a = animals.context;
  // cow
  px(a, 3, 6, '#f7f4ee', 11, 7);
  px(a, 5, 7, '#2b2b2b', 3, 3);
  px(a, 10, 9, '#2b2b2b', 2, 2);
  px(a, 1, 5, '#f7f4ee', 4, 5);
  px(a, 1, 8, '#f3b7c9', 3, 2);
  px(a, 2, 6, '#2b2b2b');
  px(a, 4, 13, '#2b2b2b', 2, 2);
  px(a, 10, 13, '#2b2b2b', 2, 2);
  // pig
  px(a, 16 + 3, 6, '#f3a6b8', 11, 7);
  px(a, 16 + 1, 6, '#f3a6b8', 4, 5);
  px(a, 16 + 1, 8, '#e17f97', 2, 2);
  px(a, 16 + 3, 7, '#2b2b2b');
  px(a, 16 + 4, 13, '#e17f97', 2, 2);
  px(a, 16 + 10, 13, '#e17f97', 2, 2);
  px(a, 16 + 14, 6, '#f3a6b8', 1, 2);
  // chicken
  px(a, 32 + 5, 8, '#fbfbf5', 7, 5);
  px(a, 32 + 4, 5, '#fbfbf5', 4, 4);
  px(a, 32 + 5, 4, '#e0382e', 2, 1);
  px(a, 32 + 3, 6, '#f2a83a', 1, 1);
  px(a, 32 + 5, 6, '#2b2b2b');
  px(a, 32 + 7, 13, '#f2a83a', 1, 2);
  px(a, 32 + 10, 13, '#f2a83a', 1, 2);
  px(a, 32 + 12, 7, '#fbfbf5', 2, 3);
  // sheep
  px(a, 48 + 3, 5, '#f4f1ea', 11, 8);
  px(a, 48 + 2, 6, '#f4f1ea', 13, 5);
  px(a, 48 + 1, 7, '#3a3a3a', 4, 4);
  px(a, 48 + 2, 8, '#f4f1ea');
  px(a, 48 + 4, 13, '#3a3a3a', 2, 2);
  px(a, 48 + 10, 13, '#3a3a3a', 2, 2);
  animals.refresh();
  animals.add('cow', 0, 0, 0, 16, 16);
  animals.add('pig', 0, 16, 0, 16, 16);
  animals.add('chicken', 0, 32, 0, 16, 16);
  animals.add('sheep', 0, 48, 0, 16, 16);

  // Pickups: carrot, clover (12x12)
  const items = scene.textures.createCanvas('items', 12 * 2, 12)!;
  const it = items.context;
  px(it, 5, 0, '#3e9f3a', 2, 2);
  px(it, 3, 1, '#3e9f3a', 2, 2);
  px(it, 7, 1, '#3e9f3a', 2, 2);
  px(it, 3, 3, '#f28b26', 6, 3);
  px(it, 4, 6, '#f28b26', 4, 3);
  px(it, 5, 9, '#f28b26', 2, 2);
  px(it, 5, 11, '#e0701a', 2, 1);
  px(it, 4, 4, '#ffb15c', 1, 4);
  // clover
  px(it, 12 + 3, 2, '#3bb54a', 3, 3);
  px(it, 12 + 7, 2, '#3bb54a', 3, 3);
  px(it, 12 + 3, 6, '#3bb54a', 3, 3);
  px(it, 12 + 7, 6, '#3bb54a', 3, 3);
  px(it, 12 + 5, 4, '#2a8c37', 3, 3);
  px(it, 12 + 6, 9, '#2a8c37', 1, 3);
  px(it, 12 + 4, 3, '#7de08a', 1, 1);
  items.refresh();
  items.add('carrot', 0, 0, 0, 12, 12);
  items.add('clover', 0, 12, 0, 12, 12);

  // Small particles
  const g = scene.add.graphics();
  g.fillStyle(0xf28b26, 1).fillRect(0, 0, 3, 3);
  g.generateTexture('p_carrot', 3, 3);
  g.clear().fillStyle(0xd8c9a3, 1).fillRect(0, 0, 2, 2);
  g.generateTexture('p_dust', 2, 2);
  g.clear().fillStyle(0xffffff, 1).fillRect(0, 0, 2, 2);
  g.generateTexture('p_white', 2, 2);
  g.clear().fillStyle(0xf7e04a, 1).fillCircle(3, 3, 3);
  g.generateTexture('p_star', 6, 6);
  g.destroy();
}
