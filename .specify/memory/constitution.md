<!--
SYNC IMPACT REPORT
==================
Version change: (template) → 1.0.0
Bump rationale: Initial ratification — template placeholders replaced with the
project's concrete governing principles.

Modified principles: N/A (initial adoption)
Added principles:
  - I. SOLID & Simplicity-First (No Over-Engineering)
  - II. Standalone-Component Architecture
  - III. Test-First Discipline
  - IV. Design-System Fidelity
  - V. Accessibility & Localization
Added sections:
  - Technology & Styling Constraints
  - Development Workflow & Quality Gates

Removed sections: None

Templates requiring updates:
  - .specify/templates/plan-template.md ✅ reviewed (Constitution Check gate is
    generic; no edits required — gates are derived from this file at plan time)
  - .specify/templates/spec-template.md ✅ reviewed (no constitution-specific
    mandatory sections changed)
  - .specify/templates/tasks-template.md ✅ reviewed (task categories already
    cover testing and accessibility-driven work)
  - .specify/templates/checklist-template.md ✅ reviewed (no changes required)

Follow-up TODOs: None
-->

# daily-tools Constitution

## Core Principles

### I. SOLID & Simplicity-First (No Over-Engineering)

Code MUST follow SOLID design principles, applied proportionally to the problem at hand:

- **Single Responsibility**: Each component, service, and function does one thing. A tool
  component renders and orchestrates UI; pure transformation logic (formatting, encoding,
  parsing) lives in separate, independently testable units.
- **Open/Closed**: New tools are added as new lazy routes and components, not by editing the
  internals of existing, unrelated tools.
- **Liskov / Interface Segregation**: Shared abstractions expose only what consumers need.
  Prefer narrow, purpose-specific interfaces over broad "god" services.
- **Dependency Inversion**: Components depend on injected services via `inject()`, not on
  concrete construction. Providers are declared in `src/app/app.config.ts`.

Simplicity is a hard constraint, not an aspiration. YAGNI governs every addition: implement
only what a requested feature needs. No speculative abstractions, no premature generalization,
no helpers or layers introduced for a single call site. Added complexity MUST be justified
against a concrete, present requirement — if it cannot be, it is rejected.

**Rationale**: This is a client-side utility suite where most value is small, self-contained
tools. SOLID keeps tools isolated and testable; simplicity keeps the surface area, bundle, and
maintenance cost low.

### II. Standalone-Component Architecture

Angular MUST be used in its modern, standalone-first form:

- Components are standalone by default — do NOT add `standalone: true` and do NOT introduce
  `NgModule`.
- Providers are configured in `src/app/app.config.ts` via `ApplicationConfig`
  (`provideRouter`, `provideHttpClient`, …). The legacy `*Module.forRoot()` pattern is
  prohibited.
- New tools are registered as lazy routes in `src/app/app.routes.ts` using `loadComponent`,
  and added to the tool catalogue in `src/app/app.ts`.
- Signal-based `input()` / `model()` / `signal()` are preferred over decorator-based
  `@Input()` and `BehaviorSubject` state. Use the built-in `@if` / `@for` / `@switch` control
  flow, never the structural directives `*ngIf` / `*ngFor`.
- The component selector prefix is `app`; new components are named `app-<tool-name>`.

**Rationale**: Consistency with Angular 22 idioms keeps the codebase small, tree-shakeable, and
aligned with the framework's supported direction.

### III. Test-First Discipline

Behavior MUST be covered by tests, and tests are first-class code:

- Pure transformation logic (the core of each tool) MUST have unit tests written alongside the
  implementation. Bug fixes MUST add a regression test that fails before the fix.
- Specs live next to the file under test (`foo.ts` + `foo.spec.ts`) and run on **Vitest** via
  `@angular/build:unit-test` in a jsdom environment.
- Tests MUST be deterministic and independent: no shared mutable state, no reliance on test
  ordering, no arbitrary `sleep`/timeouts. Await `fixture.whenStable()` before reading the DOM;
  stub browser-only APIs (`ResizeObserver`, `matchMedia`, animations) that jsdom lacks.
- `pnpm test` MUST pass before any change is considered complete.

**Rationale**: The utilities make correctness claims (valid JSON, correct base64, matching
regex). Untested transformation logic is unacceptable because the user trusts the output.

### IV. Design-System Fidelity

`DESIGN.md` is the single source of truth for all UI. The current placeholder markup in
`src/app/app.html` is NOT a reference.

