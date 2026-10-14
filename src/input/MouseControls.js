import * as BuildStroke from "../input/BuildStroke.js";

export function initializeMouseControls(app) {
  app.canvas.oncontextmenu = (e) => {
    e.preventDefault();
    app.cancel();
  };
  app.canvas.onpointerdown = (e) => {
    if (e.button === 2) return;
    app.hover = app.tile(e);
    app.canvas.setPointerCapture(e.pointerId);
    const pan = e.button === 1 || !app.tool;
    app.drag = { pan, x: e.clientX, y: e.clientY };
    if (pan) {
      if (e.button === 0) {
        app.selected = app.game.grid.get(app.hover.x, app.hover.y) || null;
        app.showInspection(true);
      }
      return;
    }
    app.selected = null;
    app.showInspection(true);
    app.drag.stroke = new BuildStroke.Stroke(
      app.tool,
      app.hover.x,
      app.hover.y,
      app.dir,
    );
    app.strokePreview = app.drag.stroke.preview(app.game);
  };
  app.canvas.onpointermove = (e) => {
    app.hover = app.tile(e);
    if (!app.drag) return;
    if (app.drag.pan) {
      app.cam.x -= (e.clientX - app.drag.x) / app.cam.scale;
      app.cam.y -= (e.clientY - app.drag.y) / app.cam.scale;
      app.drag.x = e.clientX;
      app.drag.y = e.clientY;
    } else {
      const p = {
        x: Math.max(-1, Math.min(app.game.config.width, app.hover.x)),
        y: Math.max(-1, Math.min(app.game.config.height, app.hover.y)),
      };
      app.drag.stroke.extend(p.x, p.y);
      app.strokePreview = app.drag.stroke.preview(app.game);
    }
  };
  app.canvas.onpointerup = (e) => {
    if (!app.drag) return;
    const hit =
      e?.clientX !== undefined
        ? document.elementFromPoint?.(e.clientX, e.clientY)
        : null;
    if (
      hit?.closest?.(
        "button,dialog,#build-palette,#building-panel,#inventory-panel",
      )
    ) {
      app.drag = null;
      app.strokePreview = null;
      return;
    }
    if (!app.drag.pan) {
      if (e?.clientX !== undefined) app.canvas.onpointermove(e);
      if (app.tool === "underground" && (!app.drag.stroke.moved || app.pending))
        app.build(app.hover);
      else {
        const result = app.drag.stroke.commit(app.game);
        if (result.skipped)
          app.message(`${result.placed} placed · ${result.skipped} blocked`);
        else if (result.placed > 1) app.message(`${result.placed} placed`);
      }
    }
    app.drag = null;
    app.strokePreview = null;
    app.palette();
  };
  app.canvas.onpointercancel = () => {
    app.drag = null;
    app.strokePreview = null;
  };
  app.canvas.onpointerleave = () => {
    if (!app.drag) app.hover = null;
  };
  app.canvas.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      app.zoom(Math.exp(-e.deltaY * 0.001));
    },
    { passive: false },
  );
}
