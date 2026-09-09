/**
 * Smooth "toy world" vector art, drawn with Canvas 2D at ART_PX per tile and
 * scaled down to the 16 px world. Rounded shapes, gradients and soft shadows
 * instead of pixel art. Every texture here can later be replaced by an
 * illustrated PNG with the same key and frame layout.
 */
import Phaser from 'phaser';
import { ART_PX } from '../config';
import { D, G, O, TILESET_COLS, TILESET_ROWS } from './TileType';

type Ctx = CanvasRenderingContext2D;
const P = ART_PX; // 64

// ------------------------------------------------------------------ helpers

function rr(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function fillRR(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, style: string | CanvasGradient): void {
  rr(ctx, x, y, w, h, r);
  ctx.fillStyle = style;
  ctx.fill();
}

function ellipse(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, style: string | CanvasGradient): void {
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = style;
  ctx.fill();
}

function circle(ctx: Ctx, cx: number, cy: number, r: number, style: string | CanvasGradient): void {
  ellipse(ctx, cx, cy, r, r, style);
}

function radial(ctx: Ctx, cx: number, cy: number, r: number, inner: string, outer: string, innerR = 0): CanvasGradient {
  const g = ctx.createRadialGradient(cx, cy, innerR, cx, cy, r);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  return g;
}

function linear(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, a: string, b: string): CanvasGradient {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, a);
  g.addColorStop(1, b);
  return g;
}

function withShadow(ctx: Ctx, blur: number, offY: number, alpha: number, fn: () => void): void {
  ctx.save();
  ctx.shadowColor = `rgba(0,0,0,${alpha})`;
  ctx.shadowBlur = blur;
  ctx.shadowOffsetY = offY;
  fn();
  ctx.restore();
}

/** Deterministic pseudo-random for tile texture details. */
function prng(seed: number): () => number {
  let s = seed * 9301 + 49297;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return (s % 10000) / 10000;
  };
}

function groundShadow(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, alpha = 0.22): void {
  ellipse(ctx, cx, cy, rx, ry, radial(ctx, cx, cy, rx, `rgba(0,0,0,${alpha})`, 'rgba(0,0,0,0)'));
}

// ------------------------------------------------------------------ public

export function buildSmoothTextures(scene: Phaser.Scene): void {
  buildTileset(scene);
  buildBunny(scene);
  buildPerson(scene, 'farmer', '#4a86d9', '#2f4f8f', '#e6bf5c', '#b3714f');
  buildPerson(scene, 'farmhand', '#d94a4a', '#556b2f', '#8b5a2b', '#5a3a1a');
  // crisp large versions for the menu / game over screens
  buildBunny(scene, 'bunny_big', 4);
  buildPerson(scene, 'farmer_big', '#4a86d9', '#2f4f8f', '#e6bf5c', '#b3714f', 4);
  buildAnimals(scene);
  buildItems(scene);
  buildMisc(scene);
}

// ------------------------------------------------------------------ tiles

/** Tiles are padded in the atlas and their edges extruded so linear filtering never bleeds neighbours in. */
export const TILE_MARGIN = 2;
export const TILE_SPACING = 4;

