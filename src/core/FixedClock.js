import { CONFIG } from "./Config.js";
export class FixedClock {
  constructor(step = CONFIG.step, maxTicks = CONFIG.maxCatchUpTicks) {
    this.step = step;
    this.maxTicks = maxTicks;
    this.accumulator = 0;
    this.dropped = 0;
  }
  reset() {
    this.accumulator = 0;
  }
  advance(elapsed, update, paused = false) {
    if (paused) {
      this.reset();
      return 0;
    }
    if (elapsed > 0.25)
      this.dropped += Math.floor((elapsed - 0.25) / this.step);
    this.accumulator += Math.max(0, Math.min(elapsed, 0.25));
    let ticks = 0;
    while (this.accumulator + 1e-10 >= this.step && ticks < this.maxTicks) {
      update(this.step);
      this.accumulator -= this.step;
      ticks++;
    }
    if (this.accumulator >= this.step) {
      this.dropped += Math.floor(this.accumulator / this.step);
      this.accumulator %= this.step;
    }
    return ticks;
  }
  get alpha() {
    return Math.max(0, Math.min(1, this.accumulator / this.step));
  }
}
