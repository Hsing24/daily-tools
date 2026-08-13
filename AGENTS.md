# AGENTS.md

`daily-tools` — Angular 22 SPA hosting web-dev utilities. Pixel-art / CRT terminal aesthetic, all UI copy in zh-Hant.

## Commands

- Install `pnpm install` — pnpm 11.10.0. Never `npm install` (angular.json says `cli.packageManager: npm`, but the lockfile is pnpm).
- Dev `pnpm start` → http://localhost:8888 (port is 8888, not 4200).
- Build + typecheck `pnpm run build` — there is no separate typecheck script.
- Test once `pnpm exec ng test --watch=false`; single file add `--include src/app/tools/x/x.spec.ts`; single case add `--filter "^WordCount"`.
- Audits `pnpm run lint` = `audit-styles` (Master CSS compliance) + `audit-tools` (tool-catalogue sync).
- `pnpm install` runs `prepare`, which points `core.hooksPath` at `.githooks/`. The pre-push hook runs lint + tests; `SKIP_TESTS=1 git push` skips only the tests.
- CI only runs `build`. Lint and tests are unenforced there — run both yourself before reporting done.
- Do not run `pnpm exec vitest run`; the jsdom env and Vitest globals come from the Angular builder.
- Needs Node 26. On an engine error: `source ~/.nvm/nvm.sh && nvm use 26`.
- `@master/css` emits a "not ESM" build warning. Expected — do not chase it.

## Adding a tool — all five steps, or `pnpm run audit-tools` blocks the push

1. `src/app/tools/<slug>/` — component plus a pure logic module (`-core` / `-engine` / `-logic` / `-stats`), each with its own spec.
2. Lazy child route in `src/app/app.routes.ts` — this file is the audit's source of truth.
3. Entry in `toolGroups` in `src/app/layout/layout.ts`, including `keywords` (feeds the ⌘K palette).
4. ✅ line with `routerLink="/<slug>"` in `src/app/home/home.html`, **and** `/<slug>` added to the link assertion in `src/app/home/home.spec.ts`.
5. `TODO.md` item ticked `- [x]` and annotated with `(<slug>)` — the audit matches TODO items to routes by that slug.

## Styling — enforced by `pnpm run lint`

- Master CSS atomic classes in templates, not Tailwind: `p:32`, `d:flex`, `grid-cols:2@md`. `p-32` silently does nothing.
- Pull colors/spacing/fonts from the CSS vars in `src/styles.css`: `color:var(--ink-bright)`, `bg:var(--canvas-elevated)`. Do not hardcode hex.
- Use full property forms — `color:`, `font-family:`, `font-weight:`, `line-height:`. The shorthands `fg:`, `leading:`, `f:bold` are unused here and misfire.
- Style a component's root via `host: { class: '...' }` in the decorator, not `:host` in CSS.
- `src/app/**/*.css`: ≤15 non-blank lines, and no `display|position|flex|grid|justify-content|align-items|margin|padding|background-color|color|font-*|line-height|border|width|height` declarations. Reserve it for keyframes, `clip-path`, media queries, `prefers-reduced-motion`.
- No `style="..."` anywhere in `src/app/**/*.html`.
- `src/styles.css` is exempt from the audit — design tokens and the global `.dt-button` / `.dt-button--primary|warning|secondary|ghost` classes live there; reuse those for buttons.
- Reuse `src/app/shared/ui/*` (tool-header, tool-panel, tool-breadcrumb, tool-alert, stat-row, terminal-output, key-chip, tool-radio-group, tool-slider) before writing new chrome.
- Read DESIGN.md before any visual change: zero border-radius, zero shadows, zero gradients; `[data-theme="solarized"]` is the one light-theme exception.

## Code conventions

- Angular 22 standalone: never add `standalone: true`, never introduce an NgModule. Providers go in `src/app/app.config.ts`.
- Signals only for state: `signal` / `computed` / `input()` / `viewChild()`. Template-facing members are `protected readonly`.
- `@if` / `@for` / `@switch` blocks; no `*ngIf` / `*ngFor` imports.
- `noPropertyAccessFromIndexSignature` is on — index-signature fields need `obj['foo']`.
- Workers: `new Worker(new URL('./x.worker.ts', import.meta.url), { type: 'module' })`.
- Specs sit next to the file under test. Use `await fixture.whenStable()` rather than `detectChanges()`; stub browser-only APIs (`ResizeObserver`, `matchMedia`) under jsdom.
- Lint cannot catch accessibility: keep visible `:focus-visible` states, accessible names on icon-only buttons, and live regions for async status (WCAG 2.2 AA).
- Prettier runs on its defaults; there is no `.prettierrc` and one must not be added without discussion.
- All user-facing copy is zh-Hant, concise and slightly playful. Reply to the user in zh-Hant, keeping technical terms in English.

## Deployment

- Push to `main` builds with `--base-href "/daily-tools/"` and copies `index.html` → `404.html`. Never assume root-relative asset paths.
