import { Component, signal, computed, OnDestroy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ToolBreadcrumb } from "../../shared/ui/tool-breadcrumb/tool-breadcrumb";
import { ToolPanel } from "../../shared/ui/tool-panel/tool-panel";
import { ToolHeader } from "../../shared/ui/tool-header/tool-header";
import { ToolAlert } from "../../shared/ui/tool-alert/tool-alert";
import { StatRow } from "../../shared/ui/stat-row/stat-row";
import { ToolRadioGroup, RadioOption } from "../../shared/ui/tool-radio-group/tool-radio-group";
import {
  TRACE_PRESETS,
  WARNING_THRESHOLD_SECONDS,
  estimateTraceTime,
  formatEstimatedTime,
  formatFileSize,
  type TraceWorkerOutput,
} from "./svg-draw-tracer";

@Component({
  selector: "app-svg-draw",
  imports: [
    CommonModule,
    ToolBreadcrumb,
    ToolPanel,
    ToolHeader,
    ToolAlert,
    StatRow,
    ToolRadioGroup,
  ],
  templateUrl: "./svg-draw.html",
  styleUrl: "./svg-draw.css",
})
export class SvgDraw implements OnDestroy {
  // --- Helpers for Template ---
  protected readonly formatFileSize = formatFileSize;

  protected readonly presetOptions: RadioOption[] = [
    { value: "pixel_perfect", label: "一比一 (最高品質)" },
    { value: "detailed", label: "精細 (高品質)" },
    { value: "simple", label: "簡易 (適合 Logo)" },
  ];

  // --- Reactive State ---
  protected readonly sourceFile = signal<File | null>(null);
  protected readonly sourcePreviewUrl = signal<string>("");
  protected readonly sourceWidth = signal<number>(0);
  protected readonly sourceHeight = signal<number>(0);
  protected readonly tracePreset = signal<string>("pixel_perfect");
  protected readonly status = signal<"idle" | "ready" | "tracing" | "done" | "error">("idle");
  protected readonly svgOutput = signal<string>("");
  protected readonly svgPreviewUrl = signal<string>("");
  protected readonly elapsedSeconds = signal<number>(0);
  protected readonly errorMessage = signal<string>("");
  protected readonly isDragging = signal<boolean>(false);
  protected readonly alertMessage = signal<string>("");
  protected readonly alertVariant = signal<"success" | "error" | "warning">("success");

  // --- Computed State ---
  protected readonly estimatedSeconds = computed(() =>
    estimateTraceTime(this.sourceWidth(), this.sourceHeight(), this.tracePreset())
  );

  protected readonly estimatedTimeText = computed(() =>
    formatEstimatedTime(this.estimatedSeconds())
  );

  protected readonly isTimeWarning = computed(() =>
    this.estimatedSeconds() >= WARNING_THRESHOLD_SECONDS
  );

  protected readonly svgBlobSize = computed(() => {
    const svg = this.svgOutput();
    return svg ? new Blob([svg], { type: "image/svg+xml" }).size : 0;
  });

  protected readonly elapsedTimeText = computed(() =>
    formatEstimatedTime(this.elapsedSeconds())
  );

  // --- Private properties ---
  private worker: Worker | null = null;
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private traceStartTime = 0;

  ngOnDestroy(): void {
    this.cleanupWorker();
    this.cleanupUrls();
  }

  private cleanupUrls(): void {
    if (this.sourcePreviewUrl()) {
      URL.revokeObjectURL(this.sourcePreviewUrl());
    }
    if (this.svgPreviewUrl()) {
      URL.revokeObjectURL(this.svgPreviewUrl());
    }
  }

  private cleanupWorker(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  // --- Drag & Drop Handlers ---
  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(true);
  }

  protected onDragLeave(): void {
    this.isDragging.set(false);
  }

