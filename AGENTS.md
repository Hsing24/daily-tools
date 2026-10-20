# Repository Guidelines

`daily-tools` is an Angular 22 standalone SPA for web-development utilities. The interface uses a pixel-art/CRT terminal aesthetic, and all product UI copy is in Traditional Chinese (`zh-Hant`).

## Project Structure

- `src/app/` contains the application, routes, home page, layout, shared UI, services, and tools.
- Each tool lives in `src/app/tools/<slug>/`; keep its component and pure logic module together, with adjacent specs.
- `src/assets/` holds static assets. `src/styles.css` defines global design tokens and shared button styles. Read `DESIGN.md` before visual changes.

## Build, Test, and Development

- `pnpm install` installs dependencies (use Node 26 and pnpm 11.10.0).
- `pnpm start` serves locally at `http://localhost:8888`.
- `pnpm run build` builds the app and performs Angular type checking.
- `pnpm exec ng test --watch=false` runs the Angular test suite.
- `pnpm run lint` runs the style and tool-catalogue audits.

Run lint and tests before submitting changes; CI currently builds only. Tests use the Angular builder's Vitest setup—do not invoke Vitest directly.

## Coding and Styling

Use Angular signals for state, `protected readonly` for template-facing members, and built-in `@if` / `@for` control flow. Keep specs beside the files they cover. Use Master CSS atomic classes in templates and CSS variables from `src/styles.css`; avoid inline styles and hard-coded colors. Component CSS is limited to keyframes, `clip-path`, and media queries (maximum 15 non-blank lines). Reuse `src/app/shared/ui/` components. Preserve visible keyboard focus, accessible names, and live regions.

## Adding a Tool

Complete the catalogue flow: add the tool and tested pure logic under `src/app/tools/<slug>/`, register a lazy route in `src/app/app.routes.ts`, add it to `toolGroups` in `src/app/layout/layout.ts` with command-palette keywords, link it from `src/app/home/home.html` and its spec, and mark its `TODO.md` item complete with `(<slug>)`. `pnpm run audit-tools` checks these links.

## Commits and Pull Requests

Recent commits use Conventional Commit prefixes such as `feat(ux): ...`, `fix(tools): ...`, and `docs: ...`. Use `<type>(<scope>): <concise summary>`. PRs should describe user-visible changes, link related issues when applicable, include screenshots for UI changes, and list build, lint, and test results.

## Deployment

Deployments use the `/daily-tools/` base path. Avoid assuming assets are served from the domain root.
