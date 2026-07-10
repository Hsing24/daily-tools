---
description: "Use when editing daily-tools Angular templates or styles: Master CSS atomic classes, DESIGN.md pixel terminal tokens, scoped CSS exceptions, and accessible UI styling."
applyTo:
  - "src/**/*.html"
  - "src/**/*.css"
---

# Master CSS Angular Styling

- Treat [DESIGN.md](../../DESIGN.md) as the source of truth for visual decisions: pixel-art / CRT terminal aesthetic, dark navy surfaces, mint action color, hard 2-4px borders, monospace type, zero rounded corners, zero soft shadows, and zero gradients.
- Prefer Master CSS atomic classes directly in Angular templates for layout, spacing, colors, typography, borders, and responsive variants. Do not use Tailwind utilities such as `p-32`; this project uses Master CSS syntax like `p:32`, `bg:#0A1A2F`, `color:#C9D5E8`, `border:2px|solid|#3FE0C5`, `d:flex`, `d:grid`, `grid-cols:4`, and `grid-cols:4@md`.
- Use the known-good Master CSS forms for this project: `color:` instead of `fg:`, `font-family:VT323,monospace` instead of `font:vt323`, and `line-height:1.55` instead of `leading:`.
- Keep component `*.css` files minimal. Use scoped CSS only when Master CSS is a poor fit, such as complex selectors, `clip-path`, media queries, keyframes, `prefers-reduced-motion`, CSS custom properties, or behavior-heavy layouts like responsive drawers.
- Reuse shared UI components under `src/app/shared/ui/` for tool chrome before creating new panel, alert, breadcrumb, stat row, key chip, header, or terminal output markup.
- Preserve Angular 22 project conventions in templates: use built-in `@if`, `@for`, and `@switch` blocks; do not add `*ngIf`, `*ngFor`, or new NgModules.
- Keep all user-facing copy in Traditional Chinese. Match the existing concise, slightly playful product tone.
- Do not add rounded corners, soft shadows, decorative gradients, pastel card layouts, or marketing-style hero compositions to tool screens. Depth comes from flat surface stepping and chunky borders.
- Maintain WCAG 2.2 AA basics while using the terminal aesthetic: semantic controls, accessible names for icon-only buttons, visible `:focus-visible` states, keyboard support, sufficient contrast, and live regions for dynamic status when needed. Never use `outline:none` without an equivalent focus indicator.

```html
<app-tool-panel
  class="d:block bg:#122339 color:#C9D5E8 border:2px|solid|#3FE0C5 p:24"
>
  <button class="bg:#3FE0C5 color:#0A1A2F border:0 p:8|12 f:14 f:bold">
    執行
  </button>
</app-tool-panel>
```
