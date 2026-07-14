import { Component, input } from "@angular/core";

@Component({
  selector: "app-section-head",
  templateUrl: "./section-head.html",
  styleUrl: "./section-head.css",
  host: {
    class: "d:block"
  }
})
export class SectionHead {
  readonly kicker = input.required<string>();
  readonly title = input.required<string>();
  readonly note = input.required<string>();
  readonly headingId = input.required<string>();
}
