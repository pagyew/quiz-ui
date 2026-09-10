import { cp, mkdir, readFile, readdir, rm, stat } from "node:fs/promises";
import { watch } from "node:fs";
import { createServer } from "node:http";
import {
  dirname,
  extname,
  isAbsolute,
  relative,
  resolve,
  sep,
} from "node:path";
import { fileURLToPath } from "node:url";

export interface BuildOptions {
  sourceDir?: string;
  outDir?: string;
}

/** Copy the app and this installed package into a self-contained static site. */
export async function buildSite({
  sourceDir = "site",
  outDir = "dist",
}: BuildOptions = {}): Promise<void> {
  const source = resolve(sourceDir),
    output = resolve(outDir);
  const relativeSource = relative(output, source),
    relativeOutput = relative(source, output);
  if (
    source === output ||
    relativeSource === "" ||
    (!relativeSource.startsWith(`..${sep}`) &&
      relativeSource !== ".." &&
      !isAbsolute(relativeSource)) ||
    (!relativeOutput.startsWith(`..${sep}`) &&
      relativeOutput !== ".." &&
      !isAbsolute(relativeOutput))
  )
    throw new Error(
      "Source and output must be separate, non-nested directories",
    );
  if (output === dirname(output) || output === process.cwd())
    throw new Error("Refusing to replace a root or working directory");
  await stat(source);
  await rm(output, { recursive: true, force: true });
  await cp(source, output, { recursive: true });
  const vendor = resolve(output, "vendor/quiz-ui");
  await mkdir(vendor, { recursive: true });
  const packageDist = dirname(fileURLToPath(import.meta.url));
  for (const entry of await readdir(packageDist, { withFileTypes: true })) {
    if (entry.isDirectory() && entry.name === "themes")
      await cp(resolve(packageDist, entry.name), resolve(vendor, entry.name), {
        recursive: true,
      });
    if (
      entry.isFile() &&
      (entry.name.endsWith(".js") ||
        entry.name.endsWith(".js.map") ||
        entry.name.endsWith(".css")) &&
      !entry.name.startsWith("node.")
    )
      await cp(resolve(packageDist, entry.name), resolve(vendor, entry.name));
  }
}

export interface ServeOptions {
  directory?: string;
  port?: number;
  host?: string;
  watchSource?: string;
}

/** A local development server. Deployment remains the responsibility of the app. */
export async function serveSite({
  directory = "dist",
  port = 4173,
  host = "127.0.0.1",
  watchSource,
}: ServeOptions = {}) {
  const root = resolve(directory);
  const mime: Record<string, string> = {
    ".html": "text/html",
    ".css": "text/css",
    ".js": "text/javascript",
    ".json": "application/json",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".webp": "image/webp",
    ".woff2": "font/woff2",
    ".ico": "image/x-icon",
  };
  let rebuilding: Promise<void> = Promise.resolve();
  let watcher: ReturnType<typeof watch> | undefined;
  let debounce: ReturnType<typeof setTimeout> | undefined;
  const server = createServer(async (request, response) => {
    try {
      await rebuilding;
      const pathname = decodeURIComponent(
        new URL(request.url ?? "/", "http://localhost").pathname,
      );
      const file = resolve(
        root,
        `.${pathname.endsWith("/") ? `${pathname}index.html` : pathname}`,
      );
      if (file !== root && !file.startsWith(`${root}${sep}`)) {
        response.writeHead(403).end();
        return;
      }
      const contents = await readFile(file);
      response.writeHead(200, {
        "content-type": mime[extname(file)] ?? "application/octet-stream",
        "cache-control": "no-store",
      });
      response.end(contents);
    } catch {
      response.writeHead(404).end("Not found");
    }
  });
  await new Promise<void>((done, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      done();
    });
  });
  if (watchSource)
    watcher = watch(watchSource, { recursive: true }, () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        rebuilding = rebuilding
          .then(() => buildSite({ sourceDir: watchSource, outDir: directory }))
          .catch((error) => {
            console.error(error);
          });
      }, 100);
    });
  server.on("close", () => {
    watcher?.close();
    clearTimeout(debounce);
  });
  return server;
}
