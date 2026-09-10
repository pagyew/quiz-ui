#!/usr/bin/env node
import {
  cp,
  mkdir,
  readFile,
  readdir,
  rename,
  writeFile,
} from "node:fs/promises";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const [command, directory, ...extra] = process.argv.slice(2);
if (command === "--help" || command === "-h" || !command) {
  console.log(
    "Usage: quiz-ui init <new-directory>\n\nCreate a type-to-reveal quiz from the included starter.",
  );
} else if (command !== "init" || !directory || extra.length) {
  console.error("Usage: quiz-ui init <new-directory>");
  process.exitCode = 1;
} else {
  const destination = resolve(directory);
  try {
    let entries;
    try {
      entries = await readdir(destination);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      entries = [];
    }
    if (entries.length)
      throw new Error(
        "Choose an empty or new directory; existing files will not be overwritten.",
      );
    await mkdir(destination, { recursive: true });
    await cp(
      fileURLToPath(new URL("../starter/", import.meta.url)),
      destination,
      { recursive: true },
    );
    await rename(
      resolve(destination, "gitignore"),
      resolve(destination, ".gitignore"),
    );
    await rename(resolve(destination, "npmrc"), resolve(destination, ".npmrc"));
    const file = resolve(destination, "package.json");
    const manifest = JSON.parse(await readFile(file, "utf8"));
    manifest.name =
      basename(destination)
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/^-+|-+$/g, "") || "my-quiz";
    await writeFile(file, JSON.stringify(manifest, null, 2) + "\n");
    console.log(
      `Created ${destination}\n\nNext: cd into the new directory, then run:\n  npm install --registry=https://registry.npmjs.org\n  npm run dev`,
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
