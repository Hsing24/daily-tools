import { Component, input } from "@angular/core";

@Component({
  selector: "app-tool-header",
  templateUrl: "./tool-header.html",
  styleUrl: "./tool-header.css",
})
export class ToolHeader {
  readonly eyebrow = input.required<string>();
  readonly title = input.required<string>();
  readonly description = input.required<string>();
}
