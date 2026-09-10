# API and configuration

## Complete game

`createQuiz(root, config, engineOptions?)` accepts an element or a selector and returns:

- `getSnapshot()` — a detached snapshot of the current round.
- `submitAnswer(value)` — `{ status, answerId? }`; status is `accepted`, `duplicate`, `unknown`, `empty`, or `finished`.
- `reset({ mode?, settings? })` — start a fresh standard or sprint round.
- `getLocale()` / `setLocale("en" | "ru")` — change presentation without resetting the round.
- `setTheme('light' | 'system' | 'dark')`.
- `engine` — the underlying synchronous engine.
- `destroy()` — remove listeners, timers, audio resources and library DOM; restore the host's previous content and attributes.

Call `destroy()` when unmounting a game in a router or framework. Do not mount two games into the same element. Separate elements can host separate instances.

## Config

`QuizConfig` is exported as a TypeScript type. JavaScript projects can use `/** @type {import('@pagyew/quiz-ui').QuizConfig} */` for editor assistance.

| Field                              | Purpose                                                                                                                                                                    |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                               | Stable, unique storage namespace.                                                                                                                                          |
| `answers`                          | `{ id, category, value?, aliases?, summary?, docsUrl?, pack? }[]`.                                                                                                         |
| `categories`                       | `{ id, label, description?, icon? }[]`, in display order.                                                                                                                  |
| `packs`                            | Optional `{ id, label, description? }[]` shown as settings switches.                                                                                                       |
| `defaults`                         | `durationSeconds` (300), `enabledPacks` ([]), and `shuffle` (false). Zero duration means untimed.                                                                          |
| `sprint`                           | `{ size, durationSeconds }`, defaults to 20 answers / 120 seconds. Use `false` to hide and disable it.                                                                     |
| `hintCooldownSeconds`              | Defaults to 10.                                                                                                                                                            |
| `branding`                         | Name, optional two-part wordmark, mark, eyebrow, title lines, optional emphasis, description lines, footer, optional footer note, home URL, input prompt and palette name. |
| `board`                            | Standard title, description, and optional sprint description.                                                                                                              |
| `howToPlay`                        | Title, optional kicker, and steps containing a title and description.                                                                                                      |
| `labels`                           | Overrides for the exported `defaultLabels` dictionary, including formatter functions.                                                                                      |
| `durationOptions`                  | Settings dropdown values in seconds.                                                                                                                                       |
| `normalizeAnswer(value)`           | Domain-specific canonicalization; the default trims whitespace and lowercases.                                                                                             |
| `formatAnswer(answer)`             | Visible answer label. Strings are rendered as text.                                                                                                                        |
| `formatHint(answer)`               | Masked hint text.                                                                                                                                                          |
| `referenceLabel(answer, category)` | Reference dialog kicker.                                                                                                                                                   |
| `presentResult(result)`            | `{ title, description, grade }`.                                                                                                                                           |
| `shareText(result, presentation)`  | Text used only when the player presses Share.                                                                                                                              |
| `storage`                          | Optional `{ adapter, legacy }`; `adapter: null` disables persistence.                                                                                                      |
| `themeColor`                       | Optional `{ light, dark }` for full-page games that own the document's theme-color meta tag.                                                                               |

An answer's accepted spelling is `value ?? id`; aliases use the same normalization. IDs and aliases must be unambiguous, including across optional packs. Category and pack references are validated. Settings cannot create an empty round. Sprint samples without replacement and clamps to the active answer count. Shuffle preserves category grouping and changes the order within categories.

Geometry-only icons contain shapes such as `{ tag: 'path', attrs: { d: 'M4 4h16v16H4z' } }`. Supported tags are `path`, `circle`, `rect`, `line`, and `polyline`. Only geometry attributes are copied; markup, event handlers, and external SVG resources are not inserted.

## Engine without UI

```js
import { createQuizEngine } from "@pagyew/quiz-ui/core";

const engine = createQuizEngine({
  id: "example",
  categories: [{ id: "fruit", label: "Fruit" }],
  answers: [
    { id: "apple", category: "fruit" },
    { id: "pear", category: "fruit" },
  ],
});
const unsubscribe = engine.subscribe((snapshot, event) => {
  console.log(snapshot.found, event.type);
});
engine.submit("APPLE");
engine.hint();
engine.tick();
unsubscribe();
```

The engine does not schedule timeouts. Call `tick()` from your own scheduler. Deadlines are checked before accepting guesses or hints, so delayed ticks do not extend a round. Supply `{ now, random }` as a second argument for deterministic tests; `now` returns milliseconds and `random` a value in `[0, 1)`.

Snapshots contain `status` (`idle`, `running`, `finished`), `mode`, `settings`, `pool`, `found`, `hinted`, `activeHint`, `remainingSeconds` (null when untimed), `elapsedSeconds`, `hintCooldownSeconds`, and `result`. Results include `reason` (`won`, `timeout`, `give-up`), `score`, `total`, `hintedCount` (found with help), `elapsedSeconds`, and `mode`.

