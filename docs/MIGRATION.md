# Migrating an existing game

1. Pin `@pagyew/quiz-ui` in `dependencies`, install from `https://registry.npmjs.org`, and commit the lockfile.
2. Move answer/category data and reference descriptions to `site/answers.js`.
3. Put the game's identity, text, normalizer, optional packs, result grades, and share copy in `site/game.config.js`.
4. Replace the shared game markup with an empty mount element and load `site/main.js` as an ES module.
5. Import shared CSS from `site/theme.css`. The host retains its own page reset, fonts, favicon, metadata, cover image, and hosting configuration.
6. Use `buildSite` to include the installed package in the static output. Remove the old shared app script and copied component CSS.
7. Check the preserved data and play both default and optional modes before deploying.

## Existing browser storage

`storage.legacy` maps a game's old duration, shuffle, pack, theme and best-score keys. The Tag Type and Prop Type adapters preserve their original `tagtype-*` and `proptype-*` keys for reading. New writes use a versioned `quiz-ui:<id>:v1` namespace. Old values are never deleted or overwritten.

New score keys distinguish mode, duration, and enabled packs. When no new score exists for a configuration, the adapter can display its legacy best. Old games did not encode every setting in their score keys, so the historical score's original settings cannot be reconstructed; the migration preserves the historical value rather than inventing that information.

Settings and scores remain in the same browser origin. Moving a game to a new domain cannot automatically transfer localStorage; keep the existing domains during migration.

## Version updates

```sh
npm install --save-exact @pagyew/quiz-ui@0.1.0 --registry=https://registry.npmjs.org
npm run build
```

Each game controls when to adopt a release. Commit the manifest and lockfile together. Do not commit a local tarball, a workspace link, generated `dist/`, or a CDN URL as the production dependency.

Game-specific integrations, including the two existing WebMCP tool names, remain thin adapters that call `quiz.submitAnswer()` and read `quiz.getSnapshot()`.
