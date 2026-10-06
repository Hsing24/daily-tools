import { Component, inject } from "@angular/core";
import { ToastService } from "../../services/toast.service";

@Component({
  selector: "app-toast-container",
  templateUrl: "./toast-container.html",
  styleUrl: "./toast-container.css",
  host: {
    class: "d:contents",
  },
})
export class ToastContainer {
  protected readonly toastService = inject(ToastService);
  protected readonly toasts = this.toastService.toasts;

  protected dismiss(id: string): void {
    this.toastService.startExit(id);
  }
}
