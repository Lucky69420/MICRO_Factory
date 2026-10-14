import { TerrainArt } from "../rendering/TerrainArt.js";

import { randomSeed } from "../utils/randomSeed.js";

export function initializeSettingsMenu(app) {
  try {
    app.settings.showGrid =
      localStorage.getItem("microfactory.showGrid") !== "false";
    app.settings.creative =
      localStorage.getItem("microfactory.creative") === "true";
  } catch {}
  app.game.setCreative(app.settings.creative);
  document.documentElement?.classList.toggle(
    "creative-mode",
    app.settings.creative,
  );
  app.$("creative-toggle").checked = app.settings.creative;
  app.$("creative-toggle").onchange = () => {
    app.settings.creative = app.$("creative-toggle").checked;
    app.game.setCreative(app.settings.creative);
    document.documentElement?.classList.toggle(
      "creative-mode",
      app.settings.creative,
    );
    try {
      localStorage.setItem(
        "microfactory.creative",
        String(app.settings.creative),
      );
    } catch {}
    app.message(
      app.settings.creative
        ? "Creative Mode: construction is free."
        : "Creative Mode off: normal construction costs restored.",
    );
  };
  app.$("enemy-toggle").onchange = () => {
    app.settings.enemies = app.$("enemy-toggle").checked;
    app.game.setEnemiesEnabled(app.settings.enemies);
    app.message(
      app.settings.enemies
        ? "Enemy spawning enabled."
        : "Spawning disabled. Existing enemies remain active.",
    );
  };
  app.$("clear-enemies").onclick = () => {
    app.game.clearEnemies();
    app.message("Enemies cleared. Factory buildings are unchanged.");
  };
  app.$("locate-spawner").onclick = () => {
    app.cam.x = app.game.spawner.x + 1.5;
    app.cam.y = 8;
    app.$("settings-dialog").close();
  };
  app.$("grid-toggle").checked = app.settings.showGrid;
  app.$("save-factory").onclick = () => {
    try {
      localStorage.setItem(
        "microfactory.factory",
        JSON.stringify(app.game.save()),
      );
      app.message("Factory saved.");
    } catch {
      app.message("Could not save this factory. Browser storage may be full.");
    }
  };
  app.$("load-factory").onclick = () => {
    try {
      const saved = localStorage.getItem("microfactory.factory");
      if (!saved) {
        app.message("No saved factory yet.");
        return;
      }
      const restored = app.Game.fromSave(JSON.parse(saved));
      app.game = restored;
      app.settings.creative = app.game.creative;
      app.settings.enemies = app.game.combat.enabled;
      app.$("creative-toggle").checked = app.settings.creative;
      app.$("enemy-toggle").checked = app.settings.enemies;
      document.documentElement?.classList.toggle(
        "creative-mode",
        app.settings.creative,
      );
      TerrainArt.reset?.();
      app.clock.reset();
      app.last = 0;
      app.cancel();
      app.$("world-seed").textContent = app.game.seed;
      app.cam.x = app.game.depot.x + 0.5;
      app.cam.y = app.game.depot.y - 1;
      app.updateInventory();
      app.message("Saved factory loaded.");
    } catch {
      app.message("Could not load this save. Current factory retained.");
    }
  };
  app.$("grid-toggle").onchange = () => {
    app.settings.showGrid = app.$("grid-toggle").checked;
    try {
      localStorage.setItem(
        "microfactory.showGrid",
        String(app.settings.showGrid),
      );
    } catch {}
  };
  app.$("settings-button").onclick = () => {
    app.$("world-seed").textContent = app.game.seed;
    app.$("settings-dialog").showModal();
  };
  app.$("inventory-button").onclick = () => {
    const panel = app.$("inventory-panel");
    panel.hidden = !panel.hidden;
    app
      .$("inventory-button")
      .setAttribute("aria-expanded", String(!panel.hidden));
  };
  app.$("new-world-button").onclick = () => {
    app.$("seed-input").value = randomSeed();
    app.$("new-world-dialog").showModal();
  };
  app.$("random-seed").onclick = () => {
    app.$("seed-input").value = randomSeed();
  };
  app.$("cancel-world").onclick = () => app.$("new-world-dialog").close();
  app.$("confirm-world").onclick = () => {
    const seed = app.$("seed-input").value.trim() || randomSeed();
    app.game = new app.Game({ seed, creative: app.settings.creative });
    app.game.setEnemiesEnabled(app.settings.enemies);
    app.selected = null;
    app.pending = null;
    app.tool = null;
    app.drag = null;
    app.hover = null;
    app.keys.clear();
    app.last = 0;
    app.clock.reset();
    app.paused = false;
    app.strokePreview = null;
    app.$("pause").textContent = "Ⅱ";
    document
      .querySelectorAll(".build")
      .forEach((b) => b.classList.toggle("active", false));
    app.$("home").click();
    app.$("world-seed").textContent = app.game.seed;
    app.updateInventory();
    app.palette();
    app.showInspection(true);
    app.$("new-world-dialog").close();
    app.$("settings-dialog").close();
    app.message("New world generated: " + app.game.seed);
  };
  app.$("debug-toggle").onchange = () => {
    app.settings.debug = app.$("debug-toggle").checked;
    app.$("debug-overlay").hidden = !app.settings.debug;
  };
}
