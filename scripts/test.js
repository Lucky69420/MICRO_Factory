import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";

const suites = readdirSync("tests").filter(
  (file) =>
    file.endsWith(".cjs") &&
    !["flat-fixture.cjs", "performance.cjs"].includes(file),
);
for (const suite of suites) {
  const result = spawnSync(
    process.execPath,
    ["--experimental-vm-modules", `tests/${suite}`],
    { stdio: "inherit", env: { ...process.env, NODE_NO_WARNINGS: "1" } },
  );
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log(`${suites.length} regression suites passed.`);
