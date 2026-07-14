---
version: alpha
name: DevTool-Terminal-design-system
description: A pixel-art terminal interface for a web-developer utility suite. Dark navy CRT canvases overlaid with low-opacity scanlines, chunky 2–4px hard-edged borders, and a single mint-green action color carry every interactive surface. Zsh-style chevron breadcrumbs segment navigation; a Cmd+K command palette is the primary input modality. Zero rounded corners, zero soft shadows, zero gradients — only monospace type, hard pixel-offset elevation, and the unmistakable text-first density of a power-user terminal.

colors:
  # Brand & accent
  primary: "#3FE0C5"          # Pantone 333c — mint green; the single action color
  primary-bright: "#6BFFE0"   # active/hover highlight; prompt blink color
  primary-dim: "#2BAE96"      # disabled or upstream breadcrumb segment
  gold: "#F1B434"             # Pantone 142c — secondary accent / status segment
  gold-bright: "#FFD166"
  gold-dim: "#B8830A"
  warning: "#E03C31"          # Pantone 179c — destructive / error
  warning-dim: "#8A2018"

  # Surfaces
  canvas: "#0A1A2F"           # Pantone 5395c — primary dark-navy canvas
  canvas-deep: "#050E1C"      # deepest layer — sidebar, modal scrim base
  canvas-elevated: "#122339"  # raised panel surface
  canvas-elevated-2: "#15263F" # nested container surface
  canvas-input: "#081424"     # input / textarea fill
  surface-overlay: "rgba(10, 26, 47, 0.85)" # Cmd+K modal scrim
  scanline-tint: "rgba(63, 224, 197, 0.04)" # CRT scanline overlay color

  # Text
  ink-bright: "#E6F1FF"       # headings / strong body on dark
  ink: "#C9D5E8"              # default body
  ink-muted: "#6A7C99"        # secondary copy, captions, separators
  ink-disabled: "#3A4A66"     # disabled labels, placeholder text
  on-primary: "#0A1A2F"       # canvas color used as text on mint surfaces
  on-gold: "#0A1A2F"
  on-warning: "#FFFFFF"

  # Borders (chunky pixel edges)
  border-default: "#3FE0C5"   # default chunky border = primary
  border-muted: "#1E3050"     # subtle in-panel divider
  border-gold: "#F1B434"
  border-warning: "#E03C31"

  # Syntax — Monokai (default JSON Formatter theme)
  syntax-monokai-bg: "#272822"
  syntax-monokai-fg: "#F8F8F2"
  syntax-monokai-keyword: "#F92672"
  syntax-monokai-string: "#E6DB74"
  syntax-monokai-number: "#AE81FF"
  syntax-monokai-function: "#A6E22E"
  syntax-monokai-property: "#66D9EF"
  syntax-monokai-comment: "#75715E"

  # Syntax — Solarized Light (alt theme)
  syntax-solarized-bg: "#FDF6E3"
  syntax-solarized-fg: "#657B83"
  syntax-solarized-keyword: "#859900"
  syntax-solarized-string: "#2AA198"
  syntax-solarized-number: "#D33682"
  syntax-solarized-function: "#268BD2"
  syntax-solarized-property: "#B58900"
  syntax-solarized-comment: "#93A1A1"

typography:
  pixel-display:
    fontFamily: "VT323, 'Press Start 2P', ui-monospace, monospace"
    fontSize: 64px
    fontWeight: 400
    lineHeight: 1.0
    letterSpacing: 0
  pixel-h1:
    fontFamily: "VT323, 'Press Start 2P', ui-monospace, monospace"
    fontSize: 48px
    fontWeight: 400
    lineHeight: 1.05
    letterSpacing: 0
  pixel-h2:
    fontFamily: "VT323, 'Press Start 2P', ui-monospace, monospace"
    fontSize: 36px
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: 0
  pixel-h3:
    fontFamily: "VT323, ui-monospace, monospace"
    fontSize: 28px
    fontWeight: 400
    lineHeight: 1.15
    letterSpacing: 0
  pixel-eyebrow:
    fontFamily: "VT323, ui-monospace, monospace"
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.0
    letterSpacing: 2px
  mono-h4:
    fontFamily: "'IBM Plex Mono', 'JetBrains Mono', Menlo, monospace"
    fontSize: 20px
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: 0
  mono-body-lg:
    fontFamily: "'IBM Plex Mono', 'JetBrains Mono', Menlo, monospace"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0
  mono-body:
    fontFamily: "'IBM Plex Mono', 'JetBrains Mono', Menlo, monospace"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: 0
  mono-body-strong:
    fontFamily: "'IBM Plex Mono', 'JetBrains Mono', Menlo, monospace"
    fontSize: 14px
    fontWeight: 600
    lineHeight: 1.55
    letterSpacing: 0
  mono-prompt:
    fontFamily: "'IBM Plex Mono', 'JetBrains Mono', Menlo, monospace"
    fontSize: 16px
    fontWeight: 500
    lineHeight: 1.0
    letterSpacing: 0
  mono-caption:
    fontFamily: "'IBM Plex Mono', 'JetBrains Mono', Menlo, monospace"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: 0.5px
  mono-key-chip:
    fontFamily: "'IBM Plex Mono', 'JetBrains Mono', Menlo, monospace"
    fontSize: 11px
    fontWeight: 600
    lineHeight: 1.0
    letterSpacing: 1px
  mono-button:
    fontFamily: "'IBM Plex Mono', 'JetBrains Mono', Menlo, monospace"
    fontSize: 14px
    fontWeight: 600
    lineHeight: 1.0
    letterSpacing: 1px
  mono-code:
    fontFamily: "'IBM Plex Mono', 'JetBrains Mono', Menlo, monospace"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: 0

rounded:
  none: 0px

spacing:
  none: 0px
  xxs: 2px
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  xxl: 32px
  section: 48px

borders:
  hairline: "1px solid {colors.border-muted}"
  chunky: "2px solid {colors.border-default}"
  chunky-thick: "4px solid {colors.border-default}"
  chunky-gold: "2px solid {colors.border-gold}"
  chunky-warning: "2px solid {colors.border-warning}"