function buildTileset(scene: Phaser.Scene): void {
  const pitch = P + TILE_SPACING;
  const tex = scene.textures.createCanvas('tiles', TILESET_COLS * pitch, TILESET_ROWS * pitch)!;
  const ctx = tex.context;
  const at = (id: number) => ({ x: TILE_MARGIN + (id % TILESET_COLS) * pitch, y: TILE_MARGIN + Math.floor(id / TILESET_COLS) * pitch });
  const scratch = document.createElement('canvas');
  scratch.width = P;
  scratch.height = P;
  const sc = scratch.getContext('2d')!;
  const tile = (id: number, fn: (ctx: Ctx) => void) => {
    const o = at(id);
    sc.clearRect(0, 0, P, P);
    sc.save();
    fn(sc);
    sc.restore();
    ctx.drawImage(scratch, o.x, o.y);
    // extrude edges by TILE_MARGIN px on every side
    const m = TILE_MARGIN;
    ctx.drawImage(scratch, 0, 0, 1, P, o.x - m, o.y, m, P);
    ctx.drawImage(scratch, P - 1, 0, 1, P, o.x + P, o.y, m, P);
    ctx.drawImage(scratch, 0, 0, P, 1, o.x, o.y - m, P, m);
    ctx.drawImage(scratch, 0, P - 1, P, 1, o.x, o.y + P, P, m);
    ctx.drawImage(scratch, 0, 0, 1, 1, o.x - m, o.y - m, m, m);
    ctx.drawImage(scratch, P - 1, 0, 1, 1, o.x + P, o.y - m, m, m);
    ctx.drawImage(scratch, 0, P - 1, 1, 1, o.x - m, o.y + P, m, m);
    ctx.drawImage(scratch, P - 1, P - 1, 1, 1, o.x + P, o.y + P, m, m);
  };

  const grassBase = (c: Ctx, seed: number, a: string, b: string, blades: number, bladeColor: string) => {
    c.fillStyle = a;
    c.fillRect(0, 0, P, P);
    const r = prng(seed + 100);
    for (let i = 0; i < 5; i++) ellipse(c, r() * P, r() * P, 10 + r() * 10, 6 + r() * 6, b + '66');
    for (let i = 0; i < blades; i++) {
      const x = r() * P;
      const y = r() * P;
      c.strokeStyle = bladeColor;
      c.lineWidth = 2;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(x, y + 4);
      c.quadraticCurveTo(x + 1, y, x + 3, y - 4);
      c.stroke();
    }
  };

  tile(G.GRASS, (c) => grassBase(c, 1, '#79c651', '#6fbb48', 7, 'rgba(255,255,255,0.18)'));
  tile(G.GRASS2, (c) => {
    grassBase(c, 2, '#7cc954', '#6fbb48', 6, 'rgba(255,255,255,0.18)');
    circle(c, 18, 40, 3, 'rgba(255,255,255,0.35)');
    circle(c, 44, 18, 2.5, 'rgba(255,255,255,0.35)');
  });
  tile(G.MEADOW, (c) => grassBase(c, 3, '#8ad35f', '#79c651', 9, 'rgba(255,255,255,0.22)'));
  tile(G.FOREST_FLOOR, (c) => grassBase(c, 4, '#4f8f3b', '#437c32', 5, 'rgba(0,0,0,0.12)'));

  const sandBase = (c: Ctx, seed: number, a: string, b: string) => {
    c.fillStyle = a;
    c.fillRect(0, 0, P, P);
    const r = prng(seed);
    for (let i = 0; i < 4; i++) ellipse(c, r() * P, r() * P, 12 + r() * 10, 8 + r() * 6, b + '55');
    for (let i = 0; i < 9; i++) {
      const x = r() * P;
      const y = r() * P;
      ellipse(c, x, y, 2 + r() * 2.5, 1.5 + r() * 1.5, i % 3 === 0 ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.08)');
    }
  };
  tile(G.PATH, (c) => sandBase(c, 5, '#e8cf9a', '#dfc38a'));
  tile(G.PATH2, (c) => {
    sandBase(c, 6, '#ead3a0', '#dfc38a');
    ellipse(c, 30, 34, 7, 4, 'rgba(0,0,0,0.07)');
  });
  tile(G.YARD, (c) => sandBase(c, 7, '#e9dcb8', '#dccda6'));
  tile(G.PEN, (c) => sandBase(c, 8, '#c9a06a', '#b98f5c'));

  const soil = (c: Ctx, seed: number, dark: boolean) => {
    c.fillStyle = dark ? '#6f4a2c' : '#8a5a36';
    c.fillRect(0, 0, P, P);
    for (let y = 0; y < P; y += 16) {
      fillRR(c, -4, y + 3, P + 8, 9, 5, linear(c, 0, y + 3, 0, y + 12, dark ? '#8a5f3c' : '#a06c42', dark ? '#5e3e24' : '#7a4c2c'));
    }
    const r = prng(seed);
    for (let i = 0; i < 6; i++) ellipse(c, r() * P, r() * P, 2, 1.2, 'rgba(0,0,0,0.12)');
  };
  tile(G.SOIL, (c) => soil(c, 9, false));
  tile(G.SOIL2, (c) => {
    soil(c, 10, false);
    ellipse(c, 40, 22, 4, 2.5, 'rgba(255,255,255,0.12)');
  });
  tile(G.CARROT_SOIL, (c) => soil(c, 11, true));

  const water = (c: Ctx, seed: number) => {
    c.fillStyle = '#5ab0e6';
    c.fillRect(0, 0, P, P);
    const r = prng(seed);
    for (let i = 0; i < 4; i++) {
      const x = r() * P;
      const y = r() * P;
      c.strokeStyle = 'rgba(255,255,255,0.45)';
      c.lineWidth = 2.5;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(x - 8, y);
      c.quadraticCurveTo(x - 3, y - 3, x, y);
      c.quadraticCurveTo(x + 3, y + 3, x + 8, y);
      c.stroke();
    }
  };
  tile(G.WATER, (c) => water(c, 12));
  tile(G.WATER_EDGE, (c) => {
    water(c, 13);
    c.fillStyle = linear(c, 0, 0, 0, 14, '#cfe0a0', 'rgba(207,224,160,0)');
    c.fillRect(0, 0, P, 14);
  });

  // ---- fences (rounded posts and rails with soft shadow)
  const wood = '#b57a45';
  const woodDark = '#8d5a2f';
  const woodLight = '#d9a06a';
  for (let mask = 0; mask < 16; mask++) {
    tile(O.FENCE_BASE + mask, (c) => {
      const cx = P / 2;
      withShadow(c, 6, 4, 0.28, () => {
        // rails first (behind the post)
        const rail = (x0: number, x1: number, y: number) => fillRR(c, x0, y, x1 - x0, 7, 3.5, linear(c, 0, y, 0, y + 7, woodLight, wood));
        const railV = (y0: number, y1: number, x: number) => fillRR(c, x, y0, 7, y1 - y0, 3.5, linear(c, x, 0, x + 7, 0, woodLight, wood));
        if (mask & 2) {
          rail(cx, P + 2, 24);
          rail(cx, P + 2, 38);
        }
        if (mask & 8) {
          rail(-2, cx, 24);
          rail(-2, cx, 38);
        }
        if (mask & 1) railV(-2, cx, cx - 3.5);
        if (mask & 4) railV(cx, P + 2, cx - 3.5);
        // post
        fillRR(c, cx - 6, 14, 12, 34, 5, linear(c, cx - 6, 0, cx + 6, 0, woodLight, woodDark));
        fillRR(c, cx - 6, 14, 12, 6, 3, '#e7b982');
      });
    });
  }
  tile(O.GATE, (c) => {
    withShadow(c, 5, 3, 0.25, () => {
      const g = linear(c, 0, 0, P, 0, '#f0c48a', '#d9a462');
      fillRR(c, 4, 22, P - 8, 6, 3, g);
      fillRR(c, 4, 38, P - 8, 6, 3, g);
      fillRR(c, 4, 16, 8, 34, 4, g);
      fillRR(c, P - 12, 16, 8, 34, 4, g);
      fillRR(c, 24, 28, 5, 10, 2.5, '#c58f4c');
      fillRR(c, 36, 28, 5, 10, 2.5, '#c58f4c');
    });
  });

  // ---- trees, hedge, bush
  const treeTile = (id: number, leaf: string, leafDark: string, leafLight: string, cx: number, r: number) => {
    tile(id, (c) => {
      groundShadow(c, cx, 56, r, 7, 0.28);
      fillRR(c, cx - 4, 40, 9, 20, 4, linear(c, cx - 4, 0, cx + 5, 0, '#8a5a3a', '#5e3a1f'));
      withShadow(c, 8, 5, 0.3, () => {
        circle(c, cx, 30, r, radial(c, cx - 8, 20, r + 8, leafLight, leafDark, 2));
      });
      circle(c, cx - 10, 24, r * 0.45, leafLight + 'aa');
      circle(c, cx + 8, 36, r * 0.36, leaf + '99');
      circle(c, cx - 6, 18, 4, 'rgba(255,255,255,0.35)');
    });
  };
  treeTile(O.TREE, '#4fa84a', '#2f7a33', '#7fd06a', 32, 22);
  treeTile(O.TREE2, '#5db357', '#37853a', '#8fd97a', 27, 18);
  tile(O.HEDGE, (c) => {
    groundShadow(c, 32, 56, 30, 6, 0.25);
    withShadow(c, 6, 4, 0.28, () => {
      fillRR(c, -6, 10, P + 12, 44, 16, linear(c, 0, 10, 0, 54, '#5fb857', '#2f7a33'));
    });
    circle(c, 14, 22, 8, 'rgba(255,255,255,0.18)');
    circle(c, 46, 30, 6, 'rgba(255,255,255,0.14)');
  });
  tile(O.BUSH, (c) => {
    groundShadow(c, 32, 54, 20, 6, 0.25);
    withShadow(c, 6, 4, 0.28, () => {
      circle(c, 32, 34, 18, radial(c, 26, 26, 24, '#7fd06a', '#2f7a33', 2));
    });
    circle(c, 24, 26, 4, 'rgba(255,255,255,0.35)');
  });
  tile(O.ROCK, (c) => {
    groundShadow(c, 32, 50, 18, 5, 0.25);
    withShadow(c, 5, 3, 0.3, () => {
      fillRR(c, 12, 22, 40, 26, 12, radial(c, 24, 28, 34, '#c9c9d2', '#7d7d88', 2));
    });
    circle(c, 24, 30, 4, 'rgba(255,255,255,0.4)');
  });
  tile(O.TROUGH, (c) => {
    groundShadow(c, 32, 50, 26, 5, 0.22);
    withShadow(c, 4, 3, 0.25, () => fillRR(c, 6, 22, 52, 24, 6, linear(c, 0, 22, 0, 46, '#b57a45', '#7c4d27')));
    fillRR(c, 10, 26, 44, 12, 4, linear(c, 0, 26, 0, 38, '#7fd0ff', '#4ea3dd'));
  });

  // ---- buildings
  tile(O.HOUSE_WALL, (c) => {
    c.fillStyle = linear(c, 0, 0, 0, P, '#fbf1da', '#ead9b5');
    c.fillRect(0, 0, P, P);
    withShadow(c, 4, 2, 0.2, () => fillRR(c, 18, 16, 28, 28, 6, '#fff'));
    fillRR(c, 21, 19, 22, 22, 4, linear(c, 21, 19, 43, 41, '#9fd4ff', '#4f9ad9'));
    fillRR(c, 31, 19, 2, 22, 1, '#fff');
    fillRR(c, 21, 29, 22, 2, 1, '#fff');
    c.fillStyle = 'rgba(0,0,0,0.08)';
    c.fillRect(0, P - 6, P, 6);
  });
  tile(O.HOUSE_DOOR, (c) => {
    c.fillStyle = linear(c, 0, 0, 0, P, '#fbf1da', '#ead9b5');
    c.fillRect(0, 0, P, P);
    withShadow(c, 4, 2, 0.25, () => fillRR(c, 20, 18, 24, 46, 8, linear(c, 20, 0, 44, 0, '#c58f4c', '#8b5a2b')));
    circle(c, 38, 42, 2.5, '#f3d86e');
    c.fillStyle = 'rgba(0,0,0,0.08)';
    c.fillRect(0, P - 6, P, 6);
  });
  tile(O.HOUSE_ROOF, (c) => {
    c.fillStyle = linear(c, 0, 0, 0, P, '#e2604a', '#b8432f');
    c.fillRect(0, 0, P, P);
    for (let y = 0; y < P; y += 16) {
      fillRR(c, -4, y + 8, P + 8, 10, 5, 'rgba(0,0,0,0.12)');
      fillRR(c, -4, y + 2, P + 8, 8, 4, 'rgba(255,255,255,0.10)');
    }
  });
  tile(O.BARN_WALL, (c) => {
    c.fillStyle = linear(c, 0, 0, 0, P, '#c6473a', '#a03429');
    c.fillRect(0, 0, P, P);
    for (let x = 0; x < P; x += 16) fillRR(c, x + 2, -4, 12, P + 8, 4, 'rgba(255,255,255,0.08)');
    c.fillStyle = 'rgba(0,0,0,0.1)';
    c.fillRect(0, P - 6, P, 6);
  });
  tile(O.BARN_DOOR, (c) => {
    c.fillStyle = linear(c, 0, 0, 0, P, '#c6473a', '#a03429');
    c.fillRect(0, 0, P, P);
    withShadow(c, 4, 2, 0.25, () => fillRR(c, 10, 12, 44, 52, 6, '#fbf1da'));
    c.strokeStyle = '#a03429';
    c.lineWidth = 4;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(14, 16);
    c.lineTo(50, 60);
    c.moveTo(50, 16);
    c.lineTo(14, 60);
    c.moveTo(32, 12);
    c.lineTo(32, 64);
    c.stroke();
  });
  tile(O.BARN_ROOF, (c) => {
    c.fillStyle = linear(c, 0, 0, 0, P, '#6d6d7a', '#4d4d58');
    c.fillRect(0, 0, P, P);
    for (let y = 0; y < P; y += 16) fillRR(c, -4, y + 8, P + 8, 10, 5, 'rgba(0,0,0,0.14)');
  });

  // ---- decor (drawn on transparent, over ground)
  const flower = (id: number, petal: string) => {
    tile(id, (c) => {
      const bloom = (x: number, y: number, s: number) => {
        c.strokeStyle = '#3f8a34';
        c.lineWidth = 2.5;
        c.lineCap = 'round';
        c.beginPath();
        c.moveTo(x, y + 4);
        c.lineTo(x, y + 14 * s);
        c.stroke();
        for (let k = 0; k < 5; k++) {
          const a = (k / 5) * Math.PI * 2;
          circle(c, x + Math.cos(a) * 5 * s, y + Math.sin(a) * 5 * s, 3.2 * s, petal);
        }
        circle(c, x, y, 2.6 * s, '#ffe680');
      };
      bloom(20, 26, 1);
      bloom(44, 40, 0.85);
    });
  };
  flower(D.FLOWER1, '#ffffff');
  flower(D.FLOWER2, '#f78fb3');
  flower(D.FLOWER3, '#f9d54a');
  tile(D.WHEAT, (c) => {
    for (const x of [14, 32, 50]) {
      c.strokeStyle = '#c9ab3a';
      c.lineWidth = 3;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(x, 58);
      c.quadraticCurveTo(x + 2, 40, x, 24);
      c.stroke();
      ellipse(c, x, 16, 5, 11, linear(c, x - 5, 0, x + 5, 0, '#f2d76a', '#d9b53f'));
      ellipse(c, x - 2, 12, 1.5, 5, 'rgba(255,255,255,0.35)');
    }
  });
  tile(D.CORN, (c) => {
    for (const x of [18, 44]) {
      fillRR(c, x - 3, 8, 6, 52, 3, linear(c, x - 3, 0, x + 3, 0, '#5fb857', '#2f7a33'));
      ellipse(c, x - 9, 30, 8, 3, '#4faa48');
      ellipse(c, x + 9, 40, 8, 3, '#4faa48');
      fillRR(c, x - 3, 22, 7, 14, 3.5, linear(c, x - 3, 0, x + 4, 0, '#ffe680', '#e2b93a'));
    }
  });
  tile(D.CABBAGE, (c) => {
    groundShadow(c, 32, 50, 20, 5, 0.2);
    withShadow(c, 5, 3, 0.25, () => circle(c, 32, 34, 20, radial(c, 26, 28, 26, '#b8ec9f', '#4d9a49', 2)));
    circle(c, 32, 34, 11, radial(c, 30, 31, 12, '#e6ffd2', '#8fd07f'));
    circle(c, 26, 28, 3, 'rgba(255,255,255,0.5)');
  });
  tile(D.PUMPKIN, (c) => {
    groundShadow(c, 32, 52, 20, 5, 0.2);
    withShadow(c, 5, 3, 0.25, () => ellipse(c, 32, 38, 21, 16, radial(c, 26, 30, 28, '#ffb050', '#d9731f', 2)));
    for (const dx of [-10, 0, 10]) fillRR(c, 32 + dx - 1.5, 24, 3, 28, 1.5, 'rgba(0,0,0,0.12)');
    fillRR(c, 29, 14, 6, 12, 3, linear(c, 29, 0, 35, 0, '#6cb85c', '#3f8a34'));
  });
  tile(D.TUFT, (c) => {
    c.strokeStyle = '#4b9c3a';
    c.lineWidth = 3;
    c.lineCap = 'round';
    for (const [x, h] of [
      [22, 18],
      [30, 24],
      [38, 20],
      [46, 16],
    ]) {
      c.beginPath();
      c.moveTo(x, 52);
      c.quadraticCurveTo(x + 2, 52 - h / 2, x + 4, 52 - h);
      c.stroke();
    }
  });
  tile(D.STONES, (c) => {
    withShadow(c, 3, 2, 0.25, () => {
      ellipse(c, 20, 40, 8, 5, radial(c, 18, 38, 9, '#d0d0d8', '#8a8a95'));
      ellipse(c, 42, 28, 6, 4, radial(c, 40, 26, 7, '#d0d0d8', '#8a8a95'));
      ellipse(c, 46, 48, 4, 3, '#a0a0aa');
    });
  });

  tex.refresh();
}

