import { SeededRandom } from "./SeededRandom.js";
function hash2(x, y, seed) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ seed;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}
class TerrainNoise {
  constructor(seed) {
    this.seed = new SeededRandom("terrain:" + seed).state;
  }
  value(x, y) {
    const ix = Math.floor(x),
      iy = Math.floor(y);
    let tx = x - ix,
      ty = y - iy;
    tx = tx * tx * (3 - 2 * tx);
    ty = ty * ty * (3 - 2 * ty);
    const h = (a, b) => hash2(a, b, this.seed) / 4294967295,
      a = h(ix, iy) * (1 - tx) + h(ix + 1, iy) * tx,
      b = h(ix, iy + 1) * (1 - tx) + h(ix + 1, iy + 1) * tx;
    return a * (1 - ty) + b * ty;
  }
  fractal(x, y) {
    return (
      this.value(x, y) * 0.64 +
      this.value(x * 2, y * 2) * 0.25 +
      this.value(x * 4, y * 4) * 0.11
    );
  }
}
export { hash2, TerrainNoise };
