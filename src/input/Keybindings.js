import { defaultBindings, token } from "../data/keybindings.js";

export function bindingNotice(app, text) {
  app.$("binding-feedback").textContent = text;
}
export function bindControls(app) {
  for (const id of Object.keys(app.bindings)) {
    const input = app.$("binding-" + id);
    input.value = app.bindings[id];
    input.onkeydown = (e) => {
      if (e.key === "Tab") return;
      e.preventDefault();
      e.stopPropagation?.();
      const value = token(e);
      if (
        e.ctrlKey ||
        e.altKey ||
        e.metaKey ||
        !(
          /^(shift\+)?[a-z]$/.test(value) || ["space", "escape"].includes(value)
        )
      ) {
        app.bindingNotice(
          "Use a letter, Space, Escape, or Shift + letter. Numbers select slots.",
        );
        return;
      }
      if (
        Object.entries(app.bindings).some(([k, v]) => k !== id && v === value)
      ) {
        app.bindingNotice("That key is already assigned.");
        return;
      }
      app.bindings[id] = value;
      app.bindingNotice("Updated " + id + " to " + value.toUpperCase() + ".");
      app.keys.clear();
      try {
        localStorage.setItem(
          "microfactory.bindings",
          JSON.stringify(app.bindings),
        );
      } catch {}
      app.bindControls();
      app.palette();
    };
  }
}

export function initializeKeybindings(app) {
  try {
    const saved = JSON.parse(
      localStorage.getItem("microfactory.bindings") || "{}",
    );
    for (const [k, v] of Object.entries(saved))
      if (k in app.bindings && typeof v === "string") app.bindings[k] = v;
  } catch {}
  app.$("reset-bindings").onclick = () => {
    app.bindings = { ...defaultBindings };
    app.bindingNotice("Default controls restored.");
    app.keys.clear();
    try {
      localStorage.setItem(
        "microfactory.bindings",
        JSON.stringify(app.bindings),
      );
    } catch {}
    app.bindControls();
    app.palette();
  };
  app.bindControls();
  app.palette();
}
