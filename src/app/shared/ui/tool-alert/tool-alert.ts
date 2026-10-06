import { Component, input, computed, inject, effect, untracked } from "@angular/core";
import { ToastService } from "../../services/toast.service";

type ToolAlertVariant = "error" | "warning" | "success";

@Component({
  selector: "app-tool-alert",
  templateUrl: "./tool-alert.html",
  styleUrl: "./tool-alert.css",
  host: {
    class: "d:block",
  },
})
export class ToolAlert {
  private readonly toastService = inject(ToastService);

  readonly message = input.required<string>();
  readonly variant = input<ToolAlertVariant>("error");
  readonly testId = input("alert-message");
  readonly inline = input<boolean>(false);

  private lastDispatchedMessage = "";

  constructor() {
    effect(() => {
      const msg = this.message()?.trim();
      const isInline = this.inline();
      const v = untracked(() => this.variant());
      if (msg && !isInline && msg !== this.lastDispatchedMessage) {
        this.lastDispatchedMessage = msg;
        this.toastService.show(msg, v);
      } else if (!msg) {
        this.lastDispatchedMessage = "";
      }
    });
  }

  readonly alertClasses = computed(() => {
    const base = "p:12 mb:16 f:12 lh:1.4 border:2px|solid";
    switch (this.variant()) {
      case "success":
        return `${base} bg:var(--canvas-elevated-2) color:var(--primary) border-color:var(--border-default)`;
      case "warning":
        return `${base} bg:var(--gold-dim) color:var(--on-gold) border-color:var(--border-gold)`;
      case "error":
      default:
        return `${base} bg:var(--warning-dim) color:var(--on-warning) border-color:var(--border-warning)`;
    }
  });
}
