import { Component, signal } from "@angular/core";
import { RouterLink } from "@angular/router";

import { KeyChip } from "../shared/ui/key-chip/key-chip";
import { ToolBreadcrumb } from "../shared/ui/tool-breadcrumb/tool-breadcrumb";
import { ColorSwatch } from "./ui/color-swatch/color-swatch";
import { SectionHead } from "./ui/section-head/section-head";
import { TypeRow } from "./ui/type-row/type-row";
import { ToolRadioGroup, RadioOption } from "../shared/ui/tool-radio-group/tool-radio-group";
import { ToolPanel } from "../shared/ui/tool-panel/tool-panel";
import { ToolHeader } from "../shared/ui/tool-header/tool-header";
import { ToolAlert } from "../shared/ui/tool-alert/tool-alert";
import { ToolSlider } from "../shared/ui/tool-slider/tool-slider";

interface SectionLink {
  readonly id: string;
  readonly label: string;
}

interface SwatchItem {
  readonly name: string;
  readonly value: string;
  readonly description: string;
  readonly cssVar: string;
}

interface SwatchCategory {
  readonly title: string;
  readonly items: readonly SwatchItem[];
}

interface TypeToken {
  readonly token: string;
  readonly sample: string;
  readonly sampleClass: string;
  readonly spec: string;
}

interface SpacingToken {
  readonly token: string;
  readonly value: string;
  readonly px: number;
}

interface ToolTile {
  readonly status: string;
  readonly title: string;
  readonly description: string;
  readonly linkLabel: string;
  readonly fragment: string;
}

@Component({
  selector: "app-design",
  imports: [
    RouterLink,
    KeyChip,
    ToolBreadcrumb,
    ColorSwatch,
    SectionHead,
    TypeRow,
    ToolRadioGroup,
    ToolPanel,
    ToolHeader,
    ToolAlert,
    ToolSlider,
  ],
  templateUrl: "./design.html",
  styleUrls: ["./design.css", "./design-demos.css"],
  host: {
    class: "d:grid gap:48 font-family:var(--font-mono) color:var(--ink)"
  }
})
export class Design {
  protected readonly sliderValue = signal(78);

  protected readonly sections: readonly SectionLink[] = [
    { id: "colors", label: "01 色彩、間距與深度" },
    { id: "typography", label: "02 字體級距" },
    { id: "components", label: "03 元件樣本" },
    { id: "layout-chassis", label: "04 工具配置" },
    { id: "tiles", label: "05 工具磁磚" },
    { id: "command", label: "06 搜尋工具" },
    { id: "forms", label: "07 表單" },
    { id: "responsive", label: "08 響應式" },
  ];

