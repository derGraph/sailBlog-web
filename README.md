# sailBlog

### This is a project to share and record voyage data when sailing. It is my first attempt in svelte.

It uses prisma for Database Management. The project should adhere to EU-GDPR rules.
The companion app is written in flutter and is used to inject the data into the database.
All API-Endpoints used in the project are also available to the public. Log in via POST to /login and then use the cookie!

The project is auto built into a docker container published to Github Packages!

You can preview the production build with `npm run preview`.

### Development

Use Node.js 26 (also used by the Docker image). With nvm:

```sh
nvm install
nvm use
npm ci
npm ci --prefix workers
npx prisma generate
npm run check
npm run build-workers
npm run build
```

The app uses SvelteKit 3, Vite 8, Skeleton 5, and Sharp 0.35. SvelteKit configuration
lives in `vite.config.ts`; shared code uses the `#lib` imports from `package.json`.
Prisma model types come from the generated client rather than `@prisma/client`.
Workers use TypeScript's relative import rewriting instead of `tsc-alias`.

TypeScript stays on 6.x because SvelteKit 3 and `svelte-check` currently require
that major version. Prisma stays on the latest stable 7.x release, excluding 8.x
release candidates. Targeted dependency overrides supply patched transitive
packages without downgrading Prisma or PM2. Review `npm audit` findings individually
instead of applying `npm audit fix --force`.

### Tests

```sh
npm test                       # Fast unit tests; no Docker or database needed
npm run test:coverage          # Unit coverage report in coverage/
npx playwright install chromium
npm run test:integration       # Real MariaDB sessions, workers, and HTTP permissions
npm run test:e2e               # Desktop and mobile Chromium journeys
npm run test:all               # Unit, integration, browser, type and build checks
npm run test:runtime           # Build and start the production Docker image
```

Database suites require Docker. Each run creates its own MariaDB 11.8 container
with a random local port and credentials, and applies the current Prisma schema
to a fresh `sailblog_test` database. Photo uploads go into temporary storage.
The runner removes both when it finishes or receives an interrupt. The tests do
not use your `.env` database or existing `store` directory. Run database suites
through the npm scripts; direct invocations fail the test-environment guard.

Coverage includes GPX parsing, private-data redaction, and worker calculations.
Database tests cover session expiry/invalidation, trip and media visibility,
owner/crew/admin permissions, uploads, deletion/restoration, and worker updates.
Browser tests exercise registration, login, trip editing, photo uploads, editor
image resizing, logout, and mobile navigation. Browser requests stay local;
Google Photos and map tiles are excluded.

GitHub Actions runs the full suite and production-container smoke test on pushes
and pull requests. Image publishing waits for those checks. Failed browser tests
retain screenshots and traces in `test-results/` and `playwright-report/`.

Shield: [![CC BY-NC-SA 4.0][cc-by-nc-sa-shield]][cc-by-nc-sa]

This work is licensed under a
[Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License][cc-by-nc-sa].

[![CC BY-NC-SA 4.0][cc-by-nc-sa-image]][cc-by-nc-sa]

[cc-by-nc-sa]: http://creativecommons.org/licenses/by-nc-sa/4.0/
[cc-by-nc-sa-image]: https://licensebuttons.net/l/by-nc-sa/4.0/88x31.png
[cc-by-nc-sa-shield]: https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg
