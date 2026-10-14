import { updateUI } from "../ui/UIManager.js";

export function frame(app, ms) {
  const now = ms / 1000,
    dt = app.last ? Math.max(0, (ms - app.last) / 1000) : 0;
  app.last = ms;
  const cameraDt = Math.min(0.1, dt),
    speed = (9 * 42) / app.cam.scale;
  app.cam.x +=
    ((app.keys.has(app.bindings.right) || app.keys.has("arrowright")) -
      (app.keys.has(app.bindings.left) || app.keys.has("arrowleft"))) *
    speed *
    cameraDt;
  app.cam.y +=
    ((app.keys.has(app.bindings.down) || app.keys.has("arrowdown")) -
      (app.keys.has(app.bindings.up) || app.keys.has("arrowup"))) *
    speed *
    cameraDt;
  app.cam.x = Math.max(0, Math.min(app.game.config.width, app.cam.x));
  app.cam.y = Math.max(0, Math.min(app.game.config.height, app.cam.y));
  let t = performance.now();
  const ticks = app.clock.advance(
    dt,
    (step) => app.game.tick(step),
    app.paused || document.hidden,
  );
  app.monitoring.simulationMs = ticks
    ? (performance.now() - t) / ticks
    : app.monitoring.simulationMs;
  app.interpolation = app.paused || document.hidden ? 1 : app.clock.alpha;
  t = performance.now();
  app.render(now);
  updateUI(app, now);
  app.monitoring.renderMs = performance.now() - t;
  app.monitoring.frames++;
  app.monitoring.ticks += ticks;
  if (!app.monitoring.start) app.monitoring.start = now;
  if (now - app.monitoring.start >= 1) {
    app.monitoring.fps = app.monitoring.frames / (now - app.monitoring.start);
    app.monitoring.tps = app.monitoring.ticks / (now - app.monitoring.start);
    app.monitoring.frames = 0;
    app.monitoring.ticks = 0;
    app.monitoring.start = now;
    if (app.settings.debug)
      app.$("debug-overlay").textContent =
        `FPS ${app.monitoring.fps.toFixed(0)} · TPS ${app.monitoring.tps.toFixed(1)}
Simulation ${app.monitoring.simulationMs.toFixed(2)} ms/tick · Render ${app.monitoring.renderMs.toFixed(2)} ms/frame
Buildings ${app.game.entities.size} · Belts ${app.game.beltCount}
Items in transit ${app.game.network.active.size} · Chunks ${app.game.grid.chunks.size}
Graph nodes ${app.game.network.nodes.size} · Catch-up dropped ${app.clock.dropped}`;
  }
  requestAnimationFrame(app.frame);
}