  protected async onDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    this.isDragging.set(false);
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      await this.loadFile(files[0]);
    }
  }

  protected async onFileSelect(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      await this.loadFile(input.files[0]);
      input.value = ""; // Reset for re-selection
    }
  }

  private async loadFile(file: File): Promise<void> {
    if (!file.type.startsWith("image/")) {
      this.showAlert("選擇的檔案不是有效的圖片格式。", "error");
      return;
    }

    this.resetState();
    this.sourceFile.set(file);
    const previewUrl = URL.createObjectURL(file);
    this.sourcePreviewUrl.set(previewUrl);

    try {
      const { width, height } = await this.getImageDimensions(file);
      this.sourceWidth.set(width);
      this.sourceHeight.set(height);
      this.status.set("ready");
    } catch (err) {
      this.showAlert("無法讀取圖片尺寸。", "error");
      this.reset();
    }
  }

  private getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Image load error"));
      };
      img.src = url;
    });
  }

  protected onPresetChange(value: string): void {
    this.tracePreset.set(value);
    // If we have already done or got error, reset to ready status to suggest re-running
    if (this.status() === "done" || this.status() === "error") {
      this.status.set("ready");
    }
  }

  // --- Tracing Logic ---
  protected async startTrace(): Promise<void> {
    const file = this.sourceFile();
    if (!file) return;

    this.status.set("tracing");
    this.errorMessage.set("");
    this.elapsedSeconds.set(0);
    this.traceStartTime = performance.now();

    // Start timer interval to show elapsed seconds
    this.timerInterval = setInterval(() => {
      const elapsed = (performance.now() - this.traceStartTime) / 1000;
      this.elapsedSeconds.set(elapsed);
    }, 100);

    try {
      const imageData = await this.getImageData(file);
      const buffer = imageData.data.buffer.slice(0); // Transferable ArrayBuffer copy

      this.cleanupWorker();

      this.worker = new Worker(new URL("./svg-draw.worker", import.meta.url), {
        type: "module",
      });

      this.worker.onmessage = (event: MessageEvent<TraceWorkerOutput>) => {
        const result = event.data;
        this.cleanupWorker();

        if (result.type === "done" && result.svgString) {
          const actualElapsedSec = result.elapsedMs ? result.elapsedMs / 1000 : (performance.now() - this.traceStartTime) / 1000;
          this.elapsedSeconds.set(actualElapsedSec);
          this.svgOutput.set(result.svgString);

          // Create SVG preview URL
          const blob = new Blob([result.svgString], { type: "image/svg+xml" });
          const svgUrl = URL.createObjectURL(blob);
          this.svgPreviewUrl.set(svgUrl);

          this.status.set("done");
          this.showAlert("描圖完成！", "success");
        } else {
          this.status.set("error");
          this.errorMessage.set(result.error || "未知描圖錯誤");
          this.showAlert(result.error || "描圖失敗", "error");
        }
      };

      this.worker.onerror = (err) => {
        this.cleanupWorker();
        this.status.set("error");
        this.errorMessage.set("Worker 執行緒錯誤。");
        this.showAlert("Worker 錯誤", "error");
      };

      const presetOptions = TRACE_PRESETS[this.tracePreset() as keyof typeof TRACE_PRESETS] || TRACE_PRESETS.pixel_perfect;

      this.worker.postMessage(
        {
          data: buffer,
          width: imageData.width,
          height: imageData.height,
          options: presetOptions,
        },
        [buffer]
      );
    } catch (err: any) {
      this.cleanupWorker();
      this.status.set("error");
      this.errorMessage.set(err?.message || "無法獲取圖片數據");
      this.showAlert("讀取圖片數據失敗", "error");
    }
  }

  private getImageData(file: File): Promise<ImageData> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get 2D canvas context"));
          return;
        }
        ctx.drawImage(img, 0, 0);
        try {
          const imgd = ctx.getImageData(0, 0, canvas.width, canvas.height);
          resolve(imgd);
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Image data load error"));
      };
      img.src = url;
    });
  }

  protected cancelTrace(): void {
    this.cleanupWorker();
    this.status.set("ready");
    this.showAlert("已取消描圖作業。", "warning");
  }

  protected downloadSvg(): void {
    const svg = this.svgOutput();
    if (!svg) return;

    const originalName = this.sourceFile()?.name ?? "image";
    const baseName = originalName.substring(0, originalName.lastIndexOf(".")) || originalName;
    const downloadName = `${baseName}.svg`;

    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = downloadName;
    a.click();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  protected async copySvgCode(): Promise<void> {
    const svg = this.svgOutput();
    if (!svg) return;

    try {
      await navigator.clipboard.writeText(svg);
      this.showAlert("已複製 SVG 原始碼至剪貼簿！", "success");
    } catch {
      this.showAlert("無法複製至剪貼簿，請手動複製。", "error");
    }
  }

  protected reset(): void {
    this.cleanupWorker();
    this.cleanupUrls();
    this.resetState();
  }

  private resetState(): void {
    this.sourceFile.set(null);
    this.sourcePreviewUrl.set("");
    this.sourceWidth.set(0);
    this.sourceHeight.set(0);
    this.status.set("idle");
    this.svgOutput.set("");
    this.svgPreviewUrl.set("");
    this.elapsedSeconds.set(0);
    this.errorMessage.set("");
  }

  protected showAlert(message: string, variant: "success" | "error" | "warning"): void {
    this.alertMessage.set(message);
    this.alertVariant.set(variant);
    setTimeout(() => this.alertMessage.set(""), 4000);
  }
}
