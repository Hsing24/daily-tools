import { Component, signal, computed } from "@angular/core";
import { RouterLink } from "@angular/router";
import { computeTextStats } from "./word-count-stats";

@Component({
  selector: "app-word-count",
  imports: [RouterLink],
  templateUrl: "./word-count.html",
  styleUrl: "./word-count.css",
})
export class WordCount {
  protected readonly text = signal("");
  protected readonly alertMessage = signal("");

  protected readonly stats = computed(() => computeTextStats(this.text()));

  protected onInput(value: string): void {
    this.text.set(value);
  }

  protected async paste(): Promise<void> {
    this.alertMessage.set("");
    try {
      if (
        !navigator.clipboard ||
        typeof navigator.clipboard.readText !== "function"
      ) {
        throw new Error("Clipboard API not supported");
      }
      const clipboardText = await navigator.clipboard.readText();
      this.text.set(clipboardText);
    } catch (err) {
      this.alertMessage.set(
        "無法讀取剪貼簿，請使用 Ctrl+V / ⌘+V 鍵貼入內容，或手動開啟瀏覽器剪貼簿權限。",
      );
    }
  }

  protected clear(): void {
    this.text.set("");
    this.alertMessage.set("");
  }
}
