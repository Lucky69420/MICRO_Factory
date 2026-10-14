import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const ignored = new Set([
  ".git",
  "node_modules",
  "dist",
  "coverage",
  "test-results",
]);
const extensions = new Set([
  ".js",
  ".cjs",
  ".mjs",
  ".css",
  ".html",
  ".ts",
  ".tsx",
  ".jsx",
  ".json",
  ".svg",
  ".yml",
  ".yaml",
  ".md",
  ".txt",
]);
const generated = new Set(["package-lock.json"]);

async function inspect(directory) {
  const report = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    // Imported artwork and verbatim upstream license texts are not maintained sources.
    if (
      ignored.has(entry.name) ||
      file.startsWith("public/licenses/") ||
      generated.has(file)
    )
      continue;
    if (entry.isDirectory()) report.push(...(await inspect(file)));
    else if (extensions.has(path.extname(file))) {
      const content = await readFile(file, "utf8");
      const lines = content.split("\n").length - Number(content.endsWith("\n"));
      report.push({ file, lines });
    }
  }
  return report;
}

const report = (await inspect(".")).sort((a, b) => b.lines - a.lines);
const oversized = report.filter(({ lines }) => lines > 1000);
for (const { file, lines } of oversized)
  console.error(`${file}: ${lines} lines (limit 1,000)`);
console.log(
  `${report.length} maintained files checked; largest: ${report[0].file} (${report[0].lines} lines).`,
);
if (process.argv.includes("--report"))
  for (const { file, lines } of report)
    console.log(`${String(lines).padStart(4)}  ${file}`);
if (oversized.length) process.exitCode = 1;