// ------------------------------------------------------------------ bunny

const BUNNY_F = 64;

function buildBunny(scene: Phaser.Scene, key = 'bunny', k = 1): void {
  // frames: 0 down, 1 up, 2 side  (facing right; flipped for left)
  const tex = scene.textures.createCanvas(key, BUNNY_F * 3 * k, BUNNY_F * k)!;
  const c = tex.context;
  c.scale(k, k);
  const fur = '#fbf8f2';
  const furShade = '#dcd5c8';
  const pink = '#f7b3c4';
  const drawEar = (x: number, y: number, tilt: number, inner: boolean) => {
    c.save();
    c.translate(x, y);
    c.rotate(tilt);
    ellipse(c, 0, -14, 6, 15, linear(c, -6, 0, 6, 0, fur, furShade));
    if (inner) ellipse(c, 0, -13, 3, 10, pink);
    c.restore();
  };
  const draw = (ox: number, facing: 'down' | 'up' | 'side') => {
    c.save();
    c.translate(ox, 0);
    withShadow(c, 6, 4, 0.22, () => {
      if (facing === 'side') {
        drawEar(30, 26, 0.35, true);
        drawEar(36, 24, 0.05, false);
      } else {
        drawEar(24, 24, -0.18, facing === 'down');
        drawEar(40, 24, 0.18, facing === 'down');
      }
      // body
      ellipse(c, 32, 46, 18, 13, radial(c, 26, 40, 24, fur, furShade, 4));
      // head
      circle(c, 32, 30, 14, radial(c, 27, 25, 18, '#ffffff', furShade, 2));
    });
    // soft outline so the white bunny reads on light paths
    c.strokeStyle = 'rgba(90,70,60,0.45)';
    c.lineWidth = 2;
    c.beginPath();
    c.ellipse(32, 46, 18, 13, 0, 0.2, Math.PI - 0.2);
    c.stroke();
    c.beginPath();
    c.arc(32, 30, 14, Math.PI * 0.15, Math.PI * 0.85);
    c.stroke();
    // feet
    ellipse(c, 22, 57, 7, 3.5, furShade);
    ellipse(c, 42, 57, 7, 3.5, furShade);
    if (facing === 'down') {
      circle(c, 26, 30, 2.6, '#2b2b2b');
      circle(c, 38, 30, 2.6, '#2b2b2b');
      circle(c, 27, 29, 0.9, '#fff');
      circle(c, 39, 29, 0.9, '#fff');
      ellipse(c, 32, 35, 2.4, 1.6, pink);
      circle(c, 21, 34, 3, 'rgba(247,150,170,0.45)');
      circle(c, 43, 34, 3, 'rgba(247,150,170,0.45)');
    } else if (facing === 'side') {
      circle(c, 39, 29, 2.6, '#2b2b2b');
      circle(c, 40, 28, 0.9, '#fff');
      ellipse(c, 45, 33, 2, 1.4, pink);
      circle(c, 36, 34, 3, 'rgba(247,150,170,0.4)');
      circle(c, 13, 46, 5, '#ffffff'); // tail
    } else {
      circle(c, 32, 54, 5, '#ffffff'); // tail
    }
    c.restore();
  };
  draw(0, 'down');
  draw(BUNNY_F, 'up');
  draw(BUNNY_F * 2, 'side');
  tex.refresh();
  for (let i = 0; i < 3; i++) tex.add(i, 0, i * BUNNY_F * k, 0, BUNNY_F * k, BUNNY_F * k);
}

