import * as Factory from "../data/index.js";

export function rotate(app, step = 1) {
  if (!app.tool && app.selected) {
    if (app.game.rotateBuilding(app.selected, app.selected.dir + step))
      app.showInspection(true);
    return;
  }
  if (!Factory.BUILDINGS[app.tool]?.rotatable) return;
  app.dir = (app.dir + step + 4) % 4;
  if (app.pending) app.pending.dir = app.dir;
  if (app.drag?.stroke) {
    app.drag.stroke.dir = app.dir;
    app.drag.stroke.manualDirection = true;
    app.strokePreview = app.drag.stroke.preview(app.game);
  }
  app.$("rotate").textContent = ["→", "↓", "←", "↑"][app.dir];
  app.$("rotate-back").textContent = "↶";
}
export function build(app, t) {
  if (app.tool === "underground") {
    if (!app.pending) {
      const error = app.game.validate(app.tool, t.x, t.y, app.dir);
      if (error) {
        app.message(error);
        return;
      }
      app.pending = { ...t, dir: app.dir };
      app.message("Choose an exit, or drag to lay a tunnel.");
    } else {
      const error = app.game.placePair(
        app.pending.x,
        app.pending.y,
        t.x,
        t.y,
        app.pending.dir,
      );
      if (error) app.message(error);
      else app.pending = null;
    }
    return;
  }
  const error = app.game.place(app.tool, t.x, t.y, app.dir);
  if (error) app.message(error);
}