elevation:
  # Shadows are disabled system-wide. Depth comes ONLY from flat surface-color
  # stepping (canvas → canvas-elevated → canvas-elevated-2) and chunky borders.
  # The pixel-* tokens are retained for reference but MUST resolve to none.
  none: "0 0 0 0 transparent"
  pixel-sm: "0 0 0 0 transparent"
  pixel-md: "0 0 0 0 transparent"
  pixel-lg: "0 0 0 0 transparent"

components:
  global-sidebar:
    backgroundColor: "{colors.canvas-deep}"
    textColor: "{colors.ink}"
    typography: "{typography.mono-body}"
    rounded: "{rounded.none}"
    border-left: "{borders.chunky}"
    width: 240px
    padding: 24px 16px
  sidebar-section-label:
    backgroundColor: transparent
    textColor: "{colors.ink-muted}"
    typography: "{typography.pixel-eyebrow}"
    rounded: "{rounded.none}"
    padding: 16px 12px 8px 12px
  sidebar-nav-item:
    backgroundColor: transparent
    textColor: "{colors.ink}"
    typography: "{typography.mono-body}"
    rounded: "{rounded.none}"
    padding: 8px 12px
  sidebar-nav-item-active:
    backgroundColor: "{colors.canvas-elevated}"
    textColor: "{colors.primary}"
    typography: "{typography.mono-body-strong}"
    rounded: "{rounded.none}"
    padding: 8px 12px
    border-left: "4px solid {colors.primary}"
  main-canvas:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    padding: 32px
  scanline-overlay:
    backgroundColor: transparent
    backgroundImage: "repeating-linear-gradient(0deg, {colors.scanline-tint} 0px, {colors.scanline-tint} 1px, transparent 1px, transparent 3px)"
    pointer-events: none
    z-index: 1
  prompt-bar:
    backgroundColor: "{colors.canvas-deep}"
    textColor: "{colors.primary}"
    typography: "{typography.mono-prompt}"
    rounded: "{rounded.none}"
    height: 40px
    padding: 0 16px
    border-bottom: "{borders.chunky}"
  breadcrumb-zsh:
    backgroundColor: transparent
    typography: "{typography.mono-body-strong}"
    rounded: "{rounded.none}"
    height: 28px
    gap: -14px # adjacent segments overlap by 14px so the chevron sits over the next segment
  breadcrumb-segment-home:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.mono-body-strong}"
    rounded: "{rounded.none}"
    padding: 4px 18px 4px 12px
    clip-path: "polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%)"
  breadcrumb-segment-category:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.on-gold}"
    typography: "{typography.mono-body-strong}"
    rounded: "{rounded.none}"
    padding: 4px 18px 4px 18px
    clip-path: "polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 14px 100%, 0 50%)"
  breadcrumb-segment-current:
    backgroundColor: "{colors.warning}"
    textColor: "{colors.on-warning}"
    typography: "{typography.mono-body-strong}"
    rounded: "{rounded.none}"
    padding: 4px 18px 4px 18px
    clip-path: "polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 14px 100%, 0 50%)"
  tool-panel:
    backgroundColor: "{colors.canvas-elevated}"
    textColor: "{colors.ink}"
    typography: "{typography.mono-body}"
    rounded: "{rounded.none}"
    border: "{borders.chunky}"
    padding: 24px
  tool-panel-focused:
    backgroundColor: "{colors.canvas-elevated}"
    rounded: "{rounded.none}"
    border: "{borders.chunky-thick}"
    elevation: "{elevation.pixel-lg}"
  dual-pane-divider:
    backgroundColor: "{colors.border-default}"
    width: 2px
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.mono-button}"
    rounded: "{rounded.none}"
    border: none
    padding: 10px 20px
    elevation: "{elevation.none}"
  button-primary-active:
    backgroundColor: "{colors.primary-bright}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.none}"
    border: none
    elevation: "{elevation.none}"
  button-primary-disabled:
    backgroundColor: "{colors.canvas-elevated}"
    textColor: "{colors.ink-disabled}"
    rounded: "{rounded.none}"
    border: none
    elevation: "{elevation.none}"
  button-secondary:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.on-gold}"
    typography: "{typography.mono-button}"
    rounded: "{rounded.none}"
    border: none
    padding: 10px 20px
    elevation: "{elevation.none}"
  button-warning:
    backgroundColor: "{colors.warning}"
    textColor: "{colors.on-warning}"
    typography: "{typography.mono-button}"
    rounded: "{rounded.none}"
    border: none
    padding: 10px 20px
    elevation: "{elevation.none}"
  button-ghost:
    backgroundColor: transparent
    textColor: "{colors.primary}"
    typography: "{typography.mono-button}"
    rounded: "{rounded.none}"
    border: none
    padding: 10px 20px
  button-ghost-focus:
    backgroundColor: "{colors.canvas-elevated}"
    textColor: "{colors.primary-bright}"
    rounded: "{rounded.none}"
    border: none
  key-chip:
    backgroundColor: "{colors.canvas-elevated-2}"
    textColor: "{colors.ink-bright}"
    typography: "{typography.mono-key-chip}"
    rounded: "{rounded.none}"
    border: "{borders.hairline}"
    padding: 4px 8px
  text-input:
    backgroundColor: "{colors.canvas-input}"
    textColor: "{colors.ink-bright}"
    typography: "{typography.mono-body}"
    rounded: "{rounded.none}"
    border: "2px solid {colors.border-muted}"
    padding: 10px 12px
    height: 40px
  text-input-focus:
    backgroundColor: "{colors.canvas-input}"
    textColor: "{colors.ink-bright}"
    rounded: "{rounded.none}"
    border: "2px solid {colors.primary}"
  text-input-error:
    backgroundColor: "{colors.canvas-input}"
    textColor: "{colors.ink-bright}"
    rounded: "{rounded.none}"
    border: "2px solid {colors.warning}"
  textarea-code:
    backgroundColor: "{colors.syntax-monokai-bg}"
    textColor: "{colors.syntax-monokai-fg}"
    typography: "{typography.mono-code}"
    rounded: "{rounded.none}"
    border: "{borders.chunky}"
    padding: 16px
  tool-slider:
    trackColor: "{colors.border-muted}"
    progressColor: "{colors.primary}"
    thumbColor: "{colors.primary}"
    thumbBorder: "2px solid {colors.primary-bright}"
    tickColor: "{colors.ink-disabled}"
    tickColorActive: "{colors.primary}"
  cmd-k-overlay:
    backgroundColor: "{colors.surface-overlay}"
    pointer-events: auto
  cmd-k-modal:
    backgroundColor: "{colors.canvas-elevated}"
    textColor: "{colors.ink-bright}"
    typography: "{typography.mono-body}"
    rounded: "{rounded.none}"
    border: "{borders.chunky-thick}"
    width: 640px
    padding: 24px
    elevation: "{elevation.pixel-lg}"
  cmd-k-prompt-input:
    backgroundColor: transparent
    textColor: "{colors.ink-bright}"
    typography: "{typography.mono-prompt}"
    rounded: "{rounded.none}"
    border-bottom: "2px solid {colors.primary}"
    padding: 8px 0
    caret-color: "{colors.primary-bright}"
    prompt-glyph: ">"
    prompt-glyph-color: "{colors.primary}"
  cmd-k-list-item:
    backgroundColor: transparent
    textColor: "{colors.ink}"
    typography: "{typography.mono-body}"
    rounded: "{rounded.none}"
    padding: 10px 12px
  cmd-k-list-item-selected:
    backgroundColor: "{colors.primary-dim}"
    textColor: "{colors.on-primary}"
    typography: "{typography.mono-body-strong}"
    rounded: "{rounded.none}"
    padding: 10px 12px
    border-left: "4px solid {colors.primary}"
  toast-success:
    backgroundColor: "{colors.canvas-elevated}"
    textColor: "{colors.primary}"
    typography: "{typography.mono-body-strong}"
    rounded: "{rounded.none}"
    border: "{borders.chunky}"
    padding: 12px 16px
    elevation: "{elevation.pixel-sm}"
  toast-warning:
    backgroundColor: "{colors.canvas-elevated}"
    textColor: "{colors.gold}"
    typography: "{typography.mono-body-strong}"
    rounded: "{rounded.none}"
    border: "{borders.chunky-gold}"
    padding: 12px 16px
    elevation: "{elevation.pixel-sm}"
  toast-error:
    backgroundColor: "{colors.canvas-elevated}"
    textColor: "{colors.warning}"
    typography: "{typography.mono-body-strong}"
    rounded: "{rounded.none}"
    border: "{borders.chunky-warning}"
    padding: 12px 16px
    elevation: "{elevation.pixel-sm}"
  footer:
    backgroundColor: "{colors.canvas-deep}"
    textColor: "{colors.ink-muted}"
    typography: "{typography.mono-caption}"
    rounded: "{rounded.none}"
    border-top: "{borders.hairline}"
    padding: 16px 32px
