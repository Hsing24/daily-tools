import { Component, input } from "@angular/core";

@Component({
  selector: "app-terminal-output",
  templateUrl: "./terminal-output.html",
  styleUrl: "./terminal-output.css",
})
export class TerminalOutput {
  readonly title = input.required<string>();
  readonly status = input("[EOF]");
  readonly command = input.required<string>();
  readonly footer = input("");
  readonly visible = input(true);
}
