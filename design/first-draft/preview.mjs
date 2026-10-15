import { build } from "esbuild";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
const root = fileURLToPath(new URL("../../", import.meta.url));
const output = resolve(root, ".local/design-preview");
await mkdir(output, { recursive: true });
await build({
  entryPoints: [resolve(root, "design/first-draft/app.tsx")],
  outfile: resolve(output, "app.js"),
  bundle: true,
  platform: "browser",
  format: "esm",
  jsx: "automatic",
  minify: true,
  external: ["/assets/*"],
  define: { "process.env.NODE_ENV": '"production"' },
});
const files = new Map([
  [
    "/",
    [
      resolve(root, "design/first-draft/index.html"),
      "text/html; charset=utf-8",
    ],
  ],
  [
    "/assets/app.js",
    [resolve(output, "app.js"), "text/javascript; charset=utf-8"],
  ],
  ["/assets/app.css", [resolve(output, "app.css"), "text/css; charset=utf-8"]],
  [
    "/assets/sans.woff2",
    [
      resolve(
        root,
        "node_modules/@fontsource-variable/instrument-sans/files/instrument-sans-latin-wght-normal.woff2",
      ),
      "font/woff2",
    ],
  ],
  [
    "/assets/mono.woff2",
    [
      resolve(
        root,
        "node_modules/@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2",
      ),
      "font/woff2",
    ],
  ],
]);
const server = createServer(async (req, res) => {
  if (req.method !== "GET") {
    res.writeHead(405);
    res.end();
    return;
  }
  let requestUrl;
  try {
    requestUrl = new URL(req.url, "http://localhost");
  } catch {
    res.writeHead(400);
    res.end("Invalid request target");
    return;
  }
  const file = files.get(requestUrl.pathname);
  if (!file) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }
  try {
    const content = await readFile(file[0]);
    res.writeHead(200, {
      "Content-Type": file[1],
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    res.end(content);
  } catch {
    res.writeHead(500);
    res.end("Preview asset unavailable");
  }
});
const port = Number(process.env.PORT || 4173);
server.listen(port, "127.0.0.1", () =>
  console.log(
    `Hark design draft: http://127.0.0.1:${port} — synthetic data only`,
  ),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => server.close(() => process.exit(0)));