  protected readonly swatchCategories: readonly SwatchCategory[] = [
    {
      title: "品牌與強調色 Brand & Accent",
      items: [
        { name: "Primary Mint", value: "#3FE0C5", description: "所有連結、焦點、主操作、prompt glyph。", cssVar: "--primary" },
        { name: "Mint Bright", value: "#6BFFE0", description: "按鈕活動狀態或輸入游標閃爍色。", cssVar: "--primary-bright" },
        { name: "Mint Dim", value: "#2BAE96", description: "麵包屑上游、選取列背景或已停用主要狀態。", cssVar: "--primary-dim" },
        { name: "Status Gold", value: "#F1B434", description: "非阻斷狀態、次要訊息、BETA 標籤。", cssVar: "--gold" },
        { name: "Gold Bright", value: "#FFD166", description: "金色懸停或高亮狀態。", cssVar: "--gold-bright" },
        { name: "Gold Dim", value: "#B8830A", description: "昏暗金色狀態色。", cssVar: "--gold-dim" },
        { name: "Warning Red", value: "#E03C31", description: "錯誤、重設、破壞性操作，不做品牌裝飾。", cssVar: "--warning" },
        { name: "Warning Dim", value: "#8A2018", description: "昏暗警告紅 / 錯誤細部。", cssVar: "--warning-dim" },
      ],
    },
    {
      title: "表面與畫布 Surfaces",
      items: [
        { name: "Canvas", value: "#0A1A2F", description: "主內容背景，承接 CRT scanline overlay。", cssVar: "--canvas" },
        { name: "Canvas Deep", value: "#050E1C", description: "Fixed prompt bar、footer、modal scrim 基底。", cssVar: "--canvas-deep" },
        { name: "Canvas Elevated", value: "#122339", description: "工具面板、Cmd+K modal、active nav item。", cssVar: "--canvas-elevated" },
        { name: "Canvas Elevated 2", value: "#15263F", description: "面板內的鍵帽、列表選取列、次級資料槽。", cssVar: "--canvas-elevated-2" },
        { name: "Input Slot", value: "#081424", description: "文字輸入與 textarea 的凹槽色。", cssVar: "--canvas-input" },
        { name: "Surface Overlay", value: "rgba(10, 26, 47, 0.85)", description: "Cmd+K 彈窗背後的遮罩。", cssVar: "--surface-overlay" },
        { name: "Scanline Tint", value: "rgba(63, 224, 197, 0.04)", description: "CRT 掃描線疊加層。", cssVar: "--scanline-tint" },
      ],
    },
    {
      title: "文字 Text",
      items: [
        { name: "Ink Bright", value: "#E6F1FF", description: "標題、強調文字、鍵帽文字。", cssVar: "--ink-bright" },
        { name: "Ink", value: "#C9D5E8", description: "預設內文。", cssVar: "--ink" },
        { name: "Ink Muted", value: "#6A7C99", description: "說明文字、副標、頁尾、分隔線。", cssVar: "--ink-muted" },
        { name: "Ink Disabled", value: "#3A4A66", description: "禁用狀態或 placeholder 文字。", cssVar: "--ink-disabled" },
        { name: "On Primary", value: "#0A1A2F", description: "Mint 綠背景上的前景色。", cssVar: "--on-primary" },
        { name: "On Gold", value: "#0A1A2F", description: "金色背景上的前景色。", cssVar: "--on-gold" },
        { name: "On Warning", value: "#FFFFFF", description: "警告背景上的前景色。", cssVar: "--on-warning" },
      ],
    },
    {
      title: "邊框 Borders",
      items: [
        { name: "Border Default", value: "#3FE0C5", description: "預設 Mint 綠邊框。", cssVar: "--border-default" },
        { name: "Border Muted", value: "#1E3050", description: "細線分隔、預設輸入框框線。", cssVar: "--border-muted" },
        { name: "Border Gold", value: "#F1B434", description: "金色狀態指示邊框。", cssVar: "--border-gold" },
        { name: "Border Warning", value: "#E03C31", description: "紅色警告邊框。", cssVar: "--border-warning" },
      ],
    },
    {
      title: "代碼語意色 Monokai Syntax（預設）",
      items: [
        { name: "Monokai BG", value: "#272822", description: "程式碼編輯器背景色。", cssVar: "--syntax-monokai-bg" },
        { name: "Monokai FG", value: "#F8F8F2", description: "程式碼編輯器預設前景色。", cssVar: "--syntax-monokai-fg" },
        { name: "Monokai Keyword", value: "#F92672", description: "保留字、關鍵字。", cssVar: "--syntax-monokai-keyword" },
        { name: "Monokai String", value: "#E6DB74", description: "字串常數。", cssVar: "--syntax-monokai-string" },
        { name: "Monokai Number", value: "#AE81FF", description: "數值常數與布林值。", cssVar: "--syntax-monokai-number" },
        { name: "Monokai Function", value: "#A6E22E", description: "函式宣告與呼叫名稱。", cssVar: "--syntax-monokai-function" },
        { name: "Monokai Property", value: "#66D9EF", description: "屬性名稱與變數名稱。", cssVar: "--syntax-monokai-property" },
        { name: "Monokai Comment", value: "#75715E", description: "程式碼註解。", cssVar: "--syntax-monokai-comment" },
      ],
    },
    {
      title: "代碼語意色 Solarized Light Syntax（替代）",
      items: [
        { name: "Solarized BG", value: "#FDF6E3", description: "Solarized Light 編輯器背景色。", cssVar: "--syntax-solarized-bg" },
        { name: "Solarized FG", value: "#657B83", description: "Solarized Light 編輯器預設前景色。", cssVar: "--syntax-solarized-fg" },
        { name: "Solarized Keyword", value: "#859900", description: "保留字、關鍵字。", cssVar: "--syntax-solarized-keyword" },
        { name: "Solarized String", value: "#2AA198", description: "字串常數。", cssVar: "--syntax-solarized-string" },
        { name: "Solarized Number", value: "#D33682", description: "數值常數與布林值。", cssVar: "--syntax-solarized-number" },
        { name: "Solarized Function", value: "#268BD2", description: "函式宣告與呼叫名稱。", cssVar: "--syntax-solarized-function" },
        { name: "Solarized Property", value: "#B58900", description: "屬性名稱與變數名稱。", cssVar: "--syntax-solarized-property" },
        { name: "Solarized Comment", value: "#93A1A1", description: "程式碼註解。", cssVar: "--syntax-solarized-comment" },
      ],
    },
  ];