- All visual decisions — color, spacing, typography, borders, elevation — MUST derive from the
  tokens defined in `DESIGN.md` (pixel-art / CRT terminal aesthetic).
- The aesthetic constraints are non-negotiable: zero rounded corners, zero soft shadows, zero
  gradients; monospace type and hard pixel-offset elevation only.
- Styling uses **Master CSS** atomic classes (`property:value`, `|` for shorthand spaces) in
  templates. These are NOT Tailwind utilities — `p-32` does nothing; use `p:32`. Component
  `*.css` files stay minimal; scoped CSS is a fallback only for selectors Master CSS cannot
  express.

**Rationale**: A distinctive, coherent identity is a core product feature. Diverging from the
design system erodes it and produces templated-looking defaults the design explicitly rejects.

### V. Accessibility & Localization

Every tool MUST be usable by keyboard and assistive technology, and MUST speak the product's
language:

- UI MUST meet **WCAG 2.2 AA**: all functionality keyboard-operable, visible focus indicators
  (the terminal aesthetic MUST NOT remove them), associated labels for inputs, sufficient
  contrast, and live-region announcements for dynamic results.
- All user-facing strings are **Traditional Chinese (zh-Hant)**, matching the existing concise,
  slightly playful tone. The `<html lang>` MUST be set correctly.
- Interactive behavior uses semantic HTML (`<button>`, `<label>`, landmarks) rather than
  `<div>` click handlers.

**Rationale**: The suite is interaction-heavy; accessibility and a consistent language are
baseline usability requirements, not enhancements.

## Technology & Styling Constraints

- **Framework**: Angular 22 SPA, standalone-component-first, signal-based.
- **Styling**: `@master/css`, imported once in `src/main.ts`. No Tailwind.
- **Package manager**: Local development uses **pnpm** (`packageManager` in `package.json`). CI
  (`.github/workflows/deploy-pages.yml`) uses **npm** because `angular.json` sets
  `cli.packageManager: "npm"`. Do NOT run `npm install` locally (it creates a conflicting
  `package-lock.json`). Any change to scripts or dependencies MUST keep both `pnpm install` and
  `npm ci` resolvable.
- **TypeScript strictness**: `noPropertyAccessFromIndexSignature`, `noImplicitOverride`,
  `noImplicitReturns`, `noFallthroughCasesInSwitch`, and `strictInputAccessModifiers` are
  enabled. Consequences MUST be respected: bracket notation for dynamic fields (`obj['foo']`),
  explicit `override` on lifecycle hooks.
- **Deployment**: Push to `main` triggers GitHub Pages deploy, built with
  `--base-href "/daily-tools/"` and `404.html` SPA fallback. New top-level asset paths or router
  base assumptions MUST respect this base href.

## Development Workflow & Quality Gates

- A change is complete only when `pnpm run build` succeeds and `pnpm test` passes.
- New tools MUST be added as lazy routes and registered in the tool catalogue (`src/app/app.ts`),
  with placeholder stubs marked "即將推出" until active.
- Code review MUST verify compliance with all five core principles. Reviewers reject
  over-engineered solutions, NgModule reintroduction, Tailwind-style classes, missing tests for
  transformation logic, design-system violations, and accessibility regressions.
- Prettier (default config) is the formatter. Do NOT introduce a project-specific `.prettierrc`
  without discussion.
- Documentation files MUST NOT be created to describe changes unless explicitly requested.

## Governance

This constitution supersedes other conventions when they conflict. All pull requests and reviews
MUST verify compliance with the principles above; any deviation MUST be justified in the change
description against a concrete requirement, or it MUST be removed.

Amendments require: (a) a written rationale, (b) a version bump per the policy below, and (c)
propagation of any affected guidance to `AGENTS.md`, `DESIGN.md`, and the `.specify/templates/*`
files in the same change.

**Versioning policy** (semantic):
- **MAJOR**: Backward-incompatible governance changes — removing or redefining a principle.
- **MINOR**: Adding a new principle or section, or materially expanding guidance.
- **PATCH**: Clarifications, wording, and non-semantic refinements.

**Compliance review**: `AGENTS.md` is the runtime guidance for day-to-day development and MUST
stay consistent with this constitution. Where the two overlap, this constitution prevails.

**Version**: 1.0.0 | **Ratified**: 2026-06-30 | **Last Amended**: 2026-06-30
