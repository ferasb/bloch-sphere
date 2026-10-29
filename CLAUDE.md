# Bloch Sphere

An interactive Bloch sphere for beginner quantum students: a static website with no backend, for desktops first; the Sphere room also works on phones and tablets (`design.md` §5.1). `docs/design.md` is the design, and `docs/design-gates.md` covers gates and the Gate Lab; read them before changing structure. Circuits of interacting qubits (the Circuit Lab) are a separate project, not part of this site; that work is parked on the `circuit-lab` branch (`design-gates.md` §4.2).

## Layout

- `web/`: the site (TypeScript, React, React Three Fiber, Zustand, Vite).
  - `src/math/`: complex numbers, qubits, gates, vectors. Pure.
  - `src/model/`: `Sphere`, the one model (qubits + journey). Pure: no DOM, React or three.js.
  - `src/format/`: text and LaTeX formatting. Pure.
  - `src/persist/`: browser storage (sessionStorage per tab, localStorage for saved gates, challenge stars and the theme), validated on load.
  - `src/learn/`: the Learn pages (`/learn/…`), static HTML rendered from React when the site is built, by `plugins/learnPages.ts` (`design.md` §13). `pages.tsx` lists them; `guides/` holds their text; `figure.tsx` draws the SVG spheres.
  - `src/ui/`: React. `rooms.ts` (which room is open, from the URL hash). The Sphere room: `store.ts` (Zustand: its Sphere, view state, playhead), `controls/`, `panels/`. The Gate Lab: `lab/` (its own store, `labStore.ts`). Shared: `scene/` (the 3D sphere: it draws a `Timeline` from whatever `SceneSource` it's given, never a particular model), `libraryStore.ts` (My gates), `playhead.ts`, `view.ts`, `media.ts` (narrow screens and touch), `previewPress.ts` (preview by pointing, or by holding on a touch screen), `widgets/`.
  - `src/theme.css`: the palette, light and dark, shared with ferasbisharat.com (a copy; the original is `ferasb.github.io/theme.css`). `src/tokens.css`: this site's tokens on top of it (qubits, the 3D scene, fonts), shared by the app and the Learn pages. `persist/theme.ts` and `ui/theme.ts` keep the visitor's theme choice.
  - `public/`: copied as is into the build (the favicons, `og.png`, `robots.txt`, the About, Privacy and 404 pages, `theme-init.js`, which a Vite plugin adds to every page's head).
  - `plugins/`: Vite plugins (`learnPages.ts`). Type-checked with Node's types by `tsconfig.node.json`.
- `python/`: the reference implementation (`qubit.py`, `gates.py`, `tests/`; NumPy, pytest).
- `docs/`: the design documents, and how to deploy (`deploying.md`).
- `.github/workflows/`: CI (web + Python tests on every push) and the GitHub Pages deploy (by hand, or on every push to `main` once the `DEPLOY_PAGES` variable is set).

## Commands

Node 24 (the version is in `.nvmrc`).

- `cd web && npm run dev`: dev server on http://localhost:5173
- `cd web && npm test`: Vitest
- `cd web && npm run build`: type-check and production build
- `.venv/bin/python -m pytest`: Python tests, from the repo root (a fresh clone first needs `python3 -m venv .venv && .venv/bin/pip install -r requirements.txt`)

## Rules

- **Fit before you add.** Before adding a feature, check it against `docs/design.md`. If it doesn't fit the current structure, propose the restructure as a separate step first, then update the design.
- **One model per room.** In the Sphere room all state changes go through `Sphere` actions via the store; in the Gate Lab, through the lab store's bench operations (`model/bench.ts`). UI code never changes qubits or tiles directly.
- **The UI only draws** from (model, view state). Logic that needs a test belongs in `math/`, `model/` or `format/`, not in a component.
- **Animation reads the store, not React state.** 3D components read the playhead with `source.get()` (their `SceneSource`) inside `useFrame`; only small panels subscribe to it.
- **Stable qubit ids.** Color follows the qubit's color slot, never its position in a list.
- **Hue means "which qubit".** Phase is always shown as an angle, never a color.
- **Colors are OKLCH tokens**: the palette in `web/src/theme.css`, this site's own (qubits, the 3D scene) in `web/src/tokens.css`. Every color has a light and a dark value, `light-dark(light, dark)`. The 3D scene reads them through `ui/palette.ts`. Don't hard-code colors (static files in `public/` can't read the tokens, so they copy the values and say which). Change the palette in the original first (`ferasb.github.io/theme.css`), then copy it here.
- **Nothing from other sites.** No third-party scripts, fonts, analytics or requests: the privacy page promises it, and the Content Security Policy (`vite.config.ts`) enforces it.
- **Math stays in sync.** A change to the math in TypeScript or Python needs the same change, and a test, in the other.
- **Narrow screens work.** Below 960px wide (or 500px tall) the app is one scrolling column (`design.md` §5.1): `NARROW` in `ui/media.ts`, repeated in `styles.css`. A new control in the Sphere room needs to fit there and work by touch (no hover-only features; previews use `ui/previewPress.ts`). The Gate Lab is for wide screens only.
- **The Learn pages can't contradict the app.** Numbers, matrices, tables and pictures come from the app's math when the site is built; a fact stated in the prose gets a check in `learn/claims.test.ts`. Write for beginners: plain words first, then the math, and never a simplification that's wrong.
