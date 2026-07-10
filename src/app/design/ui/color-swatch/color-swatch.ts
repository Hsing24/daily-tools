import { Component, input } from "@angular/core";

/** 單一色票卡：展示 token 色塊、名稱、值與用途說明。 */
@Component({
  selector: "app-color-swatch",
  templateUrl: "./color-swatch.html",
  styleUrl: "./color-swatch.css",
})
export class ColorSwatch {
  readonly name = input.required<string>();
  /** 顯示用的色值文字（hex 或 rgba）。 */
  readonly value = input.required<string>();
  readonly description = input.required<string>();
  /** 對應的 CSS 自訂屬性名稱，例如 --primary。 */
  readonly cssVar = input.required<string>();
}
