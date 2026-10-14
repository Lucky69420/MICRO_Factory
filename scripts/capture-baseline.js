import { createRequire } from "node:module";
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const source = process.argv[2];
if (!source)
  throw new Error(
    "Pass the original checkout's dist directory; do not regenerate baselines from refactored code.",
  );
const API = require(path.resolve(source, "save.js"));
const { runBaselines, legacySave } = require("../tests/support/scenarios.cjs");
mkdirSync("tests/fixtures", { recursive: true });
for (const [name, value] of Object.entries({
  "original-baseline": runBaselines(API),
  "legacy-v2-save": legacySave(API),
})) {
  writeFileSync(
    `tests/fixtures/${name}.json`,
    JSON.stringify(value, null, 2) + "\n",
  );
}
console.log(
  "Captured original simulation checkpoints and a populated v2 save.",
);
