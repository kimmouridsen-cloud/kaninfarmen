import type { Pt } from '../gen/LevelData';

/** A* over a walkable grid with 4-neighbour movement. Returns tile waypoints (excluding start). */
export class Pathfinder {
  private gScore: Float32Array;
  private from: Int32Array;
  private closed: Uint8Array;

  constructor(private walkable: Uint8Array, private w: number, private h: number) {
    const n = w * h;
    this.gScore = new Float32Array(n);
    this.from = new Int32Array(n);
    this.closed = new Uint8Array(n);
  }

  find(start: Pt, goal: Pt, maxNodes = 6000): Pt[] | null {
    const { w, h, walkable } = this;
    const si = start.y * w + start.x;
    const gi = goal.y * w + goal.x;
    if (!walkable[gi] || !walkable[si]) return null;
    if (si === gi) return [];

    this.gScore.fill(Infinity);
    this.closed.fill(0);
    this.from.fill(-1);
    // simple binary heap on f-score
    const heap: number[] = [];
    const fOf = new Map<number, number>();
    const push = (i: number, f: number) => {
      fOf.set(i, f);
      heap.push(i);
      let c = heap.length - 1;
      while (c > 0) {
        const p = (c - 1) >> 1;
        if (fOf.get(heap[p])! <= f) break;
        [heap[p], heap[c]] = [heap[c], heap[p]];
        c = p;
      }
    };
    const pop = (): number => {
      const top = heap[0];
      const last = heap.pop()!;
      if (heap.length) {
        heap[0] = last;
        let c = 0;
        for (;;) {
          const l = 2 * c + 1;
          const r = l + 1;
          let m = c;
          if (l < heap.length && fOf.get(heap[l])! < fOf.get(heap[m])!) m = l;
          if (r < heap.length && fOf.get(heap[r])! < fOf.get(heap[m])!) m = r;
          if (m === c) break;
          [heap[m], heap[c]] = [heap[c], heap[m]];
          c = m;
        }
      }
      return top;
    };
    const hOf = (i: number) => Math.abs((i % w) - goal.x) + Math.abs(Math.floor(i / w) - goal.y);

    this.gScore[si] = 0;
    push(si, hOf(si));
    let expanded = 0;
    while (heap.length) {
      const cur = pop();
      if (cur === gi) break;
      if (this.closed[cur]) continue;
      this.closed[cur] = 1;
      if (++expanded > maxNodes) return null;
      const x = cur % w;
      const y = (cur - x) / w;
      const g = this.gScore[cur] + 1;
      const nbrs = [cur - w, cur + w, cur - 1, cur + 1];
      for (let k = 0; k < 4; k++) {
        if (k === 0 && y === 0) continue;
        if (k === 1 && y === h - 1) continue;
        if (k === 2 && x === 0) continue;
        if (k === 3 && x === w - 1) continue;
        const n = nbrs[k];
        if (!walkable[n] || this.closed[n]) continue;
        if (g < this.gScore[n]) {
          this.gScore[n] = g;
          this.from[n] = cur;
          push(n, g + hOf(n));
        }
      }
    }
    if (this.from[gi] === -1) return null;
    const path: Pt[] = [];
    for (let i = gi; i !== si; i = this.from[i]) path.push({ x: i % w, y: Math.floor(i / w) });
    path.reverse();
    return path;
  }

  /** BFS distances from `start`, capped at `maxDist`. Returns tiles at exactly distance in [minD, maxD]. */
  ring(start: Pt, minD: number, maxD: number): Pt[] {
    const { w, h, walkable } = this;
    const dist = new Int16Array(w * h).fill(-1);
    const q: number[] = [start.y * w + start.x];
    dist[q[0]] = 0;
    const out: Pt[] = [];
    let head = 0;
    while (head < q.length) {
      const cur = q[head++];
      const d = dist[cur];
      if (d >= maxD) continue;
      const x = cur % w;
      const y = (cur - x) / w;
      const nb = [
        [x, y - 1],
        [x + 1, y],
        [x, y + 1],
        [x - 1, y],
      ];
      for (const [nx, ny] of nb) {
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const n = ny * w + nx;
        if (!walkable[n] || dist[n] !== -1) continue;
        dist[n] = d + 1;
        q.push(n);
        if (d + 1 >= minD) out.push({ x: nx, y: ny });
      }
    }
    return out;
  }
}
