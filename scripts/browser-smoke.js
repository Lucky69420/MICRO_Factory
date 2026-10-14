import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const baseURL = process.env.BASE_URL || "http://localhost:4173/MICRO_Factory/";
const server = process.env.BASE_URL
  ? null
  : spawn(process.execPath, ["scripts/serve.js", "--dist"], {
      env: { ...process.env, PORT: "4173" },
      stdio: "inherit",
    });
let browser;
try {
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      if ((await fetch(baseURL)).ok) break;
    } catch {
      /* Server is starting. */
    }
    if (attempt === 49) throw new Error("Static server did not start.");
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400 && !response.url().endsWith("favicon.ico"))
      errors.push(`${response.status()} ${response.url()}`);
  });
  await page.goto(baseURL);
  await page.locator("#palette-grid [data-tool='belt']").waitFor();
  await page.waitForLoadState("networkidle");
  assert.equal(await page.title(), "Micro Factory");
  assert.equal(await page.locator("#inventory-panel").isVisible(), false);
  await page.locator("#inventory-button").click();
  assert.equal(await page.locator("#stock-iron_ingot").textContent(), "100");
  await page.locator("#inventory-button").click();
  await page.locator("#pause").click();
  assert.equal(await page.locator("#pause").textContent(), "▶");
  await page.locator("#settings-button").click();
  await page.locator("#new-world-button").click();
  await page.locator("#seed-input").fill("browser-refactor-regression");
  await page.locator("#confirm-world").click();
  await page.locator("#settings-dialog").waitFor({ state: "hidden" });
  // Home camera is at (73.5, 124), with 36px tiles. Guaranteed starting land.
  const point = { x: 640, y: 346 }; // tile (73, 122)
  await page.locator("#category-defense").click();
  await page.locator("#palette-grid [data-tool='wall']").click();
  await page.mouse.click(point.x, point.y);
  await page.keyboard.press("Escape");
  await page.mouse.click(point.x, point.y);
  assert.equal(await page.locator("#building-name").textContent(), "Wall");
  assert.equal(
    await page.locator("#building-hp").textContent(),
    "200 / 200 HP",
  );
  await page.locator("#inventory-button").click();
  // Inventory is intentionally refreshed on the existing 150ms UI cadence.
  await page.locator("#stock-iron_ingot").filter({ hasText: /^95$/ }).waitFor();
  assert.equal(await page.locator("#stock-iron_ingot").textContent(), "95");
  await page.locator("#inventory-button").click();
  await page.locator("#settings-button").click();
  await page.locator("#save-factory").click();
  assert.equal(await page.locator("#toast").textContent(), "Factory saved.");
  await page.locator("#settings-dialog form button").click();
  await page.keyboard.press("x");
  await page.mouse.click(point.x, point.y);
  await page.keyboard.press("Escape");
  await page.mouse.click(point.x, point.y);
  assert.equal(await page.locator("#building-panel").isVisible(), false);
  await page.locator("#settings-button").click();
  await page.locator("#load-factory").click();
  assert.equal(
    await page.locator("#toast").textContent(),
    "Saved factory loaded.",
  );
  await page.locator("#grid-toggle").uncheck();
  await page.locator("#settings-dialog form button").click();
  await page.mouse.click(point.x, point.y);
  assert.equal(await page.locator("#building-name").textContent(), "Wall");
  await page.waitForLoadState("networkidle");
  const brokenImages = await page
    .locator("img")
    .evaluateAll((images) =>
      images
        .filter((image) => !image.complete || !image.naturalWidth)
        .map((image) => image.src),
    );
  assert.deepEqual(brokenImages, []);
  await mkdir("test-results", { recursive: true });
  await page.screenshot({ path: "test-results/browser-desktop.png" });
  await page.reload();
  await page.locator("#palette-grid [data-tool='belt']").waitFor();
  await page.locator("#settings-button").click();
  assert.equal(await page.locator("#grid-toggle").isChecked(), false);
  await page.locator("#settings-dialog form button").click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "test-results/browser-mobile.png" });
  assert.deepEqual(errors, [], "Browser errors or missing assets");
  await context.close();
  console.log(
    "PASS: Chromium native modules under /MICRO_Factory/, assets, controls, construction/costs, inspection, save/load, setting persistence and desktop/mobile layouts.",
  );
} finally {
  await browser?.close();
  server?.kill();
}
