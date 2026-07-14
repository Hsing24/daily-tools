import { Component, input } from "@angular/core";

@Component({
  selector: "app-stat-row",
  templateUrl: "./stat-row.html",
  styleUrl: "./stat-row.css",
  host: {
    class: "d:block",
  },
})
export class StatRow {
  readonly label = input.required<string>();
  readonly value = input.required<number | string>();
  readonly highlight = input(false);
  readonly testId = input<string | undefined>();
}