---

## Overview

**DevTool Terminal** wears the skin of an 8-bit CRT but carries a modern, keyboard-first information architecture. Every page is a stack of bordered "panels" sitting on a dark navy canvas, framed by chunky 2–4px hard-edged borders in a single mint-green action color (`{colors.primary}` — Pantone 333c equivalent). Typography is exclusively monospace; display headlines use the pixel-bitmap face VT323, body and UI use IBM Plex Mono. Color is reserved: a near-black navy canvas, mint green for action, gold for status, red for destructive — no fourth accent, no decorative gradients, no soft shadows.

Density is unusually high compared to modern marketing-led design systems, and that is intentional. The product is a power-user terminal; cramped grids, dense link columns, and persistent breadcrumbs are features, not bugs. The dashboard features a text-only, off-canvas sidebar (no icons, per PRD) on the right, toggled by the prompt bar, and devotes the viewport to a single active tool surface. A persistent Zsh-style chevron breadcrumb sits above each tool, and a Cmd+K command palette is the primary navigation modality — so much so that the UI is comfortable being half-empty until the user invokes it.

Across all surfaces — JSON Formatter, Base64, CSS Minifier, Regex Tester, Network Tools — the chassis is identical. Tools differ in content, never in chrome. A single low-opacity scanline overlay (`{colors.scanline-tint}` at ~4% alpha) is rendered above the canvas to evoke CRT phosphor; it is the only ambient texture in the system.

