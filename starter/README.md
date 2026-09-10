# Your next quiz

This project starts with Fruit Type, a complete example built with `@pagyew/quiz-ui`.

```sh
npm install --registry=https://registry.npmjs.org
npm run dev
```

Open http://127.0.0.1:4173. After editing a source file, refresh the page.

To make your game:

1. Replace `site/answers.js` with your answers, categories, and aliases.
2. Update `site/game.config.js`: use a **unique id** to keep scores separate, change the name, copy, rules, and round defaults.
3. Adjust tokens in `site/theme.css`, replace `site/assets/favicon.svg`, and update the page metadata in `site/index.html`.
4. Run `npm run build` and host `dist/` on any static host.

No API, account system, framework, or production bundler is required. The build includes the installed library; the game does not fetch JavaScript from a CDN.

See the [library documentation](https://github.com/pagyew/quiz-ui) for custom UI, result copy, extra answer packs, and themes.
