import { Component, input, computed } from "@angular/core";

const classMap: Record<string, string> = {
  "type-pixel-display": "font-family:var(--font-pixel) f:64 font-weight:400 lh:1 ls:0",
  "type-pixel-h1": "font-family:var(--font-pixel) f:48 font-weight:400 lh:1.05 ls:0",
  "type-pixel-h2": "font-family:var(--font-pixel) f:36 font-weight:400 lh:1.1 ls:0",
  "type-pixel-h3": "font-family:var(--font-pixel) f:28 font-weight:400 lh:1.15 ls:0",
  "type-pixel-eyebrow": "font-family:var(--font-pixel) f:18 font-weight:400 lh:1 ls:2 text-transform:uppercase",
  "type-mono-h4": "font-family:var(--font-mono) f:20 font-weight:600 lh:1.3",
  "type-mono-body-lg": "font-family:var(--font-mono) f:16 font-weight:400 lh:1.5",
  "type-mono-body": "font-family:var(--font-mono) f:14 font-weight:400 lh:1.55",
  "type-mono-body-strong": "font-family:var(--font-mono) f:14 font-weight:600 lh:1.55",
  "type-mono-prompt": "font-family:var(--font-mono) f:16 font-weight:500 lh:1",
  "type-mono-caption": "font-family:var(--font-mono) f:12 font-weight:400 lh:1.4 ls:0.5",
  "type-mono-key-chip": "font-family:var(--font-mono) f:11 font-weight:600 lh:1 ls:1",
  "type-mono-button": "font-family:var(--font-mono) f:14 font-weight:600 lh:1 ls:1",
  "type-mono-code": "font-family:var(--font-mono) f:14 font-weight:400 lh:1.6",
  "fg-ink-bright": "color:var(--ink-bright)",
  "fg-ink": "color:var(--ink)",
  "fg-ink-muted": "color:var(--ink-muted)",
  "fg-primary": "color:var(--primary)",
  "fg-primary-bright": "color:var(--primary-bright)"
};

/** 字體級距展示列：token 名稱、示意文字與規格。 */
@Component({
  selector: "app-type-row",
  templateUrl: "./type-row.html",
  styleUrl: "./type-row.css",
  host: {
    class: "d:block bb:1px|solid|var(--border-muted) bb:0:last"
  }
})
export class TypeRow {
  readonly token = input.required<string>();
  readonly sample = input.required<string>();
  /** 套用於示意文字的 CSS class（定義於本元件樣式表）。 */
  readonly sampleClass = input.required<string>();
  readonly spec = input.required<string>();

  readonly mappedClass = computed(() => {
    return this.sampleClass()
      .split(/\s+/)
      .map(c => classMap[c] || c)
      .join(" ");
  });
}
