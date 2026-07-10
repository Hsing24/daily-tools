import { Component, input } from "@angular/core";

type ToolAlertVariant = "error" | "warning" | "success";

@Component({
  selector: "app-tool-alert",
  templateUrl: "./tool-alert.html",
  styleUrl: "./tool-alert.css",
})
export class ToolAlert {
  readonly message = input.required<string>();
  readonly variant = input<ToolAlertVariant>("error");
  readonly testId = input("alert-message");
}
