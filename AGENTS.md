# AGENTS.md

`daily-tools` is an Angular 22 SPA that hosts a collection of web-development utilities (word count, JSON formatter, encoders, regex tester…). UI copy is **Traditional Chinese (zh-Hant)**. The visual identity is a pixel-art / CRT terminal aesthetic defined in [DESIGN.md](DESIGN.md) — treat it as the source of truth for product UI decisions.

## Commands

| Task         | Command                                                                              |
| ------------ | ------------------------------------------------------------------------------------ |
| Install      | `pnpm install`                                                                       |
| Dev server   | `pnpm start` (alias for `ng serve`, dev config)                                      |
| Build (prod) | `pnpm run build`                                                                     |
| Unit tests   | `pnpm exec ng test --watch=false` (Vitest via `@angular/build:unit-test`, jsdom env) |

> Local dev uses **pnpm 11.10.0** (see `package.json#packageManager`). CI ([`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml)) also uses pnpm with `pnpm install --frozen-lockfile`. Do not run `npm install` locally — it will produce a `package-lock.json` that conflicts with `pnpm-lock.yaml`.

## Dev environment

- Angular 22 requires a recent Node runtime. If `ng test` or `ng build` fails with an engine/version error, run `source ~/.nvm/nvm.sh && nvm use 26` before validating.
- Use `pnpm exec ng test --watch=false` for one-shot tests. Do not use `pnpm exec vitest run` here; the Angular builder provides the jsdom setup and Vitest globals.
- `@master/css` can emit a build warning about not being ESM. That warning is currently expected.

## Architecture

- **Standalone-component-first.** Angular 22 components are standalone by default — do **not** add `standalone: true` explicitly, and do **not** introduce `NgModule`.
- **Providers go in [`src/app/app.config.ts`](src/app/app.config.ts)** via `ApplicationConfig`. Use `provideRouter`, `provideHttpClient`, etc. — never the legacy `*Module.forRoot()` pattern.
- **Routes** live in [`src/app/app.routes.ts`](src/app/app.routes.ts). The root route renders [`src/app/layout/layout.ts`](src/app/layout/layout.ts), with child lazy routes for `home`, `word-count`, and `design`. Add new tools as lazy child routes: `{ path: 'json-formatter', loadComponent: () => import('./tools/json-formatter/json-formatter').then(m => m.JsonFormatter) }`.
- **Component selector prefix is `app`** (set in `angular.json`). New components: `app-<tool-name>`.
- **Tool catalogue** is the `toolGroups` array in [`src/app/layout/layout.ts`](src/app/layout/layout.ts). When you add a real tool route, register it in that list and mark it active.
- **Shared tool UI** lives under [`src/app/shared/ui/`](src/app/shared/ui/). Check these components before rebuilding chrome such as headers, breadcrumbs, panels, alerts, stat rows, and terminal output.

## Styling: Master CSS, not Tailwind

`@master/css` is initialized in [`src/main.ts`](src/main.ts) with `init()` and applies atomic classes at runtime. Template classes use Master CSS syntax (`property:value`, `|` for shorthand spaces), e.g.:

```html
<div
  class="p:32 bg:#111827 color:#e2e8f0 min-h:100vh border:1px|solid|#334155"
></div>
```

- These are **not** Tailwind utilities — `p-32` will silently do nothing.
- Known-good shorthands include `bg:`, `color:`, `p:`/`px:`/`py:`, `f:14`, `f:bold`, `w:`/`h:`, `border:2px|solid|#hex`, `d:flex`, `d:grid`, `grid-cols:4`, and responsive suffixes like `grid-cols:4@md`.
- Component `*.css` files are mostly empty by design; prefer Master CSS classes in the template, fall back to scoped CSS only for selectors Master CSS can't express.
- When implementing the design system, derive class values from the tokens in [DESIGN.md](DESIGN.md) (colors, spacing, typography). No rounded corners, no soft shadows, no gradients. The only accepted project exception so far is the retained light theme (`data-theme="solarized"`).

## TypeScript strictness

`tsconfig.json` enables `noPropertyAccessFromIndexSignature`, `noImplicitOverride`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, plus Angular's `strictInputAccessModifiers`. Common consequences:

- Access dynamic object fields with bracket notation: `obj['foo']`, not `obj.foo`.
- Override lifecycle hooks with the explicit `override` keyword.
- Signal-based `input()` / `model()` and `computed()` are preferred for component state. Use `viewChild()` / `viewChildren()` instead of decorator queries in new code.

## Testing

- Runner is **Vitest** (not Karma/Jasmine), but `describe` / `it` / `expect` work as globals via `tsconfig.spec.json` → `types: ["vitest/globals"]`.
- Environment is **jsdom**. Browser-only APIs (`ResizeObserver`, `matchMedia`, animations) need a stub.
- Async DOM assertions: `await fixture.whenStable()` before reading `nativeElement` (see [`src/app/app.spec.ts`](src/app/app.spec.ts)). Avoid `fixture.detectChanges()` in zoneless-style tests unless you've explicitly opted into zone change detection.
- Place specs next to the file under test: `foo.ts` + `foo.spec.ts`.

## Deployment

Push to `main` triggers [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml). The workflow builds with `--base-href "/daily-tools/"` and copies `index.html` to `404.html` for SPA fallback. Any new top-level asset path or router base assumption must respect this base href.

## Conventions worth knowing

- **Language.** All user-facing strings are zh-Hant. Match the existing tone (concise, slightly playful).
- **Agent response language.** 所有的對話、描述、解釋與回覆皆必須使用繁體中文 (zh-Hant / zh-tw) 撰寫。若是專有名詞、程式碼符號或技術用語（例如 Standalone Component、Master CSS、RxJS、Signals 等），請維持英文原文。
- **Control flow.** Use the built-in `@if` / `@for` / `@switch` block syntax (already used in `app.html`) — do not import `*ngIf` / `*ngFor` directives.
- **Accessibility.** UI is interactive-tool-heavy; keep keyboard support, semantic controls, labels, focus return, live regions for dynamic status, and contrast in line with WCAG 2.2 AA. The terminal aesthetic in DESIGN.md must not sacrifice focus indicators.
- **Prettier** is installed with default config. No project-specific `.prettierrc`; do not introduce one without discussion.
