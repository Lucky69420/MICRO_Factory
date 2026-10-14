import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(process.argv.includes("--dist") ? "dist" : ".");
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".txt": "text/plain",
};
const port = Number(process.env.PORT || 5173);
createServer(async (request, response) => {
  try {
    let name = decodeURIComponent(
      new URL(request.url, "http://localhost").pathname,
    );
    // Also exercise GitHub Pages' repository subdirectory during local checks.
    name = name.replace(/^\/MICRO_Factory(?=\/)/, "");
    if (name.endsWith("/")) name += "index.html";
    if (root === path.resolve(".") && /^\/(assets|licenses)\//.test(name))
      name = "/public" + name;
    const file = path.resolve(root, "." + name);
    if (!file.startsWith(root + path.sep)) {
      response.writeHead(403).end();
      return;
    }
    const data = await readFile(file);
    response.writeHead(200, {
      "Content-Type": types[path.extname(file)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    response.end(data);
  } catch {
    response.writeHead(404).end("Not found");
  }
}).listen(port, "0.0.0.0", () =>
  console.log(`Micro Factory: http://localhost:${port}/MICRO_Factory/`),
);
