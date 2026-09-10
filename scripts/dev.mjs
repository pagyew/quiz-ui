import "./build-docs.mjs";
import { serveSite } from "../dist/node.js";
const port = Number(process.env.PORT || 4175);
await serveSite({ directory: "docs-dist", port });
console.log(`Quiz UI: http://127.0.0.1:${port}`);
