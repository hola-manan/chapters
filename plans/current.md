# Deploy the PWA to GitHub Pages under /chapters/

Read `GEMINI.md` first.

**Decided by the human and not open:** a **public** GitHub repo named `chapters`, deployed as a
**GitHub Pages project page**, so the app is served from `https://<user>.github.io/chapters/` —
not from the root of a domain.

Everything the web port produces currently assumes root hosting. That assumption is wrong in five
separate places, and **each one fails silently**: a missed path gives a blank page, an uninstallable
app, or a service worker with the wrong scope, none of which announce themselves. This pass fixes
all five and adds the workflow that deploys.

## 1. `app.json` — tell Expo the base path

Add to `expo.experiments`:

```json
"baseUrl": "/chapters"
```

This is what rewrites the script and asset URLs inside the exported HTML. Everything else below is
static content Expo does not rewrite, which is why each has to be done by hand.

## 2. `public/.nojekyll` — **the one that breaks everything**

Create an empty file at `public/.nojekyll`.

GitHub Pages runs Jekyll over the published directory by default, and **Jekyll excludes every
directory whose name begins with an underscore**. Expo emits the entire JS bundle into
`_expo/static/js/web/`. Without this file the HTML is served, every script 404s, and you get a
blank white page with no useful error. Do not skip it and do not rename it.

## 3. `public/manifest.webmanifest`

```json
"start_url": "/chapters/",
"scope": "/chapters/",
```

and prefix every icon `src` with `/chapters` — `"/chapters/icons/icon-192.png"` and so on. A
`start_url` outside the scope makes the app uninstallable, and iOS gives no explanation when it
refuses.

## 4. `app/+html.tsx`

- `<link rel="manifest" href="/chapters/manifest.webmanifest">`
- `<link rel="apple-touch-icon" href="/chapters/icons/apple-touch-icon.png">`
- Service worker registration becomes
  `navigator.serviceWorker.register('/chapters/sw.js', { scope: '/chapters/' })`.
  **A worker registered at the root cannot control pages under a sub-path**, so both the file path
  and the explicit scope have to move together.

Leave the `theme-color` metas and the viewport alone.

## 5. `public/sw.js`

- The navigation fallback must serve `/chapters/index.html`, not `/index.html`.
- Only handle requests whose path starts with `/chapters/`; anything else on that origin belongs to
  another project on the same GitHub Pages domain and must be left alone. This matters more than it
  would on a dedicated host — `<user>.github.io` is shared by every repo the user ever publishes.
- Bump `CACHE_VERSION`, since the cached shell from a root-hosted build is now wrong.

## 6. `.github/workflows/deploy.yml`

Deploy on every push to `master` (this repo's default branch — not `main`), plus
`workflow_dispatch`.

- `permissions: { contents: read, pages: write, id-token: write }`
- `concurrency: { group: "pages", cancel-in-progress: false }`
- Job: `actions/checkout` → `actions/setup-node` with Node 20 and npm caching → `npm ci` →
  `npx expo export --platform web` → `actions/configure-pages` → `actions/upload-pages-artifact`
  with `path: dist` → `actions/deploy-pages`.
- Pin each action to a major version tag (`@v4`), not a floating branch.

## 7. `README.md`

The repo is public and currently has no README. Write a short one: what Chapters is (a PDF becomes
a set of short chapter reads), that it runs as an iOS app through Expo Go and as an installable
PWA, the live URL, and pointers to `docs/components.md` for the design decisions and
`docs/library.md` for the reusable `design/` and `ui/` layers. Keep it brief and do not oversell it.

## 8. Verify by inspecting the build, not by watching it succeed

The export succeeding proves nothing here — the previous pass exported cleanly for days while
importing entirely the wrong modules. After `npx expo export --platform web`, confirm in `dist/`:

- `dist/index.html` references `/chapters/_expo/...`, not `/_expo/...`
- `dist/.nojekyll` exists
- `dist/manifest.webmanifest` has the `/chapters/` scope and prefixed icon paths
- `dist/sw.js` contains no bare `'/index.html'`

Report each of these explicitly.

## Gates

- `npx expo export --platform web`, followed by the four checks above
- `npx tsc --noEmit`
- `npm run lint`
- `node --test --experimental-strip-types test/pdf.test.ts test/design.test.ts test/icons.test.ts`

## Constraints

- **Do not touch anything outside this project directory.** Do not run `git`, do not create a
  remote, do not authenticate anything — the human does all of that.
- **Do not commit.** Leave the tree dirty for review.
- No package installs.
- Do not change any component, screen, or the native build's behaviour. `baseUrl` affects the web
  export only; if you find it altering native output, stop and report it.
