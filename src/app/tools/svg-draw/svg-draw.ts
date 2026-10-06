import { Component, computed, inject, OnDestroy, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ToolBreadcrumb } from "../../shared/ui/tool-breadcrumb/tool-breadcrumb";
import { ToolPanel } from "../../shared/ui/tool-panel/tool-panel";
import { ToolHeader } from "../../shared/ui/tool-header/tool-header";
import { ToolAlert } from "../../shared/ui/tool-alert/tool-alert";
import { StatRow } from "../../shared/ui/stat-row/stat-row";
import {
  ToolRadioGroup,
  RadioOption,
} from "../../shared/ui/tool-radio-group/tool-radio-group";
import {
  TRACE_PRESETS,
  WARNING_THRESHOLD_SECONDS,
  estimateTraceTime,
  formatEstimatedTime,
  formatFileSize,
  isSupportedTraceFile,
  isTracePresetName,
  MAX_TRACE_PIXELS,
  type TracePresetName,
  type TraceWorkerOutput,
  type TraceWorkerRequest,
  validateSvgOutput,
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
  host: {
    class: "d:block font-family:var(--font-mono) color:var(--ink)",
  },
})
export class SvgDraw implements OnDestroy {
  protected readonly formatFileSize = formatFileSize;

  protected readonly presetOptions: RadioOption[] = [
    { value: "pixel_perfect", label: "最高細節" },
    { value: "detailed", label: "精細 (高品質)" },
    { value: "simple", label: "簡易 (適合 Logo)" },
  ];

  protected readonly sourceFile = signal<File | null>(null);
  protected readonly sourcePreviewUrl = signal("");
  protected readonly sourceWidth = signal(0);
  protected readonly sourceHeight = signal(0);
  protected readonly tracePreset = signal<TracePresetName>("pixel_perfect");
  protected readonly status = signal<
    "idle" | "ready" | "tracing" | "done" | "error"
  >("idle");
  protected readonly svgOutput = signal("");
  protected readonly svgPreviewUrl = signal("");
  protected readonly elapsedSeconds = signal(0);
  protected readonly errorMessage = signal("");
  protected readonly isDragging = signal(false);
  protected readonly alertMessage = signal("");
  protected readonly alertVariant = signal<"success" | "error" | "warning">(
    "success",
  );

  protected readonly estimatedSeconds = computed(() =>
    estimateTraceTime(
      this.sourceWidth(),
      this.sourceHeight(),
      this.tracePreset(),
    ),
  );
  protected readonly estimatedTimeText = computed(() =>
    formatEstimatedTime(this.estimatedSeconds()),
  );
  protected readonly isTimeWarning = computed(
    () => this.estimatedSeconds() >= WARNING_THRESHOLD_SECONDS,
  );
  protected readonly svgBlobSize = computed(() => {
    const svg = this.svgOutput();
    return svg ? new Blob([svg], { type: "image/svg+xml" }).size : 0;
  });
  protected readonly elapsedTimeText = computed(() =>
    formatEstimatedTime(this.elapsedSeconds()),
  );

  private worker: Worker | null = null;
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private traceStartTime = 0;
  private traceGeneration = 0;
  private fileGeneration = 0;
  private alertTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly pendingDownloadUrls = new Map<
    ReturnType<typeof setTimeout>,
    string
  >();
  private destroyed = false;

  ngOnDestroy(): void {
    this.destroyed = true;
    this.traceGeneration += 1;
    this.fileGeneration += 1;
    this.stopWorker();
    this.stopTimer();
    this.cleanupUrls();
    if (this.alertTimer !== undefined) clearTimeout(this.alertTimer);
    for (const [timer, url] of this.pendingDownloadUrls) {
      clearTimeout(timer);
      URL.revokeObjectURL(url);
    }
    this.pendingDownloadUrls.clear();
  }

  private cleanupUrls(): void {
    const sourceUrl = this.sourcePreviewUrl();
    const svgUrl = this.svgPreviewUrl();
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    if (svgUrl && svgUrl !== sourceUrl) URL.revokeObjectURL(svgUrl);
  }

  private stopWorker(): void {
    this.worker?.terminate();
    this.worker = null;
  }

  private stopTimer(): void {
    if (this.timerInterval !== null) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private isCurrentTrace(generation: number): boolean {
    return !this.destroyed && generation === this.traceGeneration;
  }

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
    const file = event.dataTransfer?.files?.[0];
    if (file) await this.loadFile(file);
  }

