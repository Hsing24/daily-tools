import { Component, input } from "@angular/core";

/** 字體級距展示列：token 名稱、示意文字與規格。 */
@Component({
  selector: "app-type-row",
  templateUrl: "./type-row.html",
  styleUrl: "./type-row.css",
})
export class TypeRow {
  readonly token = input.required<string>();
  readonly sample = input.required<string>();
  /** 套用於示意文字的 CSS class（定義於本元件樣式表）。 */
  readonly sampleClass = input.required<string>();
  readonly spec = input.required<string>();
}
