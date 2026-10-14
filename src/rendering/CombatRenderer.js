export function drawCombat(app, xmin, ymin, xmax, ymax) {
  const s = app.cam.scale,
    a = app.game.spawner;
  const visible = (x, y, r = 1) =>
    x + r > xmin && x - r < xmax && y + r > ymin && y - r < ymax;
  if (visible(a.x + 1.5, a.y + 1.5, 2)) {
    const [x, y] = app.screen(a.x, a.y);
    app.ctx.fillStyle = "#733d4a";
    app.ctx.fillRect(x + 2, y + 2, 3 * s - 4, 3 * s - 4);
    app.ctx.strokeStyle = "#ec827c";
    app.ctx.strokeRect(x + 2, y + 2, 3 * s - 4, 3 * s - 4);
    app.ctx.fillStyle = "#efad9a";
    app.ctx.font = `bold ${s * 0.24}px system-ui`;
    app.ctx.textAlign = "center";
    app.ctx.fillText("SPAWNER", x + 1.5 * s, y + 1.4 * s);
    app.ctx.font = `${s * 0.18}px system-ui`;
    app.ctx.fillText(
      app.game.combat.enabled ? "ACTIVE" : "OFF",
      x + 1.5 * s,
      y + 1.8 * s,
    );
  }
  for (const e of app.game.combat.enemies.values()) {
    if (!visible(e.x, e.y)) continue;
    const [x, y] = app.screen(
      e.previousX + (e.x - e.previousX) * app.interpolation,
      e.previousY + (e.y - e.previousY) * app.interpolation,
    );
    app.ctx.fillStyle = "#ed8277";
    app.ctx.fillRect(x - s * 0.23, y - s * 0.23, s * 0.46, s * 0.46);
    app.ctx.fillStyle = "#552f3e";
    app.ctx.fillRect(x - s * 0.14, y - s * 0.08, s * 0.1, s * 0.1);
    app.ctx.fillRect(x + s * 0.04, y - s * 0.08, s * 0.1, s * 0.1);
    app.ctx.fillStyle = "#202532";
    app.ctx.fillRect(x - s * 0.3, y - s * 0.4, s * 0.6, 3);
    app.ctx.fillStyle = "#ee9382";
    app.ctx.fillRect(x - s * 0.3, y - s * 0.4, (s * 0.6 * e.hp) / e.maxHp, 3);
  }
  for (const p of app.game.combat.projectiles) {
    if (!visible(p.x, p.y)) continue;
    const [x, baseY] = app.screen(
      p.previousX + (p.x - p.previousX) * app.interpolation,
      p.previousY + (p.y - p.previousY) * app.interpolation,
    );
    const arc = p.artillery
        ? Math.sin((Math.PI * p.elapsed) / p.duration) * s * 2
        : 0,
      y = baseY - arc;
    if (p.artillery) {
      app.ctx.fillStyle = "#00000055";
      app.ctx.fillRect(x - 3, baseY - 2, 6, 4);
    }
    app.ctx.fillStyle = p.color || "#ffdf87";
    app.ctx.beginPath();
    app.ctx.arc(
      x,
      y,
      Math.max(2, s * (p.artillery ? 0.18 : 0.065)),
      0,
      Math.PI * 2,
    );
    app.ctx.fill();
  }
  for (const e of app.game.combat.effects) {
    if (!visible(e.x, e.y, e.radius || 1)) continue;
    const [x, y] = app.screen(e.x, e.y);
    app.ctx.strokeStyle = e.color;
    app.ctx.beginPath();
    app.ctx.arc(
      x,
      y,
      s *
        (e.radius ? e.radius * (1 - e.time / e.duration) : 0.4 - e.time * 0.5),
      0,
      Math.PI * 2,
    );
    app.ctx.stroke();
  }
}
