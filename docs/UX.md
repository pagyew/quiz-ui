# Shared UI/UX contract

## Sources

The extraction uses the production `site/` implementations, not the unused React scaffolds in the original repositories:

- [Tag Type, f254f9e](https://github.com/pagyew/tag-type-quiz/tree/f254f9e34769489844d8ddc0a6587746167649ea): 108 standard answers, 11 legacy answers, 8 standard categories.
- [Prop Type, 92c44a4](https://github.com/pagyew/prop-type-quiz/tree/92c44a438ce272424faea7c3625c0b8f69dcbc83): 125 standard answers, 22 advanced properties, 11 at-rules and 7 legacy/vendor entries.

The published games both use a grouped board. Old README references to category filters, multiple board views, or hard mode do not describe this baseline.

## Shared visual system

- Branded top bar, prominent two-line question, italic emphasis, supporting copy.
- Sticky score / answer input / timer, a slim progress bar, and a grouped answer board.
- Two category columns on desktop; one on smaller screens. Answer grids adapt from three to four to two columns as the layout changes.
- Mint and violet identities use the same layout with independent light and dark color tokens.
- Buttons, hint cooldown, dialogs, reference cards, results, and toasts share common spacing and typography.

## Interaction contract

1. A round starts idle. Empty input does nothing; a non-empty guess or a hint starts time.
2. Enter or the submit control sends an answer. A correct answer is counted once, revealed, and scrolled into view. An unknown or duplicate answer gives feedback.
3. A hint reveals the first letter (or the caller's masked form), highlights the answer, and starts a ten-second cooldown. A helped answer retains a distinct state when found.
4. Settings restart the round. Sprint selects 20 answers for two minutes in the original games. Reset and Play again return to standard mode.
5. Finding every answer wins. Time expiry or Give up finishes the round, disables guessing, and reveals missed answers. Results can be closed and reopened.
6. Discovered cards open a reference dialog. The game provides its descriptions and documentation links.
7. Sharing happens only after a click: native share, clipboard fallback, then selectable text if both are unavailable. Canceling native sharing does not produce an error message.
8. Theme preference is light, dark, or system. System changes are followed while selected. Settings and records remain per game and on the current device.

## Deliberate corrections during extraction

- Use elapsed time, not a count of interval callbacks, so background throttling does not extend timed rounds.
- Render the shuffled order within categories. Prop Type previously generated a shuffled pool but rendered the original order.
- Keep callbacks, DOM, timers, and audio scoped to each mounted instance; release them on destroy.
- Keep typed markup as text, and do not render unsafe documentation URLs.
- Handle blocked storage and unavailable sharing without breaking a round.
- Maintain actual submit controls and 16px mobile input text; respect reduced motion.
- Scope the H hotkey to the active game and suppress it in editable fields and dialogs.
- Close dialogs only when the click is outside their surface, not inside their padding; provide an accessible title and return focus.

The content datasets, grade names, default modes, storage namespaces, and two visual identities remain owned by their games.

## Verification matrix

Check both identities in light and dark at desktop (1280px) and mobile (390px). Include the initial screen, found/hinted/missed cards, long CSS names, rules, settings, references, results, and a fresh round. Exercise normal / duplicate / unknown input, optional packs, shuffle, sprint, untimed play, expiry, give-up, keyboard focus, and legacy preferences.

Automated tests cover the deterministic engine, storage compatibility, real form-to-state integration in a DOM, isolated mounts, modal behavior, and safe content rendering. Browser checks verify actual layout and native-dialog interactions. A clean installed archive and the third-topic starter verify the published package boundary.
