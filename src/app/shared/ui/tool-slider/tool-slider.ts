import { Component, input, model, computed } from "@angular/core";

@Component({
  selector: "app-tool-slider",
  imports: [],
  templateUrl: "./tool-slider.html",
  styleUrl: "./tool-slider.css",
  host: {
    class: "d:block w:100%",
  },
})
export class ToolSlider {
  readonly min = input<number>(0);
  readonly max = input<number>(100);
  readonly step = input<number>(1);
  readonly value = model.required<number>();
  readonly ticks = input<number[]>([]);
  readonly label = input<string>("");
  readonly unit = input<string>("");
  readonly ariaLabel = input<string>("");
  readonly showValue = input<boolean>(true);

  readonly percentage = computed(() => {
    const minVal = this.min();
    const maxVal = this.max();
    const val = this.value();
    if (maxVal === minVal) return 0;
    return Math.min(100, Math.max(0, ((val - minVal) / (maxVal - minVal)) * 100));
  });

  readonly formattedValue = computed(() => {
    const v = this.value();
    const u = this.unit();
    return u ? `${v}${u}` : `${v}`;
  });

  getTickPercent(tick: number): number {
    const minVal = this.min();
    const maxVal = this.max();
    if (maxVal === minVal) return 0;
    return Math.min(100, Math.max(0, ((tick - minVal) / (maxVal - minVal)) * 100));
  }

  getTickTransform(tick: number): string {
    const pct = this.getTickPercent(tick);
    if (pct <= 2) return "translateX(0%)";
    if (pct >= 98) return "translateX(-100%)";
    return "translateX(-50%)";
  }

  updateValue(val: number): void {
    this.value.set(val);
  }
}