## UI with your own engine

`createQuizUI(element, config, actions)` does not create an engine or access storage. Supply action callbacks: `submit`, `hint`, `reset`, `sprint`, `settings`, `theme`, `sound`, `share`, and `giveUp`. The settings callback returns true when applied or throws a validation error to display a localized settings error in the dialog.

Drive it with `ui.render(snapshot, bestScore)`, `ui.setTheme(preference, isDark)`, `ui.setSound(enabled)`, `ui.feedback(text)`, `ui.toast(text)`, `ui.scrollToAnswer(id)`, `ui.showResults()`, and `ui.destroy()`.

For lower-level composition, use `createAnswerCard(document, answer, options)`, `updateAnswerCard(card, answer, options)`, `createCategorySection(document, category)`, `createIcon(document, shapes)`, and `createDialog(document, options)`. All are independent of `createQuiz`.

## Themes

Every selector is scoped to `.quiz-ui`; tokens are prefixed with `--quiz-`. The host owns page margins and font loading. Set `branding.palette: 'violet'` and load the violet stylesheet to use the Prop Type palette.

```css
.quiz-ui[data-theme="light"] {
  --quiz-paper: #fff9ed;
  --quiz-accent: #9b4c1b;
  --quiz-primary: #9b4c1b;
}
```

Core token groups cover text/surfaces, accents/focus, cards, hinted/found/missed states, dialog surfaces, typography, and layout. See `src/styles.css` for the complete contract. `--quiz-max-width`, `--quiz-radius`, `--quiz-font-sans`, and `--quiz-font-mono` are useful starting points.

## Static build

`buildSite({ sourceDir: 'site', outDir: 'dist' })` replaces the output directory and copies the source plus this installed package to `vendor/quiz-ui/`. Source and output must be separate, non-nested directories. Never use a directory containing hand-maintained files as the output.

`serveSite({ directory: 'dist', port: 4173, host: '127.0.0.1', watchSource: 'site' })` starts a local development server. When watching, changes rebuild the output; refresh the page to see them. The returned Node server can be closed normally.

The standalone dialog's `close(restoreFocus = true)` restores its opening control. Pass `false` when the calling action deliberately focuses another control (for example, starting a round). Escape, the close button, and backdrop dismissal restore focus by default.

## Localization

`Locale` is `"en" | "ru"`. Both `@pagyew/quiz-ui` and `@pagyew/quiz-ui/ui` export `supportedLocales`, `defaultLabels` (English), `russianLabels`, `localeLabels`, and `presentResult(result, locale = "en")`.

- `locale`: initial fallback, English by default. A supported saved choice takes priority. Browser/OS language is never auto-detected.
- `translations`: language keys containing `QuizTranslation` objects. Keep the base config's content in English.
- `showLanguageSwitcher: false`: hide the built-in EN/RU select when the host supplies one.
- `onLocaleChange(locale)`: called by `createQuiz` on mount and after each actual change. A full-page app can set `document.documentElement.lang` and page metadata here. Embedded games only change their own root's `lang`; `destroy()` restores the original attribute.

`QuizTranslation` accepts partial `branding`, `board`, `howToPlay`, and `labels`; category/pack records keyed by ID override `label` and `description`; answer records keyed by ID override `summary` and `docsUrl`. It also accepts translated `referenceLabel`, `presentResult`, and `shareText` callbacks. Arrays such as title lines and instructions are replaced as a whole.

For labels, precedence is built-in language dictionary → base `labels` → language-specific `labels`. Other presentation fields fall back individually to the base config. Translate every base custom label and callback to avoid mixed-language game copy. Dictionaries accept functions for messages with values; built-in Russian messages handle plural forms.

Translations cannot change IDs, aliases, accepted `value`, category membership, packs, normalization, or round rules. Define any alternative accepted spellings once in `answers[].aliases`. Locale switching preserves the engine instance, answers found, hints, timer, records, input draft, selection, open dialogs and unsubmitted settings. It clears transient notices and the manual share fallback; press Share again for text in the new language. Unsupported explicit locale values throw before changing the UI. Unsupported saved values and unavailable storage fall back safely.

Choice is stored under `quiz-ui:<id>:v1:locale`, independently of scores, settings and theme. `storage.adapter: null` disables persistence. The low-level storage API provides `locale(fallback = "en")` and `saveLocale(locale)`.

`createQuizUI` exposes `getLocale()` and `setLocale(locale)` without storage. Its selector changes the UI directly unless an optional `actions.locale(locale)` callback is supplied; that callback owns synchronization and calls `ui.setLocale`. The full-game `onLocaleChange` callback is managed by `createQuiz`.

Standalone cards accept `locale` and optional `labels` in both creation/update options. Standalone dialogs accept `locale` for their default close label; the returned `closeButton` allows host updates. Category sections return their `label` node alongside `element`, `grid` and `count`.