**Key Characteristics:**
- Photography-free, text-first presentation; the terminal IS the brand.
- A single mint-green action color (`{colors.primary}` — #3FE0C5) carries every interactive surface — no second brand color exists.
- Three semantic accents only: mint (action), gold (status/secondary), red (destructive).
- Chunky pixel borders at 2px (default) and 4px (focused / modal); zero rounded corners anywhere.
- No shadows anywhere — depth comes only from flat surface-color stepping and chunky borders; buttons are flat, borderless solid-color blocks.
- One ambient effect: the CRT scanline overlay (~4% alpha repeating gradient).
- Zsh-style chevron breadcrumb segments — a powerline "arrow trail" (cf. powerlevel10k / p10k prompt) built with `clip-path`, not SVG, so they scale crisply. Segment fills run mint → gold → red (action → status → destructive).
- Cmd+K command palette as the primary input modality; every tool reachable in ≤ 2 keystrokes.
- Text-only sidebar nav — no icons (PRD §2 requirement).
- Desktop-first layout optimized for wide-screen terminal simulations; mobile is a graceful degradation, not a primary target.

## Colors

> **Source:** Project PRD §2. Pantone references converted to sRGB-equivalent HEX. The system is dark-only by design; no light theme exists.

### Brand & Accent

- **Mint Green** (`{colors.primary}` — #3FE0C5, Pantone 333c equivalent): The single action color. Every link, every primary CTA, every focus ring, the prompt glyph (`>`), the breadcrumb "current location" segment. This is the one "click me" signal in the system.
- **Mint Bright** (`{colors.primary-bright}` — #6BFFE0): Active/pressed state on primary buttons; the blinking caret color in the Cmd+K input.
- **Mint Dim** (`{colors.primary-dim}` — #2BAE96): Upstream breadcrumb segments (Home > Category before the current tool), Cmd+K list-item-selected fill, disabled primary states that still need to read as branded.
- **Gold** (`{colors.gold}` — #F1B434, Pantone 142c equivalent): Secondary accent for non-destructive status — pending operations, warning toasts that don't block, the "BETA" label on a tool. Never used as a primary CTA.
- **Warning Red** (`{colors.warning}` — #E03C31, Pantone 179c equivalent): Destructive actions, validation errors, error toasts. The only red in the system.

### Surfaces

- **Canvas** (`{colors.canvas}` — #0A1A2F, Pantone 5395c equivalent): The primary dark-navy canvas. The body, main content area, default tool background.
- **Canvas Deep** (`{colors.canvas-deep}` — #050E1C): The deepest layer. Sidebar background, modal scrim base, footer.
- **Canvas Elevated** (`{colors.canvas-elevated}` — #122339): Raised panel surface — tool panels, Cmd+K modal box.
- **Canvas Elevated 2** (`{colors.canvas-elevated-2}` — #15263F): A second tier for nested containers (e.g., a panel inside a panel), and the home breadcrumb segment fill.
- **Canvas Input** (`{colors.canvas-input}` — #081424): The internal fill of text inputs and textareas — deliberately darker than the canvas so the input reads as a recessed slot.
- **Surface Overlay** (`{colors.surface-overlay}` — rgba(10, 26, 47, 0.85)): The full-viewport scrim behind the Cmd+K modal.
- **Scanline Tint** (`{colors.scanline-tint}` — rgba(63, 224, 197, 0.04)): The mint-tinted scanline overlay color. Always at ~4% alpha; never increased.

### Text

- **Ink Bright** (`{colors.ink-bright}` — #E6F1FF): Headings, strong inline emphasis, key-chip text. The brightest text tone in the system.
- **Ink** (`{colors.ink}` — #C9D5E8): Default body text on all dark surfaces.
- **Ink Muted** (`{colors.ink-muted}` — #6A7C99): Captions, footer copy, separators, inactive sidebar labels.
- **Ink Disabled** (`{colors.ink-disabled}` — #3A4A66): Placeholder text in inputs, disabled labels.
- **On-Primary** (`{colors.on-primary}` — #0A1A2F): Text rendered on mint-green or gold surfaces; uses the canvas color for maximum contrast (~9.5:1 against `{colors.primary}`).
- **On-Warning** (`{colors.on-warning}` — #FFFFFF): Text on the red warning button — pure white for legibility.

### Borders

All borders are chunky and hard-edged. No anti-aliased decorative borders, no semi-transparent edges.

- **Border Default** (`{colors.border-default}` — #3FE0C5): The signature mint border on every tool panel, every primary button, every focused input. 2px is the default thickness; 4px is reserved for the focused panel state and the Cmd+K modal.
- **Border Muted** (`{colors.border-muted}` — #1E3050): The "hairline" in this system — used for in-panel dividers, key-chip outlines, default text-input borders before focus.
- **Border Gold** / **Border Warning** (`{colors.border-gold}` / `{colors.border-warning}`): Matching chunky borders for gold and red semantic surfaces.

### Brand Gradient

**No decorative gradients.** The only repeating pattern in the system is the `repeating-linear-gradient` that paints the CRT scanline overlay — and that is a texture, not a brand gradient. Background fills are flat solids; depth comes from surface-color stepping (canvas → canvas-elevated → canvas-elevated-2), chunky borders, and the hard pixel-offset shadow.

### Syntax Highlighting

The JSON Formatter and other code-display surfaces ship two themes. **Monokai** is the default; **Solarized Dark** is selectable from the prompt bar.

#### Monokai (default)
- Background: `{colors.syntax-monokai-bg}` (#272822)
- Foreground: `{colors.syntax-monokai-fg}` (#F8F8F2)
- Keyword: `{colors.syntax-monokai-keyword}` (#F92672)
- String: `{colors.syntax-monokai-string}` (#E6DB74)
- Number: `{colors.syntax-monokai-number}` (#AE81FF)
- Function: `{colors.syntax-monokai-function}` (#A6E22E)
- Property / Key: `{colors.syntax-monokai-property}` (#66D9EF)
- Comment: `{colors.syntax-monokai-comment}` (#75715E)

#### Solarized Light (alt)
- Background: `{colors.syntax-solarized-bg}` (#FDF6E3)
- Foreground: `{colors.syntax-solarized-fg}` (#657B83)
- Keyword: `{colors.syntax-solarized-keyword}` (#859900)
- String: `{colors.syntax-solarized-string}` (#2AA198)
- Number: `{colors.syntax-solarized-number}` (#D33682)
- Function: `{colors.syntax-solarized-function}` (#268BD2)
- Property / Key: `{colors.syntax-solarized-property}` (#B58900)
- Comment: `{colors.syntax-solarized-comment}` (#93A1A1)

## Typography

### Font Family

- **Pixel display**: `VT323, 'Press Start 2P', ui-monospace, monospace` — VT323 is a bitmap-style monospace based on a 1970s CRT terminal face. Used for every display headline and the eyebrow label above sidebar sections. `Press Start 2P` is the substitution path for tiny pixel headers (≤ 24px) where VT323's free-stroke design loses fidelity.
- **UI / body**: `'IBM Plex Mono', 'JetBrains Mono', Menlo, monospace` — IBM Plex Mono carries every interactive surface, every paragraph, every button label, and every code editor. The whole product is monospaced.
- **OpenType features**: Body text uses default settings. Code editors enable `font-variant-ligatures: none` to keep `==`, `=>`, `!=` visually unfused — developers reviewing JSON or regex output need each character to render literally.

### Hierarchy

| Token | Size | Weight | Line Height | Letter Spacing | Use |
|---|---|---|---|---|---|
| `{typography.pixel-display}` | 64px | 400 | 1.0 | 0 | Splash / 404 / empty-state hero |
| `{typography.pixel-h1}` | 48px | 400 | 1.05 | 0 | Tool page title |
| `{typography.pixel-h2}` | 36px | 400 | 1.1 | 0 | Section heading inside a tool |
| `{typography.pixel-h3}` | 28px | 400 | 1.15 | 0 | Sub-section / Cmd+K modal title |
| `{typography.pixel-eyebrow}` | 18px | 400 | 1.0 | 2px | Sidebar section labels, status eyebrows |
| `{typography.mono-h4}` | 20px | 600 | 1.3 | 0 | In-panel heading; tool-panel title |
| `{typography.mono-body-lg}` | 16px | 400 | 1.5 | 0 | Lead paragraph, prompt input |
| `{typography.mono-body}` | 14px | 400 | 1.55 | 0 | Default paragraph, all UI labels |
| `{typography.mono-body-strong}` | 14px | 600 | 1.55 | 0 | Inline emphasis, breadcrumb segment label |
| `{typography.mono-prompt}` | 16px | 500 | 1.0 | 0 | Cmd+K input, prompt bar status line |
| `{typography.mono-caption}` | 12px | 400 | 1.4 | 0.5px | Captions, footer copy, helper text |
| `{typography.mono-key-chip}` | 11px | 600 | 1.0 | 1px | Keyboard shortcut chips (⌘K, ⏎) |
| `{typography.mono-button}` | 14px | 600 | 1.0 | 1px | All button labels |
| `{typography.mono-code}` | 14px | 400 | 1.6 | 0 | JSON / Base64 / regex editor content |

### Principles

- **Monospace everywhere.** There is no proportional sans-serif anywhere in the system. Even body paragraphs are IBM Plex Mono. The vertical alignment this creates is a feature: numeric columns, command syntax, and code samples all align without any width-fixing overrides.
- **Two weights only: 400 and 600.** Weight 500 and weight 700 are deliberately absent. Mid-emphasis uses 600; default uses 400. Display sizes (VT323) ship at a single weight — VT323 has no italic or weight variants by design.
- **No italics.** Monospace fonts render emphasis poorly in italic. Use weight 600 or surface color for emphasis instead.
- **Letter-spacing widens at tiny sizes.** `{typography.mono-caption}` (12px) gets +0.5px tracking; `{typography.mono-button}` and `{typography.mono-key-chip}` get +1px; `{typography.pixel-eyebrow}` gets +2px. This keeps small labels readable on dark backgrounds without bumping size.
- **Line-height is context-specific.** Display sizes use 1.0–1.15 (tight, pixel-bitmap stacking). UI body uses 1.55 for breathing room inside dense panels. Code editors use 1.6 — the extra leading matters when reading JSON.
- **No `:visited` link styling.** Browser-default visited link styles override our action color. Reset `a:visited { color: inherit; }` globally and let surface context define link tone.

### Font Substitutes

- **If VT323 is unavailable**: fall back to `'Press Start 2P'` (Google Fonts) for ≤ 24px headers. For larger sizes, use `'Major Mono Display'` or accept the `ui-monospace` system fallback — it will not be pixel-style but will preserve monospace alignment.
- **If IBM Plex Mono is unavailable**: `JetBrains Mono` is the closest open-source equivalent (slightly heavier vertical stems, identical x-height). `Menlo` is the macOS system fallback. Never substitute a proportional sans-serif — the entire layout assumes monospace cell width.
- All fonts are self-hosted via `@font-face` with `font-display: swap` to prevent FOIT (Flash of Invisible Text). The PRD calls out "lightweight, fast-loading"; subset VT323 to printable ASCII only.

## Layout

### Spacing System

- **Base unit:** 4px. The grid is tighter than typical modern SaaS because terminal density is a deliberate brand cue.
- **Tokens:** `{spacing.xxs}` 2px · `{spacing.xs}` 4px · `{spacing.sm}` 8px · `{spacing.md}` 12px · `{spacing.lg}` 16px · `{spacing.xl}` 24px · `{spacing.xxl}` 32px · `{spacing.section}` 48px.
- **Tool panel padding:** `{spacing.xl}` (24px) — generous internal padding so chunky 2px borders don't crowd content.
- **Main canvas padding:** `{spacing.xxl}` (32px) — the gutter between sidebar/borders and the tool panel inside.
- **Button padding:** 10px × 20px — exact pixel values, not token-derived, because button hit areas need to be deterministic for keyboard navigation.
- **Section vertical rhythm:** `{spacing.section}` (48px) between distinct content blocks inside a tool surface.

### Grid & Container

- **Dashboard Layout**: A 240px off-canvas sidebar drawer (`{component.global-sidebar}`) toggled from the prompt bar, which remains hidden on the right until invoked, and a fluid main canvas. This keeps the workspace clean and focused across all viewports.
- **Max content width**: none. The main canvas absorbs all available width because the product is desktop-first and benefits from wide terminal real-estate. Individual tool panels may cap at 1200px when content (e.g., regex tester input) doesn't need more.
- **Dual-pane tools** (JSON Formatter, Base64): 50/50 split with a 2px `{component.dual-pane-divider}` between input and output.
- **Gutters between panels**: `{spacing.lg}` (16px) — tight, consistent with terminal density.

### Whitespace Philosophy

DevTool Terminal does not aspire to modern marketing-page whitespace. The product is a tool; whitespace exists where it improves scanning (between distinct semantic sections, around the Cmd+K modal, inside button hit areas) and is otherwise minimized. The result reads as a "working terminal" rather than a "marketing surface" — exactly the brand goal.

## Elevation & Depth

| Level | Treatment | Use |
|---|---|---|
| Flat | No border, no shadow | Sidebar nav items, breadcrumb segments, buttons, body copy |
| Hairline | `{borders.hairline}` (1px `{colors.border-muted}`) | In-panel dividers, key-chip outlines, default text-input |
| Chunky | `{borders.chunky}` (2px `{colors.border-default}`) | Tool panels, focused inputs |
| Chunky Thick | `{borders.chunky-thick}` (4px `{colors.border-default}`) | Focused/modal panel, Cmd+K modal box |
| Shadows | Disabled system-wide | Never — use surface stepping or border thickness instead |

**Shadow philosophy.** There are **no shadows** in this system — no blur, and no hard pixel-offset drops either. Elevation is communicated purely through flat surface-color stepping (`canvas → canvas-elevated → canvas-elevated-2`) and chunky borders. On active/pressed states, buttons brighten their fill (`{colors.primary}` → `{colors.primary-bright}`) rather than moving or dropping a shadow. This keeps every surface a flat, crisp pixel block.

### CRT Scanline Treatment

The single ambient texture in the system. Implemented as a fixed-position overlay that sits above all content with `pointer-events: none`:

```css
.scanline-overlay {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 1;
  background-image: repeating-linear-gradient(
    0deg,
    rgba(63, 224, 197, 0.04) 0px,
    rgba(63, 224, 197, 0.04) 1px,
    transparent 1px,
    transparent 3px
  );
}
```

Optional CRT flicker animation (1.5% opacity oscillation at 60fps) MUST be gated behind `@media (prefers-reduced-motion: no-preference)`. The static overlay is the baseline; flicker is enhancement.

## Shapes

### Border Radius Scale

| Token | Value | Use |
|---|---|---|
| `{rounded.none}` | 0px | Everything |

That is the entire shape system. There is no `sm`, no `lg`, no `pill`. Pixel terminals do not round corners. Every panel, every button, every input, every modal is a hard rectangle. If a future component is tempted to round its corners, the answer is no — change the elevation or the border thickness instead.

### Chevron Breadcrumb Geometry

The Zsh-style breadcrumb segments are the closest the system gets to a non-rectangular shape, and they are built with `clip-path` polygons, not SVG, so they scale with content:

- **Home segment** (leftmost): polygon with a flat left edge and a 14px-wide right-pointing chevron.
  ```css
  clip-path: polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%);
  ```
- **Middle/current segments**: polygon with a 14px-wide chevron notch on the left edge (to receive the previous segment's tip) and a 14px-wide right-pointing chevron on the right edge.
  ```css
  clip-path: polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 14px 100%, 0 50%);
  ```
- **Overlap**: adjacent segments are negatively margined by `-14px` so the right chevron of segment N sits over segment N+1. The chevron reads as "pointing to the next segment."
- **Color progression**: home → `{colors.primary}` (mint / action) → category → `{colors.gold}` (status) → current → `{colors.warning}` (red / destructive). The trail walks through all three semantic accents, mirroring a powerlevel10k (p10k) shell prompt.

### Image & Icon Policy

- **No raster imagery in the UI chrome.** No product renders, no hero photography, no decorative illustration.
- **Icons in tool content** (e.g., a copy-to-clipboard glyph inside a code editor) use pixel-art SVG at 16x16 or 24x24 with `image-rendering: pixelated` and `shape-rendering: crispEdges` to preserve the 8-bit feel.
- **Sidebar nav has no icons** (PRD §2 requirement). Navigation is pure text.
- **Favicon and Apple Touch icon** use the pixelated prompt symbol `>` in mint green on canvas-deep — PRD §3 requirement.

## Components

### Global Sidebar

**`global-sidebar`** — A 240px-wide off-canvas drawer that slides out from the right edge. Background `{colors.canvas-deep}`, text `{colors.ink}` in `{typography.mono-body}`, left edge `{borders.chunky}` (2px mint). Contains text-only navigation grouped by tool category. **No icons.** Section labels render in `{typography.pixel-eyebrow}` (VT323 18px, +2px tracking, `{colors.ink-muted}`).

**`sidebar-nav-item`** — A plain text link, padding 8px × 12px. Default: `{colors.ink}` text. Hover/focus: text brightens to `{colors.ink-bright}`. No background fill on hover — discovery cue is text-color only.

**`sidebar-nav-item-active`** — Background `{colors.canvas-elevated}`, text `{colors.primary}` at weight 600, 4px-solid mint left border. Active state is the only sidebar item that gets a fill.

### Prompt Bar

**`prompt-bar`** — A 40px-tall horizontal strip pinned below the top of the main canvas (above the breadcrumb). Background `{colors.canvas-deep}`, 2px mint bottom border. Left: a live prompt-style status line in `{typography.mono-prompt}` rendering `user@devtool-terminal ~/path/to/tool $ `. Right: theme switcher (Monokai/Solarized) as a `{component.button-ghost}` mini-button, plus a Cmd+K trigger key chip.

### Breadcrumb (Zsh Chevron)

**`breadcrumb-zsh`** — A horizontal sequence of three colored chevron segments rendered above each tool's title: Home > Category > Current Tool. Height 28px, segments overlap by 14px to create the continuous powerline "arrow trail" pattern of a Zsh / powerlevel10k (p10k) prompt. Each segment is a single `<a>` (or `<span>` on the current item) with `clip-path` shaping. The fills run through the three semantic accents in order — action → status → destructive.

- `{component.breadcrumb-segment-home}` — `{colors.primary}` (mint) fill, `{colors.on-primary}` text. Always reads "DevTool".
- `{component.breadcrumb-segment-category}` — `{colors.gold}` fill, `{colors.on-gold}` text. The tool category (e.g., "Encoders", "Formatters").
- `{component.breadcrumb-segment-current}` — `{colors.warning}` (red) fill, `{colors.on-warning}` text. The current tool name.

### Tool Panel

**`tool-panel`** — The standard container for any tool surface. Background `{colors.canvas-elevated}`, `{borders.chunky}` (2px mint border), padding `{spacing.xl}` (24px). No rounded corners. Title at the top in `{typography.mono-h4}`, optional eyebrow in `{typography.pixel-eyebrow}` above it.

**`tool-panel-focused`** — A focused variant for the "active" tool in a multi-panel layout. Upgrades border to `{borders.chunky-thick}` (4px) and adds `{elevation.pixel-lg}` (8px hard offset). Used when the user has explicitly entered a panel via keyboard navigation.

**`dual-pane-divider`** — A 2px vertical line in `{colors.border-default}` that separates input and output in dual-pane tools (JSON Formatter, Base64). Full-height of the panel; no padding around it.

### Buttons

All buttons are sharp, **borderless**, flat solid-color rectangles — no border and no shadow. They read as pixel blocks. Active state brightens the fill instead of moving or dropping a shadow.

- **`button-primary`** — Background `{colors.primary}`, text `{colors.on-primary}` (canvas dark) in `{typography.mono-button}` (14px / 600 / +1px tracking), no border, padding 10px × 20px, no shadow. The default action button.
- **`button-primary-active`** — Background brightens to `{colors.primary-bright}`. No translate, no shadow.
- **`button-primary-disabled`** — Background `{colors.canvas-elevated}`, text `{colors.ink-disabled}`, no border. Cursor `not-allowed`.
- **`button-secondary`** — Same borderless chassis on gold. Used for secondary affirmative actions ("Copy", "Save Preset"). Never used for the page's primary action.
- **`button-warning`** — Same borderless chassis on warning red. Used for destructive actions ("Reset", "Clear All", "Delete History").
- **`button-ghost`** — Transparent background, mint text, no border. Used inside dense surfaces where a filled button would dominate. Focus state fills with `{colors.canvas-elevated}` and brightens text to `{colors.primary-bright}`.

### Inputs

- **`text-input`** — Single-line text field. Background `{colors.canvas-input}` (a recessed darker tone), `{colors.ink-bright}` text in `{typography.mono-body}`, 2px `{colors.border-muted}` border (darker than the panel border so unfocused inputs read as quiet), padding 10px × 12px, height 40px.
- **`text-input-focus`** — Border upgrades to 2px `{colors.primary}` on focus. No outer outline — the border IS the focus indicator.
- **`text-input-error`** — Border upgrades to 2px `{colors.warning}`. Helper text below renders in `{colors.warning}` `{typography.mono-caption}`.
- **`textarea-code`** — The JSON/Base64/regex editor surface. Background switches to the active syntax theme (`{colors.syntax-monokai-bg}` by default). Text uses syntax-highlighted colors per token type. 2px mint border, padding 16px, monospace required.
- **`tool-slider`** — A pixel-art range slider. Background track is 4px height in `{colors.border-muted}`. Drag handle is a square block in `{colors.primary}` with 2px `{colors.primary-bright}` border. Active progress is filled dynamic linear-gradient in `{colors.primary}`. Standard ticks below the slider toggle state and highlight active color if value is equal or greater than the tick value.


### Cmd+K Command Palette

The core of the keyboard-first UX. Triggered with `⌘K` (macOS) / `Ctrl+K` (Windows/Linux).

- **`cmd-k-overlay`** — Full-viewport scrim at `{colors.surface-overlay}` (rgba(10, 26, 47, 0.85)). Clicking outside dismisses. Captures pointer events.
- **`cmd-k-modal`** — Centered 640px-wide box (90vw on mobile). Background `{colors.canvas-elevated}`, `{borders.chunky-thick}` (4px mint border), `{elevation.pixel-lg}` (8px hard offset). Padding `{spacing.xl}` (24px). No rounded corners.
- **`cmd-k-prompt-input`** — A bottom-bordered text input rendered as a terminal prompt. Leading glyph `>` in `{colors.primary}` (constant, not part of the input value), then a blinking mint caret. Typography `{typography.mono-prompt}` (16px / 500). Border bottom only (2px solid `{colors.primary}`), no left/right/top.
- **`cmd-k-list-item`** — A single-row list item under the input. Padding 10px × 12px, `{typography.mono-body}` text, `{colors.ink}`. Right-aligned key chip (`{component.key-chip}`) showing the shortcut.
- **`cmd-k-list-item-selected`** — The keyboard-highlighted row. Background `{colors.primary-dim}`, text `{colors.on-primary}` at weight 600, 4px mint left border. Enter key activates.

### Key Chip

**`key-chip`** — A small rectangular keyboard-shortcut indicator. Background `{colors.canvas-elevated-2}`, text `{colors.ink-bright}` in `{typography.mono-key-chip}` (11px / 600 / +1px tracking), `{borders.hairline}` (1px muted border), padding 4px × 8px. Used in Cmd+K list items, in the prompt bar, and inline in tooltips.

### Toasts

Toasts appear in the bottom-right corner of the viewport. All toasts share `{colors.canvas-elevated}` background and `{elevation.pixel-sm}` (2px hard offset).

- **`toast-success`** — Mint border, mint text. For successful operations ("JSON formatted", "Copied to clipboard").
- **`toast-warning`** — Gold border, gold text. For non-blocking warnings ("3 keys reordered", "Regex matched 0 results").
- **`toast-error`** — Red border, red text. For errors ("Invalid JSON at line 4", "Network request failed").

### Footer

**`footer`** — A thin 1-row strip at the bottom of the viewport. Background `{colors.canvas-deep}`, `{colors.ink-muted}` text in `{typography.mono-caption}` (12px / +0.5px tracking), `{borders.hairline}` top border, padding 16px × 32px. Contents: version string, GitHub link, theme indicator, optional uptime/build SHA — minimal terminal status-line aesthetic.

## Do's and Don'ts

### Do
- Use `{colors.primary}` (mint #3FE0C5) for every interactive element. Gold and red are reserved for status and destructive actions, never as a third action color.
- Render all text — body, button, code, headline — in a monospace face. VT323 for pixel display, IBM Plex Mono for everything else.
- Apply **no shadows** — not even hard pixel-offset drops. Convey depth with flat surface-color stepping (`canvas → canvas-elevated → canvas-elevated-2`) and chunky borders. On a button's active state, brighten the fill instead.
- Keep buttons **borderless**: flat solid-color blocks with no border and no shadow. Distinguish them by fill color (mint / gold / red), not by outline.
- Build chevron breadcrumb shapes with `clip-path`, not SVG, so they remain crisp at any size.
- Overlay the canvas with the CRT scanline gradient at exactly ~4% alpha. Gate any flicker animation behind `prefers-reduced-motion: no-preference`.
- Use chunky 2px borders by default and 4px borders for focused/modal surfaces. Border color signals semantic intent (mint = action/focused, gold = warning, red = error).
- Make Cmd+K reachable from every page; treat it as the primary navigation modality.
- Keep the sidebar text-only. The PRD explicitly bans icons in sidebar navigation.

### Don't
- Don't add `border-radius` anywhere. The pixel-terminal grammar collapses if any corner is rounded.
- Don't use any shadows — neither blurred drop-shadows (`box-shadow: 0 4px 12px rgba(...)`) nor hard pixel-offset drops. Depth is surface stepping + borders only.
- Don't give buttons a border. Buttons are flat, borderless solid-color blocks; the fill color carries the meaning.
- Don't introduce gradients as backgrounds. The CRT scanline is the only repeating pattern.
- Don't use proportional fonts (sans-serif, serif). The whole layout assumes monospace cell width.
- Don't use weight 500 or italic. The ladder is 400 / 600 only; emphasis is weight or color, never slant.
- Don't add a fourth accent color. If a new state needs to be communicated, use surface stepping or border thickness, not a new hue.
- Don't render icons in the sidebar (PRD §2). Tool category icons elsewhere in the product are allowed only as pixel-art SVG.
- Don't animate the scanline opacity above ~5% — flicker becomes a seizure risk above ~6% and a brand violation above ~10%.
- Don't auto-focus the Cmd+K input on page load. It is invoked, not ambient. (Auto-focus traps screen readers.)

## Responsive Behavior

### Breakpoints

| Name | Width | Key Changes |
|---|---|---|
| Mobile | ≤ 639px | Single-column stack; sidebar drawer toggled from the prompt bar; tool panels span full viewport width minus 16px gutters; Cmd+K modal scales to 90vw with same chunky border |
| Tablet | 640–1023px | Sidebar drawer (toggled via prompt bar key chip); main canvas full-width; dual-pane tools collapse to vertically stacked panes |
| Small Desktop | 1024–1439px | Sidebar drawer (toggled via prompt bar key chip); main canvas full-width; dual-pane tools side-by-side; default development target |
| Wide Desktop | ≥ 1440px | Sidebar drawer (toggled via prompt bar key chip); main canvas full-width; tool panels may opt-in to a 1200px max-width centered layout; the rest of the canvas extends to the viewport edges |

Per PRD §5, **desktop is the primary target**. Mobile is a graceful degradation, not a parity goal. Some tools (e.g., a wide regex tester with many capture groups) will surface a "Use a wider viewport for full functionality" notice on ≤ 639px.

### Touch Targets

- Minimum 44 × 44px for any tappable element, per WCAG 2.5.8 (Target Size Minimum, AA, new in 2.2). Button height of 40px + 2px border × 2 = 44px hit area when accounting for the chunky border.
- Key chips (11px text in 4×8 padding) fall below 44px but are display-only — they show the shortcut, they aren't tappable.
- The Cmd+K trigger key chip in the prompt bar is the exception: it must be a true 44 × 44 button, with the chip merely centered inside it.

### Collapsing Strategy

- **Sidebar**: off-canvas drawer at all breakpoints, toggled via a prompt-bar mini-button labeled `[≡]` (pixel hamburger).
- **Breadcrumb**: full 3-segment chevron at ≥ 768px → collapses to 2 segments (Home > Current) at ≤ 767px, with the category segment hidden.
- **Dual-pane tools**: side-by-side at ≥ 768px → vertically stacked at ≤ 767px, with the `{component.dual-pane-divider}` rotating from vertical to horizontal.
- **Display headings**: `{typography.pixel-display}` (64px) → `{typography.pixel-h1}` (48px) at ≤ 1023px → `{typography.pixel-h2}` (36px) at ≤ 639px.
- **Cmd+K modal**: 640px → 90vw at ≤ 639px; chunky border thickness (4px) and pixel-offset shadow are preserved at all sizes.

### Image & CRT Behavior

- The scanline overlay scales with the viewport — line density (1px line / 2px gap) is constant, so finer screens see more lines per inch (correctly).
- Pixel-art SVG icons specify `width`/`height` in even-numbered pixels and use `image-rendering: pixelated` so they stay crisp on high-DPI displays.

## Iteration Guide

1. Focus on ONE component at a time. Reference its YAML key directly (`{component.tool-panel}`, `{component.cmd-k-modal}`).
2. Variants of an existing component (`-active`, `-focus`, `-disabled`, `-error`) live as separate entries in `components:`.
3. Use `{token.refs}` everywhere — never inline hex.
4. Document Default and Active/Pressed states. Hover is optional (terminals are keyboard-first); document keyboard focus instead.
5. Display headers stay VT323 with line-height 1.0–1.15. Body and UI stay IBM Plex Mono at 14–16px. The boundary is unbreakable.
6. Elevation is hard pixel-offset shadows only. If a new component asks for a blur shadow, the answer is no — increase border thickness or step the surface color instead.
7. `border-radius` is permanently zero. Do not introduce a new radius token under any circumstance.
8. When in doubt about emphasis: change border thickness (2px → 4px) or step the surface (`canvas → canvas-elevated → canvas-elevated-2`) before adding chrome.
9. Color additions require a semantic justification. The system has exactly three accents — mint (action), gold (status), red (destructive) — and no fourth color may be added without retiring an existing one.

## Known Gaps

- **Light theme** is not specified. The PRD positions the product as a dark-only CRT experience; no light surface tokens exist. If a light theme is later requested, it would require a full second token set, not a token override.
- **Internationalization beyond ASCII** is unverified. VT323 was subset to printable ASCII for performance; CJK and combining-mark scripts will fall back to the system monospace and lose pixel fidelity.
- **Accessibility of the CRT scanline overlay** at ~4% alpha has not been audited against WCAG 1.4.3 contrast for the underlying text. The overlay sits above content with `pointer-events: none`, but its tint could nudge contrast below 4.5:1 on already-marginal pairings. Audit per-tool.
- **`prefers-reduced-motion` for the scanline flicker** is specified as a hard requirement, but the static overlay itself is non-motion and not toggled — some users with photosensitive epilepsy may still find the static pattern uncomfortable. A user-toggle to disable the overlay entirely is recommended but not yet specced.
- **Keyboard accessibility of the Cmd+K modal on mobile** is platform-dependent. iOS Safari does not expose a `Cmd` modifier; the on-screen "≡" key chip becomes the canonical trigger on touch devices.
- **Focus management** when navigating between tool panels via keyboard is described conceptually (`{component.tool-panel-focused}`) but the focus-trap mechanics (Tab order, Escape behavior, return-focus targets) are not yet enumerated.
- **Print styles** are undefined. The product is a runtime terminal; printed output (e.g., a JSON Formatter result) currently inherits the dark canvas and would burn ink. A monochrome print stylesheet is needed but out of scope for v1.
- **Icon library scope.** The PRD bans sidebar icons but allows pixel-art icons inside tool content (e.g., copy/paste glyphs). The exact pixel icon set is not yet defined; current usage is ad-hoc per tool.

## Styling & Enforcement Rules

To maintain the strict pixel-art terminal style and clean architecture, the project implements an automated styling linter:
- **Zero Scoped Layout CSS**: Any component-level `.css` file must not contain layout, color, typography, border, or spacing properties. It must remain empty or have under 15 lines (e.g. for pure keyframe animations).
- **Master CSS in Templates**: All styling must be written in HTML templates using Master CSS classes. Refer to the tokens above for colors, typography, spacing, and shapes.
- **No Inline Styles**: Standard inline `style="..."` is banned. Use property bindings `[class.d:none]="..."` or dynamic CSS variables in `[style.prop]="..."` only for dynamic values like percentages.
- **Strict Verification**: Pre-commit and CI workflows run `pnpm run audit-styles` to verify compliance.

