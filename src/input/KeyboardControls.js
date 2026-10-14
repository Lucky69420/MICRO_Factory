import { token } from "../data/keybindings.js";

export function initializeKeyboardControls(app) {
  window.onkeydown = (e) => {
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    if (
      ["INPUT", "SELECT", "TEXTAREA"].includes(e.target?.tagName) ||
      e.target?.isContentEditable
    )
      return;
    if (app.$("settings-dialog").open || app.$("new-world-dialog").open) return;
    const k = token(e);
    const action = Object.keys(app.bindings).find((a) => app.bindings[a] === k);
    if (action || /^[0-9]$/.test(k) || k.startsWith("arrow"))
      e.preventDefault();
    app.keys.add(k);
    if (e.repeat) return;
    if (action in app.categories) {
      app.setCategory(action);
      return;
    }
    if (/^[0-9]$/.test(k)) {
      const id = app.categoryTools(app.category)[
        app.palettePage * 10 + (Number(k) || 10) - 1
      ];
      if (id) app.select(id);
      return;
    }
    if (action === "clockwise") app.rotate(1);
    else if (action === "counterclockwise") app.rotate(-1);
    else if (action === "cancel") app.cancel();
    else if (action === "demolish") app.select("demolish");
    else if (action === "pause") app.$("pause").click();
  };
  window.onkeyup = (e) => {
    for (const k of app.keys)
      if (
        k === token(e) ||
        k === e.key.toLowerCase() ||
        k.endsWith("+" + e.key.toLowerCase())
      )
        app.keys.delete(k);
  };
  window.onblur = () => {
    app.keys.clear();
    app.drag = null;
    app.strokePreview = null;
  };
  document.addEventListener("visibilitychange", () => {
    app.last = 0;
    app.clock.reset();
    app.keys.clear();
    app.drag = null;
    app.strokePreview = null;
    app.game.freezeInterpolation();
  });
}
