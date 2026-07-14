import { Component, input, model, computed } from "@angular/core";

@Component({
  selector: "app-tool-slider",
  imports: [],
  templateUrl: "./tool-slider.html",
  styleUrl: "./tool-slider.css",
})
export class ToolSlider {
  readonly min = input<number>(0);
  readonly max = input<number>(100);
  readonly value = model.required<number>();
  readonly ticks = input<number[]>([]);
  readonly label = input<string>("");
  readonly ariaLabel = input<string>("");

  readonly percentage = computed(() => {
    const minVal = this.min();
    const maxVal = this.max();
    const val = this.value();
    if (maxVal === minVal) return 0;
    return Math.min(100, Math.max(0, ((val - minVal) / (maxVal - minVal)) * 100));
  });

  updateValue(val: number): void {
    this.value.set(val);
  }
}