// ------------------------------------------------------------------ people

function buildPerson(scene: Phaser.Scene, key: string, shirt: string, pants: string, hat: string, beard: string, k = 1): void {
  // frames: 0 down, 1 up, 2 side ; 64 x 80
  const W = 64;
  const H = 80;
  const tex = scene.textures.createCanvas(key, W * 3 * k, H * k)!;
  const c = tex.context;
  c.scale(k, k);
  const skin = '#f5cfa8';
  const draw = (ox: number, facing: 'down' | 'up' | 'side') => {
    c.save();
    c.translate(ox, 0);
    withShadow(c, 6, 4, 0.22, () => {
      // legs
      fillRR(c, 20, 54, 10, 20, 5, pants);
      fillRR(c, 34, 54, 10, 20, 5, pants);
      // body
      fillRR(c, 16, 30, 32, 30, 12, linear(c, 16, 30, 48, 60, shirt, shade(shirt)));
      fillRR(c, 22, 36, 20, 24, 8, pants);
      // arms
      fillRR(c, 9, 34, 9, 20, 4.5, shirt);
      fillRR(c, 46, 34, 9, 20, 4.5, shirt);
      circle(c, 13.5, 55, 4.5, skin);
      circle(c, 50.5, 55, 4.5, skin);
      // head
      circle(c, 32, 22, 13, radial(c, 28, 18, 16, '#ffe0c0', skin, 2));
      // hat
      ellipse(c, 32, 14, 21, 6, hat);
      fillRR(c, 20, 2, 24, 14, 7, linear(c, 20, 2, 44, 16, lighten(hat), hat));
    });
    if (facing === 'down') {
      circle(c, 27, 22, 2.2, '#2b2b2b');
      circle(c, 37, 22, 2.2, '#2b2b2b');
      fillRR(c, 25, 27, 14, 5, 2.5, beard);
    } else if (facing === 'side') {
      circle(c, 38, 22, 2.2, '#2b2b2b');
      fillRR(c, 32, 27, 10, 5, 2.5, beard);
      // pitchfork
      fillRR(c, 54, 6, 4, 60, 2, '#8b5a2b');
      fillRR(c, 49, 4, 14, 3, 1.5, '#c9c9d2');
      for (const x of [49, 55, 60]) fillRR(c, x, -2, 3, 8, 1.5, '#c9c9d2');
    }
    c.restore();
  };
  draw(0, 'down');
  draw(W, 'up');
  draw(W * 2, 'side');
  tex.refresh();
  for (let i = 0; i < 3; i++) tex.add(i, 0, i * W * k, 0, W * k, H * k);
}

