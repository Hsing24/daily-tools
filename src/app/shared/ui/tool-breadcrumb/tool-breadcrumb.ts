import { Component, input } from "@angular/core";
import { RouterLink } from "@angular/router";

@Component({
  selector: "app-tool-breadcrumb",
  imports: [RouterLink],
  templateUrl: "./tool-breadcrumb.html",
  styleUrl: "./tool-breadcrumb.css",
})
export class ToolBreadcrumb {
  readonly homeLabel = input("DevTool");
  readonly homeLink = input("/");
  readonly category = input.required<string>();
  readonly current = input.required<string>();
}
