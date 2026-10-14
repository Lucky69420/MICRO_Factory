import * as Factory from "../data/index.js";

export function updateAffordability(app) {
  document
    .querySelectorAll(".build")
    .forEach((b) =>
      b.classList.toggle(
        "unaffordable",
        app.game.missing(b.dataset.tool).length > 0,
      ),
    );
}

export function updateUI(app, now) {
  app.$("toast").style.opacity = now < app.toastUntil ? 1 : 0;
  if (now - app.uiStamp > 0.15) {
    app.uiStamp = now;
    app.updateInventory();
    app.showInspection();
    app.updateAffordability();
  }

  const preview = app.drag?.stroke?.preview(app.game);
  if (preview) {
    const text = Object.entries(preview.cost)
      .map(([r, n]) => n + " " + Factory.RESOURCES[r].name)
      .join(" · ");
    app.$("drag-summary").textContent =
      preview.entries.filter((p) => !p.error).length +
      " valid" +
      (text ? " · " + text : "");
    app.$("drag-summary").hidden = false;
  } else app.$("drag-summary").hidden = true;
}
