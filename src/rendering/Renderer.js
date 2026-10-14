import * as Factory from "../data/index.js";

import { DIRS } from "../utils/directions.js";
import { Art } from "../rendering/Art.js";
import { TerrainArt } from "../rendering/TerrainArt.js";
import * as BeltGeometry from "../logistics/BeltGeometry.js";

export function render(app, _now) {
  const w = app.canvas.clientWidth,
    h = app.canvas.clientHeight,
    dpr = devicePixelRatio || 1;
  if (
    app.canvas.width !== Math.round(w * dpr) ||
    app.canvas.height !== Math.round(h * dpr)
  ) {
    app.canvas.width = Math.round(w * dpr);
    app.canvas.height = Math.round(h * dpr);
  }
  app.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  app.ctx.imageSmoothingEnabled = false;
  app.ctx.clearRect(0, 0, w, h);
  const s = app.cam.scale,
    cfg = app.game.config;
  const [ox, oy] = app.screen(0, 0);
  app.ctx.fillStyle = "#202a33";
  app.ctx.fillRect(ox, oy, cfg.width * s, cfg.height * s);
  const xmin = Math.max(0, Math.floor(app.cam.x - w / s / 2) - 1),
    xmax = Math.min(cfg.width, Math.ceil(app.cam.x + w / s / 2) + 1),
    ymin = Math.max(0, Math.floor(app.cam.y - h / s / 2) - 1),
    ymax = Math.min(cfg.height, Math.ceil(app.cam.y + h / s / 2) + 1);
  TerrainArt.draw(
    app.ctx,
    app.game.grid,
    xmin,
    ymin,
    xmax,
    ymax,
    app.screen,
    s,
  );
  if (app.settings.showGrid) {
    app.ctx.strokeStyle = "#2e3a46";
    app.ctx.lineWidth = 1;
    app.ctx.beginPath();
    for (let i = xmin; i <= xmax; i++) {
      app.ctx.moveTo(ox + i * s, oy + ymin * s);
      app.ctx.lineTo(ox + i * s, oy + ymax * s);
    }
    for (let i = ymin; i <= ymax; i++) {
      app.ctx.moveTo(ox + xmin * s, oy + i * s);
      app.ctx.lineTo(ox + xmax * s, oy + i * s);
    }
    app.ctx.stroke();
  }
  app.game.grid.query(
    xmin,
    ymin,
    xmax,
    ymax,
    app.visibleBuildings,
    app.visibleDeposits,
  );
  const visible = app.visibleBuildings;
  for (const { x: dx, y: dy, type } of app.visibleDeposits) {
    const [sx, sy] = app.screen(dx, dy);
    Art.draw(
      app.ctx,
      Art.ore(type, dx, dy),
      sx,
      sy,
      Math.round(sx + s) - Math.round(sx),
      Math.round(sy + s) - Math.round(sy),
    );
  }
  if (
    app.game.depot.x + 3 > xmin &&
    app.game.depot.x < xmax &&
    cfg.height > ymin &&
    app.game.parkY < ymax
  ) {
    const roadStart = Math.max(app.game.parkY, ymin),
      roadEnd = Math.min(cfg.height, ymax);
    const [rx, ry] = app.screen(app.game.depot.x, roadStart);
    app.ctx.fillStyle = "#303537";
    app.ctx.fillRect(rx, ry, 3 * s, (roadEnd - roadStart) * s);
    app.ctx.strokeStyle = "#e4c36966";
    app.ctx.setLineDash([s * 0.4, s * 0.5]);
    app.ctx.beginPath();
    app.ctx.moveTo(rx + 1.5 * s, ry);
    app.ctx.lineTo(rx + 1.5 * s, ry + (roadEnd - roadStart) * s);
    app.ctx.stroke();
    app.ctx.setLineDash([]);
  }
  for (const c of visible) {
    const [x, y] = app.screen(c.x, c.y),
      z = c.size * s;
    if (x < -z || y < -z || x > w || y > h) continue;
    if (Factory.TRANSPORT.has(c.type)) {
      app.drawLogistics(c, x, y, s);
    } else {
      Art.draw(app.ctx, Art.buildings[c.type], x, y, z);
      if (c.type === "miner") {
        const r = app.game.resourceAt(c.x, c.y);
        Art.draw(app.ctx, Art.items[r], x + s * 0.06, y + s * 0.06, s * 0.3);
      }
      if (c.type === "smelter" || Factory.PROCESSORS.has(c.type)) {
        const progress = c.batch
          ? c.batch.time / (c.batch.seconds || app.game.config.batchSeconds)
          : 0;
        app.ctx.fillStyle = "#ffc174";
        app.ctx.fillRect(
          x + z * 0.18,
          y + z * 0.88,
          z * 0.64 * progress,
          Math.max(1, s * 0.04),
        );
      }
      const pt = app.game.port(c),
        d = DIRS[c.dir];
      const [ax, ay] = app.screen(
        pt[0] + 0.5 - d[0] * 0.7,
        pt[1] + 0.5 - d[1] * 0.7,
      );
      if (!["depot", "turret", "wall"].includes(c.type))
        app.arrow(ax, ay, c.dir, s, "#dce8ed");
    }
    if (c.type === "turret") {
      app.ctx.save();
      app.ctx.translate(x + z / 2, y + z / 2);
      app.ctx.rotate(c.angle);
      app.ctx.fillStyle = "#394b58";
      app.ctx.fillRect(-s * 0.18, -s * 0.14, s * 0.95, s * 0.28);
      app.ctx.fillStyle = "#b6c6cd";
      app.ctx.fillRect(s * 0.2, -s * 0.08, s * 0.55, s * 0.16);
      if (c.flash) {
        app.ctx.fillStyle = "#ffe794";
        app.ctx.fillRect(s * 0.76, -s * 0.12, s * 0.24, s * 0.24);
      }
      app.ctx.restore();
      if (c === app.selected) {
        app.ctx.strokeStyle = "#dfbb6355";
        app.ctx.beginPath();
        app.ctx.arc(x + z / 2, y + z / 2, cfg.turretRange * s, 0, Math.PI * 2);
        app.ctx.stroke();
      }
    }
    if (c === app.selected || c.hp < c.maxHp) {
      app.ctx.fillStyle = "#18212b";
      app.ctx.fillRect(x + 3, y - 5, z - 6, 3);
      app.ctx.fillStyle = "#a6d6a4";
      app.ctx.fillRect(x + 3, y - 5, ((z - 6) * c.hp) / c.maxHp, 3);
    }
  }
  app.drawCombat(xmin, ymin, xmax, ymax);
  const t = app.game.truck;
  const truckY =
    (t.previousY ?? t.y) + (t.y - (t.previousY ?? t.y)) * app.interpolation;
  if (
    t.state !== "waiting" &&
    truckY + 1 > ymin &&
    truckY - 1 < ymax &&
    app.game.depot.x + 2 > xmin &&
    app.game.depot.x < xmax
  ) {
    const [tx, ty] = app.screen(app.game.depot.x + 1.5, truckY);
    app.ctx.save();
    app.ctx.translate(tx, ty);
    if (t.state === "returning") app.ctx.rotate(Math.PI);
    Art.draw(app.ctx, Art.truck, -s * 0.45, -s * 0.75, s * 0.9, s * 1.5);
    app.ctx.restore();
  }
  for (const c of visible) {
    if (c.type === "underground" && c.mode === "entrance") continue;
    const items = c.type === "junction" ? Object.values(c.channels) : [c.item];
    for (const item of items) {
      if (!item) continue;
      const p = ["junction", "router"].includes(c.type) ? 0.5 : item.progress,
        from = item.from || [0, 0];
      let direction = c.type === "junction" ? item.direction : c.dir;
      if (c.type === "router") {
        const candidate = app.game
          .targets(c, item)
          .find((o) =>
            app.game.canAccept(o.target, item.type, o.from, c, item),
          );
        direction = candidate?.direction ?? item.direction;
      }
      const d = DIRS[direction],
        laneOffset =
          c.type === "junction"
            ? direction % 2 === 0
              ? [0, -0.06]
              : [0.06, 0]
            : [0, 0];
      const curve =
        c.type === "belt"
          ? BeltGeometry.sample(
              item.entrySide ??
                app.game.side(c, [c.x + from[0], c.y + from[1]]),
              c.dir,
              p,
            )
          : null;
      const wx = curve
          ? c.x + curve[0]
          : c.x +
            0.5 +
            (p < 0.5 ? from[0] * (0.5 - p) : d[0] * (p - 0.5)) +
            laneOffset[0],
        wy = curve
          ? c.y + curve[1]
          : c.y +
            0.5 +
            (p < 0.5 ? from[1] * (0.5 - p) : d[1] * (p - 0.5)) +
            laneOffset[1];
      const [x, y] = app.screen(
        (item.previousX ?? wx) +
          (wx - (item.previousX ?? wx)) * app.interpolation,
        (item.previousY ?? wy) +
          (wy - (item.previousY ?? wy)) * app.interpolation,
      );
      Art.draw(
        app.ctx,
        Art.items[item.type],
        x - s * 0.2,
        y - s * 0.2,
        s * 0.4,
      );
    }
  }

  const preview = app.drag?.stroke
    ? app.drag.stroke.preview(app.game)
    : app.hover && app.tool
      ? {
          entries: [
            app.pending
              ? {
                  ...app.game.planPlacement(
                    app.tool,
                    app.hover.x,
                    app.hover.y,
                    app.pending.dir,
                  ),
                  error: app.game.validatePair(
                    app.pending.x,
                    app.pending.y,
                    app.hover.x,
                    app.hover.y,
                    app.pending.dir,
                  ),
                }
              : app.game.planPlacement(
                  app.tool,
                  app.hover.x,
                  app.hover.y,
                  app.dir,
                ),
          ],
          cost: {},
        }
      : null;
  if (preview) {
    for (const p of preview.entries) {
      const size = Factory.BUILDINGS[p.type]?.size || p.old?.size || 1,
        color = p.error
          ? "#e78585"
          : p.action === "replace" || p.action === "rotate"
            ? "#91b8e4"
            : "#a6cfab";
      const positions =
        p.kind === "pair"
          ? [
              [p.x, p.y],
              [p.ex, p.ey],
            ]
          : [[p.x, p.y]];
      for (const [tx, ty] of positions) {
        const [x, y] = app.screen(tx, ty);
        if (x + size * s < 0 || y + size * s < 0 || x > w || y > h) continue;
        app.ctx.globalAlpha = 0.45;
        if (p.type !== "demolish") {
          app.ctx.save();
          app.ctx.translate(x + (size * s) / 2, y + (size * s) / 2);
          app.ctx.rotate(
            Factory.TRANSPORT.has(p.type) &&
              Factory.BUILDINGS[p.type]?.rotatable
              ? (p.dir * Math.PI) / 2
              : 0,
          );
          Art.draw(
            app.ctx,
            Art.buildings[p.type],
            (-size * s) / 2,
            (-size * s) / 2,
            size * s,
          );
          app.ctx.restore();
        }
        app.ctx.globalAlpha = 1;
        app.ctx.strokeStyle = color;
        app.ctx.lineWidth = 1.5;
        app.ctx.fillStyle = color + "20";
        app.ctx.fillRect(x + 1, y + 1, size * s - 2, size * s - 2);
        app.ctx.strokeRect(x + 1, y + 1, size * s - 2, size * s - 2);
        if (Factory.BUILDINGS[p.type]?.rotatable)
          app.arrow(x + (size * s) / 2, y + (size * s) / 2, p.dir, s, color);
      }
      if (p.kind === "pair") {
        const [a, b] = app.screen(p.x + 0.5, p.y + 0.5),
          [c, d] = app.screen(p.ex + 0.5, p.ey + 0.5);
        app.ctx.strokeStyle = color;
        app.ctx.setLineDash([4, 5]);
        app.ctx.beginPath();
        app.ctx.moveTo(a, b);
        app.ctx.lineTo(c, d);
        app.ctx.stroke();
        app.ctx.setLineDash([]);
      }
    }
  }

  if (app.pending) {
    const [px, py] = app.screen(app.pending.x, app.pending.y),
      [hx, hy] = app.screen(
        app.hover?.x ?? app.pending.x,
        app.hover?.y ?? app.pending.y,
      );
    app.ctx.strokeStyle = "#c1a3f2";
    app.ctx.setLineDash([6, 6]);
    app.ctx.beginPath();
    app.ctx.moveTo(px + s / 2, py + s / 2);
    app.ctx.lineTo(hx + s / 2, hy + s / 2);
    app.ctx.stroke();
    app.ctx.setLineDash([]);
    app.ctx.strokeRect(px + 2, py + 2, s - 4, s - 4);
  }
}
