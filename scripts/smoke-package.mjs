import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, writeFile, access } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";

await mkdir("work", { recursive: true });
const cache = resolve("work/npm-cache");
const run = (command, args, cwd = process.cwd()) =>
  execFileSync(command, args, {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      NODE_TLS_REJECT_UNAUTHORIZED: "1",
      npm_config_cache: cache,
      npm_config_registry: "https://registry.npmjs.org/",
    },
  });
const [packed] = JSON.parse(
  run("npm", [
    "pack",
    "--ignore-scripts",
    "--pack-destination",
    "work",
    "--json",
  ]),
);
assert.equal(packed.name, "@pagyew/quiz-ui");
assert(
  !packed.files.some((file) => /^(work|node_modules|test)\//.test(file.path)),
);
assert(packed.files.some((file) => file.path === "starter/npmrc"));
const tarball = resolve("work", packed.filename);
// Exercise npm's package-spec parsing without publishing or requiring login.
run(process.execPath, [resolve("scripts/publish.mjs"), "--dry-run"]);
const scratch = await mkdtemp(resolve("work/installed-"));
await writeFile(
  resolve(scratch, "package.json"),
  JSON.stringify({ name: "quiz-package-check", private: true, type: "module" }),
);
const installArgs = [
  "install",
  "--offline",
  "--ignore-scripts",
  "--no-fund",
  "--no-audit",
  "--no-save",
  "--package-lock=false",
  tarball,
];
run("npm", installArgs, scratch);
run(
  process.execPath,
  [
    "--input-type=module",
    "-e",
    `import {createQuizEngine} from '@pagyew/quiz-ui/core'; import {createQuizUI} from '@pagyew/quiz-ui/ui'; import {createQuiz} from '@pagyew/quiz-ui'; const e=createQuizEngine({id:'smoke',categories:[{id:'one',label:'One'}],answers:[{id:'a',category:'one'}]}); if(e.submit('A').status!=='accepted'||e.getSnapshot().result.reason!=='won'||typeof createQuizUI!=='function'||typeof createQuiz!=='function') throw Error('Package exports failed');`,
  ],
  scratch,
);
await writeFile(
  resolve(scratch, "consumer.ts"),
  `import { createQuizEngine } from '@pagyew/quiz-ui/core';\nimport { createQuiz, type QuizConfig, type QuizTranslation } from '@pagyew/quiz-ui';\nconst engine = createQuizEngine({ id:'test',categories:[{id:'one',label:'One'}],answers:[{id:'a',category:'one'}] });\nconst score: number = engine.getSnapshot().found.length;\ndeclare const config: QuizConfig;\nconst ru: QuizTranslation = { categories: {one:{label:"Один"}} };\nconst quiz = createQuiz(document.body, { ...config, locale: "en", translations: {ru} });\nquiz.setLocale("ru");\nconst locale: "en" | "ru" = quiz.getLocale();\nquiz.destroy();\n`,
);
run(
  process.execPath,
  [
    resolve("node_modules/typescript/bin/tsc"),
    "--target",
    "ES2022",
    "--module",
    "NodeNext",
    "--moduleResolution",
    "NodeNext",
    "--strict",
    "--noEmit",
    resolve(scratch, "consumer.ts"),
  ],
  scratch,
);
const executable = resolve(
  scratch,
  "node_modules/@pagyew/quiz-ui/bin/quiz-ui.mjs",
);
run(process.execPath, [executable, "init", "fresh-game"], scratch);
const game = resolve(scratch, "fresh-game");
assert.match(
  await readFile(resolve(game, ".npmrc"), "utf8"),
  /^registry=https:\/\/registry\.npmjs\.org\//,
);
assert.equal(
  JSON.parse(await readFile(resolve(game, "package.json"), "utf8"))
    .dependencies["@pagyew/quiz-ui"],
  packed.version,
);
run("npm", installArgs, game);
run("npm", ["run", "build"], game);
for (const file of [
  "index.html",
  "main.js",
  "game.config.js",
  "answers.js",
  "ru.js",
  "vendor/quiz-ui/i18n.js",
  "theme.css",
  "vendor/quiz-ui/index.js",
  "vendor/quiz-ui/core.js",
  "vendor/quiz-ui/styles.css",
  "assets/favicon.svg",
])
  await access(resolve(game, "dist", file));
await writeFile(resolve(game, "keep.txt"), "existing work");
assert.throws(() =>
  run(process.execPath, [executable, "init", "fresh-game"], scratch),
);
assert.equal(
  await readFile(resolve(game, "keep.txt"), "utf8"),
  "existing work",
);
console.log(
  `Installed package ${packed.name}@${packed.version}: ESM, public types, initializer, public registry config, and standalone static build passed (${packed.size} bytes packed).`,
);
