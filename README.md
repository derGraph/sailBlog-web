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

Shield: [![CC BY-NC-SA 4.0][cc-by-nc-sa-shield]][cc-by-nc-sa]

This work is licensed under a
[Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License][cc-by-nc-sa].

[![CC BY-NC-SA 4.0][cc-by-nc-sa-image]][cc-by-nc-sa]

[cc-by-nc-sa]: http://creativecommons.org/licenses/by-nc-sa/4.0/
[cc-by-nc-sa-image]: https://licensebuttons.net/l/by-nc-sa/4.0/88x31.png
[cc-by-nc-sa-shield]: https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg
