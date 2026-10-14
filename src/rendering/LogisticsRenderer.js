import { Art } from "../rendering/Art.js";

import * as BeltGeometry from "../logistics/BeltGeometry.js";

export function arrow(app, cx, cy, d, s, color) {
  app.ctx.save();
  app.ctx.translate(cx, cy);
  app.ctx.rotate((d * Math.PI) / 2);
  app.ctx.strokeStyle = color;
  app.ctx.lineWidth = Math.max(1.5, s * 0.05);
  app.ctx.beginPath();
  app.ctx.moveTo(-s * 0.21, 0);
  app.ctx.lineTo(s * 0.2, 0);
  app.ctx.moveTo(s * 0.04, -s * 0.13);
  app.ctx.lineTo(s * 0.2, 0);
  app.ctx.lineTo(s * 0.04, s * 0.13);
  app.ctx.stroke();
  app.ctx.restore();
}
export function drawLogistics(app, b, x, y, s) {
  if (b.type === "belt") {
    Art.draw(
      app.ctx,
      Art.belts[b.dir + "-" + (b.beltMask || 0)],
      x,
      y,
      Math.round(x + s) - Math.round(x),
      Math.round(y + s) - Math.round(y),
    );
    let ax = x + s / 2,
      ay = y + s / 2;
    if (b.beltShape === "curve") {
      const entry = [0, 1, 2, 3].find((i) => b.beltInputMask & (1 << i)),
        mid = BeltGeometry.sample(entry, b.dir, 0.55);
      ax = x + mid[0] * s;
      ay = y + mid[1] * s;
    }
    app.arrow(ax, ay, b.dir, s * 0.8, "#bfe1d5");
    return;
  }
  app.ctx.save();
  app.ctx.translate(x + s / 2, y + s / 2);
  if (!["junction", "router"].includes(b.type))
    app.ctx.rotate((b.dir * Math.PI) / 2);
  Art.draw(app.ctx, Art.buildings[b.type], -s / 2, -s / 2, s);
  app.ctx.restore();
  const cx = x + s / 2,
    cy = y + s / 2;
  if (b.type === "splitter") {
    app.arrow(cx, cy, (b.dir + 3) % 4, s, "#c7dfa0");
    app.arrow(cx, cy, (b.dir + 1) % 4, s, "#c7dfa0");
  } else if (!["junction", "router"].includes(b.type))
    app.arrow(
      cx,
      cy,
      b.dir,
      s,
      b.type === "underground" ? "#e5cbff" : "#bfe1d5",
    );
  if (b.type === "underground") {
    app.ctx.font = `bold ${s * 0.16}px system-ui`;
    app.ctx.textAlign = "left";
    app.ctx.fillStyle = "#dfc8f1";
    app.ctx.fillText(
      b.mode === "entrance" ? "IN" : "OUT",
      x + s * 0.12,
      y + s * 0.25,
    );
  }
}
