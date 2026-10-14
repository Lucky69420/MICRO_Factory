import { TERRAIN, TERRAIN_NAMES } from "../data/terrain.js";
class Chunk {
  constructor(cx, cy, size) {
    this.cx = cx;
    this.cy = cy;
    this.size = size;
    this.roads = new Set();
    this.tiles = new Map();
    this.deposits = new Map();
    this.depositRecords = new Map();
    this.buildings = new Set();
    this.logistics = new Set();
    this.underground = new Set();
    this.version = 0;
  }
}
class ChunkedMap {
  constructor(grid, kind) {
    this.grid = grid;
    this.kind = kind;
    this.size = 0;
  }
  get(key) {
    const x = key % this.grid.width,
      y = Math.floor(key / this.grid.width);
    return this.grid.chunkAt(x, y)?.[this.kind].get(key);
  }
  has(key) {
    return this.get(key) !== undefined;
  }
  set(key, value) {
    const x = key % this.grid.width,
      y = Math.floor(key / this.grid.width),
      map = this.grid.chunkAt(x, y, true)[this.kind];
    if (!map.has(key)) this.size++;
    map.set(key, value);
    if (this.kind === "deposits")
      this.grid.chunkAt(x, y).depositRecords.set(key, { x, y, type: value });
    this.grid.chunkAt(x, y).version++;
    return this;
  }
  delete(key) {
    const x = key % this.grid.width,
      y = Math.floor(key / this.grid.width),
      chunk = this.grid.chunkAt(x, y);
    if (chunk?.[this.kind].delete(key)) {
      this.size--;
      if (this.kind === "deposits") chunk.depositRecords.delete(key);
      chunk.version++;
      return true;
    }
    return false;
  }
  *entries() {
    for (const chunk of this.grid.chunks.values())
      yield* chunk[this.kind].entries();
  }
  *values() {
    for (const [, value] of this.entries()) yield value;
  }
  [Symbol.iterator]() {
    return this.entries();
  }
}
class Grid {
  constructor(c) {
    this.width = c.width;
    this.height = c.height;
    this.chunkSize = c.chunkSize || 16;
    this.chunks = new Map();
    this.terrain = new Uint8Array(this.width * this.height);
    this.variants = new Uint8Array(this.width * this.height);
    this.transitions = new Uint8Array(this.width * this.height);
    this.terrainVersion = 0;
    this.cells = new ChunkedMap(this, "tiles");
    this.deposits = new ChunkedMap(this, "deposits");
  }
  key(x, y) {
    return y * this.width + x;
  }
  inside(x, y) {
    return (
      Number.isInteger(x) &&
      Number.isInteger(y) &&
      x >= 0 &&
      y >= 0 &&
      x < this.width &&
      y < this.height
    );
  }
  chunkAt(x, y, create = false) {
    if (!this.inside(x, y)) return;
    const cx = Math.floor(x / this.chunkSize),
      cy = Math.floor(y / this.chunkSize),
      key = cy * Math.ceil(this.width / this.chunkSize) + cx;
    let chunk = this.chunks.get(key);
    if (!chunk && create) {
      chunk = new Chunk(cx, cy, this.chunkSize);
      this.chunks.set(key, chunk);
    }
    return chunk;
  }
  terrainAt(x, y) {
    return this.inside(x, y)
      ? TERRAIN_NAMES[this.terrain[this.key(x, y)]]
      : "mountain";
  }
  buildable(x, y) {
    return this.inside(x, y) && TERRAIN[this.terrainAt(x, y)].buildable;
  }
  passable(x, y) {
    return this.inside(x, y) && TERRAIN[this.terrainAt(x, y)].passable;
  }
  get(x, y) {
    return this.inside(x, y) ? this.cells.get(this.key(x, y)) : undefined;
  }
  set(x, y, b) {
    this.cells.set(this.key(x, y), b);
    const c = this.chunkAt(x, y);
    c.buildings.add(b);
    if (b.isTransport) c.logistics.add(b);
  }
  remove(x, y) {
    const b = this.get(x, y);
    if (!b) return;
    this.cells.delete(this.key(x, y));
    const c = this.chunkAt(x, y);
    let remains = false;
    for (let yy = b.y; yy < b.y + b.size; yy++)
      for (let xx = b.x; xx < b.x + b.size; xx++)
        if (this.chunkAt(xx, yy) === c && this.get(xx, yy) === b)
          remains = true;
    if (!remains) {
      c.buildings.delete(b);
      c.logistics.delete(b);
    }
  }
  query(x0, y0, x1, y1, buildings = new Set(), deposits = []) {
    buildings.clear();
    deposits.length = 0;
    const s = this.chunkSize;
    x0 = Math.max(0, x0);
    y0 = Math.max(0, y0);
    x1 = Math.min(this.width, x1);
    y1 = Math.min(this.height, y1);
    for (let cy = Math.floor(y0 / s); cy <= Math.floor((y1 - 1) / s); cy++)
      for (let cx = Math.floor(x0 / s); cx <= Math.floor((x1 - 1) / s); cx++) {
        const c = this.chunkAt(cx * s, cy * s);
        if (!c) continue;
        for (const b of c.buildings)
          if (b.x < x1 && b.y < y1 && b.x + b.size > x0 && b.y + b.size > y0)
            buildings.add(b);
        for (const record of c.depositRecords.values()) {
          const { x, y } = record;
          if (x >= x0 && x < x1 && y >= y0 && y < y1) deposits.push(record);
        }
      }
    return { buildings, deposits };
  }
  indexLink(link, remove = false) {
    const a = link.entrance,
      b = link.exit,
      dx = Math.sign(b.x - a.x),
      dy = Math.sign(b.y - a.y);
    for (let i = 0; i <= link.distance; i++) {
      const c = this.chunkAt(a.x + i * dx, a.y + i * dy, !remove);
      if (c) {
        if (remove) c.underground.delete(link);
        else c.underground.add(link);
      }
    }
  }
}
export { Chunk, ChunkedMap, Grid };
