class SeededRandom {
  constructor(seed) {
    let h = 2166136261;
    for (const ch of String(seed)) {
      h ^= ch.charCodeAt(0);
      h = Math.imul(h, 16777619);
    }
    this.state = h >>> 0;
  }
  next() {
    let t = (this.state = (this.state + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  integer(min, max) {
    return min + Math.floor(this.next() * (max - min + 1));
  }
}
// Terrain is immutable after generation, separate from resources and building cells.
export { SeededRandom };