function shade(hex: string): string {
  return mix(hex, '#000000', 0.25);
}
function lighten(hex: string): string {
  return mix(hex, '#ffffff', 0.25);
}
function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0')}`;
}

// ------------------------------------------------------------------ animals

function buildAnimals(scene: Phaser.Scene): void {
  const S = 64;
  const tex = scene.textures.createCanvas('animals', S * 4, S)!;
  const c = tex.context;
  const body = (ox: number, fill: CanvasGradient | string, rx: number, ry: number) => {
    groundShadow(c, ox + 32, 56, 20, 5, 0.22);
    withShadow(c, 5, 3, 0.2, () => ellipse(c, ox + 34, 40, rx, ry, fill));
  };
  // cow
  body(0, radial(c, 28, 34, 26, '#ffffff', '#e4e4e4', 4), 20, 13);
  ellipse(c, 24, 36, 6, 4, '#2b2b2b');
  ellipse(c, 44, 44, 5, 3.5, '#2b2b2b');
  circle(c, 14, 36, 9, radial(c, 12, 33, 10, '#ffffff', '#e4e4e4'));
  ellipse(c, 12, 40, 5, 3, '#f3b7c9');
  circle(c, 11, 33, 1.6, '#2b2b2b');
  fillRR(c, 6, 26, 4, 6, 2, '#d9b25a');
  fillRR(c, 18, 26, 4, 6, 2, '#d9b25a');
  for (const x of [22, 30, 40, 48]) fillRR(c, x, 50, 5, 8, 2.5, '#2b2b2b');
  // pig
  body(S, radial(c, S + 28, 34, 26, '#ffc2d0', '#f39ab2', 4), 20, 13);
  circle(c, S + 14, 38, 9, radial(c, S + 12, 35, 10, '#ffd0db', '#f39ab2'));
  ellipse(c, S + 12, 41, 4.5, 3, '#e17f97');
  circle(c, S + 11, 41, 0.9, '#b04f6a');
  circle(c, S + 13.5, 41, 0.9, '#b04f6a');
  circle(c, S + 11, 34, 1.6, '#2b2b2b');
  ellipse(c, S + 10, 29, 3, 4, '#f39ab2');
  ellipse(c, S + 18, 29, 3, 4, '#f39ab2');
  for (const x of [22, 30, 40, 48]) fillRR(c, S + x, 50, 5, 8, 2.5, '#e17f97');
  ellipse(c, S + 55, 36, 3, 2, '#f39ab2');
  // chicken
  groundShadow(c, S * 2 + 32, 56, 14, 4, 0.2);
  withShadow(c, 4, 3, 0.2, () => ellipse(c, S * 2 + 34, 42, 14, 11, radial(c, S * 2 + 30, 38, 18, '#ffffff', '#e8e8e8', 2)));
  circle(c, S * 2 + 22, 30, 8, '#ffffff');
  circle(c, S * 2 + 20, 29, 1.5, '#2b2b2b');
  fillRR(c, S * 2 + 20, 21, 5, 5, 2.5, '#e0382e');
  ellipse(c, S * 2 + 14, 32, 4, 2, '#f2a83a');
  ellipse(c, S * 2 + 47, 38, 5, 6, '#ffffff');
  for (const x of [29, 37]) fillRR(c, S * 2 + x, 52, 3, 8, 1.5, '#f2a83a');
  // sheep
  body(S * 3, radial(c, S * 3 + 28, 34, 26, '#ffffff', '#e2ddd4', 4), 20, 14);
  for (const [x, y] of [
    [S * 3 + 18, 30],
    [S * 3 + 30, 26],
    [S * 3 + 44, 28],
    [S * 3 + 50, 40],
    [S * 3 + 20, 48],
  ])
    circle(c, x, y, 7, '#ffffff');
  circle(c, S * 3 + 14, 40, 8, '#3a3a3a');
  circle(c, S * 3 + 11, 38, 1.6, '#ffffff');
  for (const x of [22, 30, 40, 48]) fillRR(c, S * 3 + x, 50, 5, 8, 2.5, '#3a3a3a');
  tex.refresh();
  tex.add('cow', 0, 0, 0, S, S);
  tex.add('pig', 0, S, 0, S, S);
  tex.add('chicken', 0, S * 2, 0, S, S);
  tex.add('sheep', 0, S * 3, 0, S, S);
}