  protected async onFileSelect(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      await this.loadFile(file);
      input.value = "";
    }
  }

  private async loadFile(file: File): Promise<void> {
    if (!isSupportedTraceFile(file)) {
      this.showAlert("只支援 PNG、JPEG、WebP、AVIF 圖片。", "error");
      return;
    }

    const generation = ++this.fileGeneration;
    this.traceGeneration += 1;
    this.stopWorker();
    this.stopTimer();
    this.cleanupUrls();
    this.resetState();

    const previewUrl = URL.createObjectURL(file);
    this.sourceFile.set(file);
    this.sourcePreviewUrl.set(previewUrl);

    try {
      const { width, height } = await this.getImageDimensions(file);
      if (generation !== this.fileGeneration || this.destroyed) {
        URL.revokeObjectURL(previewUrl);
        return;
      }
      this.sourceWidth.set(width);
      this.sourceHeight.set(height);
      this.status.set("ready");
    } catch {
      if (generation !== this.fileGeneration || this.destroyed) {
        URL.revokeObjectURL(previewUrl);
        return;
      }
      URL.revokeObjectURL(previewUrl);
      this.resetState();
      this.showAlert("無法讀取圖片尺寸，或圖片超過大小限制。", "error");
    }
  }

  private getImageDimensions(
    file: File,
  ): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      const cleanup = (): void => URL.revokeObjectURL(url);

      img.onload = () => {
        cleanup();
        const width = img.naturalWidth;
        const height = img.naturalHeight;
        if (!width || !height || width * height > MAX_TRACE_PIXELS) {
          reject(new Error("Image exceeds pixel budget"));
          return;
        }
        resolve({ width, height });
      };
      img.onerror = () => {
        cleanup();
        reject(new Error("Image load error"));
      };
      img.src = url;
    });
  }

  protected onPresetChange(value: string): void {
    if (!isTracePresetName(value) || value === this.tracePreset()) return;
    if (this.status() === "tracing") this.cancelTrace();
    this.tracePreset.set(value);
    if (this.status() === "done" || this.status() === "error")
      this.status.set("ready");
  }

  protected async startTrace(): Promise<void> {
    const file = this.sourceFile();
    if (!file || this.status() === "tracing") return;

    const generation = ++this.traceGeneration;
    this.stopWorker();
    this.stopTimer();
    this.status.set("tracing");
    this.errorMessage.set("");
    this.elapsedSeconds.set(0);
    this.traceStartTime = performance.now();
    this.timerInterval = setInterval(() => {
      if (this.isCurrentTrace(generation)) {
        this.elapsedSeconds.set(
          (performance.now() - this.traceStartTime) / 1000,
        );
      }
    }, 100);

    try {
      const imageData = await this.getImageData(file);
      if (!this.isCurrentTrace(generation)) return;

      // getImageData 已配置獨立 buffer，直接 transfer 避免複製整張 RGBA。
      const buffer = imageData.data.buffer as ArrayBuffer;
      const worker = new Worker(
        new URL("./svg-draw.worker.ts", import.meta.url),
        {
          type: "module",
        },
      );
      this.worker = worker;

      worker.onmessage = (event: MessageEvent<TraceWorkerOutput>) => {
        const result = event.data;
        if (
          !this.isCurrentTrace(generation) ||
          result.generation !== generation
        )
          return;

        this.stopWorker();
        this.stopTimer();
        if (
          result.type === "done" &&
          result.svgString &&
          validateSvgOutput(result.svgString)
        ) {
          this.elapsedSeconds.set(
            (performance.now() - this.traceStartTime) / 1000,
          );
          this.svgOutput.set(result.svgString);
          this.replaceSvgPreview(result.svgString);
          this.status.set("done");
          this.showAlert("描圖完成！", "success");
        } else {
          const message = result.error || "描圖輸出格式無效";
          this.status.set("error");
          this.errorMessage.set(message);
          this.showAlert(message, "error");
        }
      };

      worker.onerror = () => {
        if (!this.isCurrentTrace(generation)) return;
        this.stopWorker();
        this.stopTimer();
        this.status.set("error");
        this.errorMessage.set("Worker 執行緒錯誤。");
        this.showAlert("Worker 錯誤", "error");
      };

      const request: TraceWorkerRequest = {
        type: "trace",
        generation,
        data: buffer,
        width: imageData.width,
        height: imageData.height,
        options: TRACE_PRESETS[this.tracePreset()],
      };
      worker.postMessage(request, [buffer]);
    } catch (err: unknown) {
      if (!this.isCurrentTrace(generation)) return;
      this.stopWorker();
      this.stopTimer();
      const message = err instanceof Error ? err.message : "無法獲取圖片數據";
      this.status.set("error");
      this.errorMessage.set(message);
      this.showAlert("讀取圖片數據失敗", "error");
    }
  }

  private getImageData(file: File): Promise<ImageData> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      const cleanup = (): void => URL.revokeObjectURL(url);

      img.onload = () => {
        cleanup();
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("無法取得 Canvas 2D context"));
          return;
        }
        ctx.drawImage(img, 0, 0);
        try {
          resolve(ctx.getImageData(0, 0, canvas.width, canvas.height));
        } catch (error: unknown) {
          reject(error);
        }
      };
      img.onerror = () => {
        cleanup();
        reject(new Error("Image data load error"));
      };
      img.src = url;
    });
  }

  protected cancelTrace(): void {
    if (this.status() !== "tracing") return;
    this.traceGeneration += 1;
    this.stopWorker();
    this.stopTimer();
    this.elapsedSeconds.set(0);
    this.status.set("ready");
    this.showAlert("已取消描圖作業。", "warning");
  }

  protected downloadSvg(): void {
    const svg = this.svgOutput();
    if (!svg) return;

    const originalName = this.sourceFile()?.name ?? "image";
    const baseName =
      originalName.substring(0, originalName.lastIndexOf(".")) || originalName;
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${baseName}.svg`;
    anchor.click();

    const timer = setTimeout(() => {
      this.pendingDownloadUrls.delete(timer);
      URL.revokeObjectURL(url);
    }, 1000);
    this.pendingDownloadUrls.set(timer, url);
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
    this.fileGeneration += 1;
    this.traceGeneration += 1;
    this.stopWorker();
    this.stopTimer();
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

  private replaceSvgPreview(svg: string): void {
    const oldUrl = this.svgPreviewUrl();
    if (oldUrl) URL.revokeObjectURL(oldUrl);
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    this.svgPreviewUrl.set(url);
  }

  protected showAlert(
    message: string,
    variant: "success" | "error" | "warning",
  ): void {
    if (this.alertTimer !== undefined) clearTimeout(this.alertTimer);
    this.alertMessage.set(message);
    this.alertVariant.set(variant);
    this.alertTimer = setTimeout(() => {
      this.alertMessage.set("");
      this.alertTimer = undefined;
    }, 3000);
  }
}
