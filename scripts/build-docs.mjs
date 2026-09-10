import { buildSite } from "../dist/node.js";
await buildSite({ sourceDir: "docs", outDir: "docs-dist" });
await buildSite({ sourceDir: "starter/site", outDir: "docs-dist/play" });
console.log("Built documentation and Fruit Type in docs-dist/");