  protected readonly typeTokens: readonly TypeToken[] = [
    { token: "{typography.pixel-display}", sample: "SYSTEM FAILURE", sampleClass: "type-pixel-display fg-ink-bright", spec: "64px / 400 / 1.0 / 0" },
    { token: "{typography.pixel-h1}", sample: "JSON FORMATTER", sampleClass: "type-pixel-h1 fg-ink-bright", spec: "48px / 400 / 1.05 / 0" },
    { token: "{typography.pixel-h2}", sample: "工具系統設定與狀態", sampleClass: "type-pixel-h2 fg-ink-bright", spec: "36px / 400 / 1.1 / 0" },
    { token: "{typography.pixel-h3}", sample: "新增快捷鍵設定視窗", sampleClass: "type-pixel-h3 fg-ink-bright", spec: "28px / 400 / 1.15 / 0" },
    { token: "{typography.pixel-eyebrow}", sample: "ENCODERS / DECODERS", sampleClass: "type-pixel-eyebrow fg-ink-muted", spec: "18px / 400 / 1.0 / 2px" },
    { token: "{typography.mono-h4}", sample: "輸入區塊 (Input Payload)", sampleClass: "type-mono-h4 fg-ink-bright", spec: "20px / 600 / 1.3 / 0" },
    { token: "{typography.mono-body-lg}", sample: "請在此輸入您需要處理的原始 JSON 字串或進行檔案拖放。", sampleClass: "type-mono-body-lg fg-ink", spec: "16px / 400 / 1.5 / 0" },
    { token: "{typography.mono-body}", sample: "預設段落文字，用於所有終端機介面的操作標籤與按鈕輔助文字。", sampleClass: "type-mono-body fg-ink", spec: "14px / 400 / 1.55 / 0" },
    { token: "{typography.mono-body-strong}", sample: "特別強化的重要警示文字或目前所在的麵包屑段落標籤。", sampleClass: "type-mono-body-strong fg-ink-bright", spec: "14px / 600 / 1.55 / 0" },
    { token: "{typography.mono-prompt}", sample: "user@devtool-terminal ~/json-formatter $", sampleClass: "type-mono-prompt fg-primary", spec: "16px / 500 / 1.0 / 0" },
    { token: "{typography.mono-caption}", sample: "版權所有 © 2026 DEVTOOL TERMINAL. BUILD SHA: 8a7d3f2.", sampleClass: "type-mono-caption fg-ink-muted", spec: "12px / 400 / 1.4 / 0.5px" },
    { token: "{typography.mono-key-chip}", sample: "CTRL + SHIFT + P", sampleClass: "type-mono-key-chip fg-ink-bright", spec: "11px / 600 / 1.0 / 1px" },
    { token: "{typography.mono-button}", sample: "執行格式化 (RUN)", sampleClass: "type-mono-button fg-primary", spec: "14px / 600 / 1.0 / 1px" },
    { token: "{typography.mono-code}", sample: "const formatter = (data) => JSON.stringify(data, null, 2);", sampleClass: "type-mono-code fg-primary-bright", spec: "14px / 400 / 1.6 / 0" },
  ];

  protected readonly spacingTokens: readonly SpacingToken[] = [
    { token: "{spacing.xxs}", value: "2px", px: 2 },
    { token: "{spacing.xs}", value: "4px", px: 4 },
    { token: "{spacing.sm}", value: "8px", px: 8 },
    { token: "{spacing.md}", value: "12px", px: 12 },
    { token: "{spacing.lg}", value: "16px", px: 16 },
    { token: "{spacing.xl}", value: "24px", px: 24 },
    { token: "{spacing.xxl}", value: "32px", px: 32 },
    { token: "{spacing.section}", value: "48px", px: 48 },
  ];

  protected readonly toolTiles: readonly ToolTile[] = [
    { status: "LIVE", title: "文字統計", description: "字元、單字、句子、閱讀時間，即時回饋。", linkLabel: "查看配置", fragment: "layout-chassis" },
    { status: "NEXT", title: "JSON Formatter", description: "左右分欄，輸入與格式化輸出由 2px divider 切開。", linkLabel: "查看元件", fragment: "components" },
    { status: "QUEUE", title: "Base64", description: "編碼、解碼、複製結果，所有操作沿用 mint CTA。", linkLabel: "查看色票", fragment: "colors" },
    { status: "QUEUE", title: "Regex Tester", description: "捕獲群組和 match 結果以表格式資料呈現。", linkLabel: "查看規則", fragment: "responsive" },
  ];

  /** 表單區的 segmented control 展示狀態（純示範，不影響全站主題）。 */
  protected readonly segmentDemo = signal<"monokai" | "solarized">("monokai");

  protected readonly radioOptions = signal<RadioOption[]>([
    { value: "ascii", label: "ASCII 碼" },
    { value: "utf8", label: "UTF-8" },
    { value: "base64", label: "Base64" },
  ]);
  protected readonly radioValue = signal<string>("utf8");

  protected setSegmentDemo(value: "monokai" | "solarized"): void {
    this.segmentDemo.set(value);
  }
}