// ------------------------------------------------------------------ items & misc

function buildItems(scene: Phaser.Scene): void {
  const S = 48;
  const tex = scene.textures.createCanvas('items', S * 2, S)!;
  const c = tex.context;
  // carrot
  withShadow(c, 4, 3, 0.25, () => {
    c.beginPath();
    c.moveTo(14, 16);
    c.quadraticCurveTo(24, 10, 34, 16);
    c.quadraticCurveTo(30, 34, 24, 44);
    c.quadraticCurveTo(18, 34, 14, 16);
    c.closePath();
    c.fillStyle = linear(c, 14, 16, 34, 44, '#ffa64d', '#e8731c');
    c.fill();
  });
  fillRR(c, 17, 20, 4, 2, 1, 'rgba(0,0,0,0.12)');
  fillRR(c, 19, 27, 4, 2, 1, 'rgba(0,0,0,0.12)');
  fillRR(c, 19, 18, 2.5, 10, 1.25, 'rgba(255,255,255,0.35)');
  for (const [dx, tilt] of [
    [-6, -0.5],
    [0, 0],
    [6, 0.5],
  ]) {
    c.save();
    c.translate(24 + dx, 14);
    c.rotate(tilt);
    ellipse(c, 0, -6, 3, 8, '#4fb54a');
    c.restore();
  }
  // clover
  const ox = S;
  withShadow(c, 4, 3, 0.25, () => {
    for (const [dx, dy] of [
      [-7, -7],
      [7, -7],
      [-7, 7],
      [7, 7],
    ])
      circle(c, ox + 24 + dx, 22 + dy, 8, radial(c, ox + 22 + dx, 20 + dy, 9, '#7de08a', '#2a8c37'));
  });
  fillRR(c, ox + 22.5, 30, 3, 14, 1.5, '#2a8c37');
  circle(c, ox + 18, 16, 2, 'rgba(255,255,255,0.5)');
  tex.refresh();
  tex.add('carrot', 0, 0, 0, S, S);
  tex.add('clover', 0, S, 0, S, S);
}

