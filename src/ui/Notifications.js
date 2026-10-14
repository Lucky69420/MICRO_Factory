export function message(app, t) {
  app.$("toast").textContent = t;
  app.toastUntil = performance.now() / 1000 + 3;
}
