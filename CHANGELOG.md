# Changelog

## 0.2.0

- Add built-in English/Russian controls, messages, results, sharing and accessibility text; English is the default.
- Add a persistent EN/RU selector, `getLocale` / `setLocale`, per-game `translations`, and `onLocaleChange` for host metadata.
- Update text in place without resetting rounds, focus, typed input, hints, scores or settings drafts.
- Add locale support to standalone cards/dialogs, Russian plural forms, and safe English fallback.
- Include bilingual Fruit Type in the initializer and document the translation contract.
- Adapt the mobile header for the language selector and long translated settings labels.

Existing configs remain valid. To translate game-specific copy, provide `translations.ru`; shared labels alone do not translate custom branding, content or callbacks.

## 0.1.0

- Extract shared UI and round behavior from Tag Type and Prop Type.
- Add independently usable game engine, complete UI, and component factories.
- Provide scoped mint/violet palettes, light/dark/system themes, and accessibility improvements.
- Preserve game-specific data and provide legacy browser-storage adapters.
- Add a Fruit Type starter and `quiz-ui init` command.
- Add static build/server helpers, component catalog, API documentation, and package verification.
- Correct background timer drift, rendered shuffle order, instance cleanup, and modal backdrop handling.