function buildMisc(scene: Phaser.Scene): void {
  // soft round shadow blob used under characters
  const sh = scene.textures.createCanvas('shadow', 64, 32)!;
  ellipse(sh.context, 32, 16, 28, 12, radial(sh.context, 32, 16, 28, 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0)'));
  sh.refresh();

  // vignette for the HUD
  const v = scene.textures.createCanvas('vignette', 256, 144)!;
  const vc = v.context;
  vc.fillStyle = radial(vc, 128, 72, 150, 'rgba(0,0,0,0)', 'rgba(0,0,0,0.55)', 60);
  vc.fillRect(0, 0, 256, 144);
  v.refresh();

  // particles
  const g = scene.add.graphics();
  g.fillStyle(0xf28b26, 1).fillCircle(4, 4, 4);
  g.generateTexture('p_carrot', 8, 8);
  g.clear().fillStyle(0xd8c9a3, 1).fillCircle(3, 3, 3);
  g.generateTexture('p_dust', 6, 6);
  g.clear().fillStyle(0xffffff, 1).fillCircle(3, 3, 3);
  g.generateTexture('p_white', 6, 6);
  g.clear().fillStyle(0xf7e04a, 1);
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 3 : 7;
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    if (i === 0) g.moveTo(8 + Math.cos(a) * r, 8 + Math.sin(a) * r);
    else g.lineTo(8 + Math.cos(a) * r, 8 + Math.sin(a) * r);
  }
  g.closePath().fillPath();
  g.generateTexture('p_star', 16, 16);
  g.destroy();
}
