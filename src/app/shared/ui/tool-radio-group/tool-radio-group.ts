import { Component, input, model } from "@angular/core";

export interface RadioOption {
  value: string;
  label: string;
}

@Component({
  selector: "app-tool-radio-group",
  imports: [],
  templateUrl: "./tool-radio-group.html",
  styleUrl: "./tool-radio-group.css",
})
export class ToolRadioGroup {
  readonly options = input.required<RadioOption[]>();
  readonly value = model.required<string>();
  readonly name = input<string>(
    "radio-group-" + Math.random().toString(36).substring(2, 9)
  );

  select(val: string): void {
    this.value.set(val);
  }
}
