import { buildSite, serveSite } from "@pagyew/quiz-ui/node";
await buildSite();
const port = Number(process.env.PORT || 4173);
await serveSite({ port, watchSource: "site" });
console.log(`Local: http://127.0.0.1:${port}`);
