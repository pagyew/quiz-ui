# Releasing Quiz UI

The package is `@pagyew/quiz-ui`, owned by `pagyew`, under MIT. Publish only to `https://registry.npmjs.org/` (the registry behind npmjs.com). Project and starter npm configuration pin that registry; no global configuration change is needed.

## Prepare a version

1. Use Git on a feature branch; keep `main` clean. Update the root and starter package versions together, including the starter's exact library dependency, then update the lockfile and changelog.
2. Run `npm ci --registry=https://registry.npmjs.org/`, `npm run check`, and `npm run build:docs`. Check creates and installs a real archive, verifies public exports and TypeScript declarations, generates a fresh quiz, and builds its static output.
3. Preview both palettes, mobile layouts, dialogs, and the included Fruit Type game. Install the candidate archive in both original games and run their checks before making a release.
4. Merge reviewed changes after CI passes. The tag `vX.Y.Z` must point to that source, and `X.Y.Z` must match the package manifest. Never overwrite a published version.

## Initial local publication

Confirm `npm whoami --registry=https://registry.npmjs.org/` reports `pagyew`. Run `npm run check`, inspect the archive listing with `npm pack --dry-run --ignore-scripts --registry=https://registry.npmjs.org/`, then `node scripts/publish.mjs`. It publishes the exact tested archive and checks the package name, access, and registry first. Authenticate interactively if npm requires it; never store tokens in this repository or paste them into issues.

Verify the installed version and tarball URL using `npm view @pagyew/quiz-ui@X.Y.Z version dist.tarball --registry=https://registry.npmjs.org/`. Both consumer repositories must install that actual registry version and commit their lockfiles. Local `file:` tarballs are only for pre-release verification.

## Later releases from GitHub

The `release.yml` workflow uses npm trusted publishing (OIDC), without an npm token stored in GitHub. Once the package exists, its owner must configure the trusted publisher in npm package settings:

- Provider: GitHub Actions
- Organization or user: `pagyew`
- Repository: `quiz-ui`
- Workflow filename: `release.yml`
- Environment: empty (this workflow has no publish environment)
- Allowed action: direct publishing, if npm shows an action selector

This is a one-time package-owner setting; committing the workflow alone does not grant it permission to publish. The workflow runs only for a published GitHub release, validates the version tag, uses Node 24 and npm 11, runs the archive checks again, and publishes to the public registry. OIDC publications from a public repository receive npm provenance automatically. See [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/).

For the initial local publication, create the matching Git tag without publishing a GitHub Release event. Publish a GitHub Release for subsequent new versions after configuring the trusted publisher. Ordinary local authenticated publication does not generate GitHub Actions provenance.

## Component catalog

Enable GitHub Pages with the GitHub Actions source. `docs.yml` checks and builds the component catalog plus Fruit Type, then publishes only `docs-dist/`. No package publication or credentials are needed for this job. The README remains usable on GitHub and npm when Pages is unavailable.

## Consumer deployment and rollback

Update each game's exact dependency and run `npm run check`. Deploy the committed static build to its existing Sites project and origin to retain browser preferences and scores. For a UI regression, revert the dependency update and deploy the previous saved site version; do not unpublish npm versions that consumers may already use.
