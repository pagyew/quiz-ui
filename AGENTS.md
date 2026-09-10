# Project rules

- Use Git and GitHub CLI. Do not use Arc.
- Keep `main` clean and synchronized with its upstream. Work on `codex/…` branches or isolated worktrees; never develop directly on `main`.
- Do not read from or write to Mnemonik, including VTSEPILOVMNK and any other Tracker memory queue.
- Store persistent project context only in this repository and its Git history.
- Browser code has no runtime dependencies. Keep UI, game logic, data, and themes separate.
- Before releasing, run `npm run check`, validate `npm pack` in a clean consumer, and check both original games and the starter in the browser.
