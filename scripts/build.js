import { cp, mkdir, rm } from "node:fs/promises";

// A static copy only: native ES modules run in both development and Pages.
await rm("dist", { recursive: true, force: true });
await mkdir("dist");
for (const entry of ["index.html", "src", "styles"]) {
  await cp(entry, `dist/${entry}`, { recursive: true });
}
for (const entry of ["assets", "licenses"]) {
  await cp(`public/${entry}`, `dist/${entry}`, { recursive: true });
}
console.log("Built static game in dist/.");
