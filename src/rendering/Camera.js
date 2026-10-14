export function screen(app, x, y) {
  return [
    (x - app.cam.x) * app.cam.scale + app.canvas.clientWidth / 2,
    (y - app.cam.y) * app.cam.scale + app.canvas.clientHeight / 2,
  ];
}
export function tile(app, e) {
  const r = app.canvas.getBoundingClientRect();
  return {
    x: Math.floor(
      (e.clientX - r.left - app.canvas.clientWidth / 2) / app.cam.scale +
        app.cam.x,
    ),
    y: Math.floor(
      (e.clientY - r.top - app.canvas.clientHeight / 2) / app.cam.scale +
        app.cam.y,
    ),
  };
}
export function zoom(app, f) {
  app.cam.scale = Math.max(6, Math.min(90, app.cam.scale * f));
}
