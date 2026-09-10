<div align="center">
  <h1>Quiz UI</h1>
  <p><strong>A complete kit for type-to-reveal memory games.</strong></p>
  <p>
    <img src="https://img.shields.io/badge/TypeScript-framework%20independent-3178c6?style=flat-square" alt="TypeScript: framework independent" />
    <img src="https://img.shields.io/badge/runtime%20dependencies-0-0f766e?style=flat-square" alt="runtime dependencies: 0" />
    <img src="https://img.shields.io/badge/license-MIT-0f766e?style=flat-square" alt="license: MIT" />
  </p>
  <p><a href="#create-a-game">Create a game</a> · <a href="docs/API.md">API</a> · <a href="#local-development">Development</a> · <a href="CHANGELOG.md">Changelog</a></p>
</div>

---

A small, complete kit for **type-to-reveal memory games**. Extracted from [Tag Type](https://github.com/pagyew/tag-type-quiz) and [Prop Type](https://github.com/pagyew/prop-type-quiz), with a third, independent Fruit Type starter.

Framework-independent JavaScript and CSS. Written in TypeScript. **No runtime dependencies**, backend, or account system. MIT licensed.

## Create a game

```sh
npx --registry=https://registry.npmjs.org/ @pagyew/quiz-ui init my-quiz
cd my-quiz
npm install --registry=https://registry.npmjs.org
npm run dev
```

Open `http://127.0.0.1:4173`. The starter includes working data, a theme, and build scripts. Change `site/answers.js`, `site/game.config.js`, `site/theme.css`, and the page metadata. Use a unique `config.id` for every game so browser settings and scores stay separate.

Run `npm run build` to produce a self-contained `dist/` for any static host. The build copies the **installed, pinned package** into the site. Browsers never resolve npm specifiers or fetch quiz JavaScript from a CDN. Node.js 22+ is required for development tools; the browser runtime uses ordinary ESM and native dialogs.

## Choose your level of reuse

| Import                              | Purpose                                                                                                                    |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `@pagyew/quiz-ui`                   | `createQuiz(root, config)` mounts a complete game.                                                                         |
| `@pagyew/quiz-ui/ui`                | `createQuizUI` renders caller-supplied snapshots; individual card, category, icon, and dialog factories are also exported. |
| `@pagyew/quiz-ui/core`              | `createQuizEngine` provides synchronous game logic without DOM, timers, or storage dependencies.                           |
| `@pagyew/quiz-ui/styles.css`        | Shared layout, components, mint palette, light/dark tokens, and reduced-motion support.                                    |
| `@pagyew/quiz-ui/themes/violet.css` | Optional violet palette, used by Prop Type.                                                                                |
| `@pagyew/quiz-ui/node`              | `buildSite` and `serveSite` for small static projects.                                                                     |

For projects that already use a bundler:

```js
import { createQuiz } from "@pagyew/quiz-ui";
import "@pagyew/quiz-ui/styles.css";
import { config } from "./game.config.js";

const quiz = createQuiz(document.querySelector("#quiz"), config);
// When the host unmounts this game:
// quiz.destroy();
```

The starter demonstrates browser-native imports without a bundler.

## Shared UI and behavior

- Branded header, hero, grouped board, score, progress, timer, and footer.
- Hidden, hinted, found, found-with-hint, and missed answer states.
- Standard and sprint rounds, optional answer packs, configurable duration, untimed play, and category-preserving shuffle.
- Hints with cooldown, keyboard submission, instant feedback, answer scrolling, optional sound, reference dialogs, and result sharing with clipboard/manual fallback.
- Rules, settings, reference, and result dialogs with keyboard focus handling.
- Scoped light/dark/system themes, configurable labels, mobile layout, and reduced-motion support.
- Per-game local settings and records, with optional adapters for legacy storage keys.
- Multiple isolated instances and deterministic teardown. The package never installs global CSS resets or fetches fonts; the host owns its fonts, metadata, page reset, and deployment.

## Local development

Use Node.js 22 or newer. Clone the repository before running the commands below:

```sh
git clone https://github.com/pagyew/quiz-ui.git
cd quiz-ui
```

```sh
npm ci --registry=https://registry.npmjs.org
npm run check
npm run dev
```

The component catalog and playable starter are served at `http://127.0.0.1:4175`. Run `npm run build:docs` to build them into `docs-dist/`.

- [API and configuration](https://github.com/pagyew/quiz-ui/blob/main/docs/API.md)
- [UI/UX contract and source baseline](https://github.com/pagyew/quiz-ui/blob/main/docs/UX.md)
- [Consumer migration](https://github.com/pagyew/quiz-ui/blob/main/docs/MIGRATION.md)
- [Release process](https://github.com/pagyew/quiz-ui/blob/main/docs/RELEASING.md)
- [Changelog](CHANGELOG.md)

Keep game datasets and domain-specific answer parsing in consumer repositories. Extend the library when the shared behavior itself changes.

## License

[MIT](LICENSE).

<!-- Сообщение сформировано агентом -->
