import type { Rng } from './rng';
import type { Rect } from './LevelData';

export interface BspResult {
  leaves: Rect[];
  corridors: Rect[];
}

const MIN_LEAF = 10; // includes the 1-tile fence ring
const MAX_LEAF = 21; // split anything larger than this
const MAX_DEPTH = 6;

/**
 * Recursively splits `rect` into plots separated by corridors of width 2-3.
 * Corridors span the full parent rect so the corridor graph is connected by construction.
 */
export function bsp(rng: Rng, rect: Rect): BspResult {
  const leaves: Rect[] = [];
  const corridors: Rect[] = [];
  split(rng, rect, 0, leaves, corridors);
  return { leaves, corridors };
}

function split(rng: Rng, r: Rect, depth: number, leaves: Rect[], corridors: Rect[]): void {
  const cw = rng.int(2, 3);
  const canSplitW = r.w >= 2 * MIN_LEAF + cw;
  const canSplitH = r.h >= 2 * MIN_LEAF + cw;
  const wantSplit = depth < MAX_DEPTH && (r.w > MAX_LEAF || r.h > MAX_LEAF || rng.chance(0.25));

  if (!wantSplit || (!canSplitW && !canSplitH)) {
    leaves.push(r);
    return;
  }

  // Prefer the longer axis; if only one axis can split, use it.
  let vertical: boolean; // vertical corridor = split along x
  if (canSplitW && canSplitH) vertical = r.w > r.h ? true : r.w < r.h ? false : rng.chance(0.5);
  else vertical = canSplitW;

  if (vertical) {
    const lo = r.x + MIN_LEAF;
    const hi = r.x + r.w - MIN_LEAF - cw;
    const s = clampPos(rng, lo, hi, r.x, r.w, cw);
    corridors.push({ x: s, y: r.y, w: cw, h: r.h });
    split(rng, { x: r.x, y: r.y, w: s - r.x, h: r.h }, depth + 1, leaves, corridors);
    split(rng, { x: s + cw, y: r.y, w: r.x + r.w - (s + cw), h: r.h }, depth + 1, leaves, corridors);
  } else {
    const lo = r.y + MIN_LEAF;
    const hi = r.y + r.h - MIN_LEAF - cw;
    const s = clampPos(rng, lo, hi, r.y, r.h, cw);
    corridors.push({ x: r.x, y: s, w: r.w, h: cw });
    split(rng, { x: r.x, y: r.y, w: r.w, h: s - r.y }, depth + 1, leaves, corridors);
    split(rng, { x: r.x, y: s + cw, w: r.w, h: r.y + r.h - (s + cw) }, depth + 1, leaves, corridors);
  }
}

/** Pick a split position between 35% and 65% of the span, clamped to [lo, hi]. */
function clampPos(rng: Rng, lo: number, hi: number, start: number, span: number, cw: number): number {
  const a = Math.max(lo, start + Math.floor((span - cw) * 0.35));
  const b = Math.min(hi, start + Math.floor((span - cw) * 0.65));
  if (a > b) return rng.int(lo, hi);
  return rng.int(a, b);
}
