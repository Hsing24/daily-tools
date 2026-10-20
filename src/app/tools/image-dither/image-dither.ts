import {
  Component,
  ElementRef,
  OnDestroy,
  computed,
  effect,
  signal,
  viewChild,
} from "@angular/core";
import { ToolAlert } from "../../shared/ui/tool-alert/tool-alert";
import { ToolBreadcrumb } from "../../shared/ui/tool-breadcrumb/tool-breadcrumb";
import { ToolHeader } from "../../shared/ui/tool-header/tool-header";
import { ToolPanel } from "../../shared/ui/tool-panel/tool-panel";
import {
  ToolRadioGroup,
  type RadioOption,
} from "../../shared/ui/tool-radio-group/tool-radio-group";
import { ToolSlider } from "../../shared/ui/tool-slider/tool-slider";
import {
  DEFAULT_DITHER_SETTINGS,
  MAX_DITHER_BYTES,
  MAX_DITHER_PIXELS,
  type DitherRequest,
  type DitherResponse,
  type DitherSettings,
} from "./image-dither-core";

interface SourceImage {
  name: string;
  canvas: HTMLCanvasElement;
  preview: ImageData;
  scale: number;
}
interface Job {
  id: number;
  revision: number;
  kind: "preview" | "export";
  width: number;
  height: number;
}

class ImageDitherError extends Error {}

@Component({
  selector: "app-image-dither",
  imports: [
    ToolAlert,
    ToolBreadcrumb,
    ToolHeader,
    ToolPanel,
    ToolRadioGroup,
    ToolSlider,
  ],
  templateUrl: "./image-dither.html",
  styleUrl: "./image-dither.css",
  host: { class: "d:block font-family:var(--font-mono) color:var(--ink)" },
})
export class ImageDither implements OnDestroy {
  private readonly originalCanvas =
    viewChild<ElementRef<HTMLCanvasElement>>("originalCanvas");
  private readonly resultCanvas =
    viewChild<ElementRef<HTMLCanvasElement>>("resultCanvas");
  protected readonly source = signal<SourceImage | null>(null);
  protected readonly result = signal<ImageData | null>(null);
  protected readonly settings = signal<DitherSettings>({
    ...DEFAULT_DITHER_SETTINGS,
  });
  protected readonly loading = signal(false);
  protected readonly processing = signal(false);
  protected readonly exporting = signal(false);
  protected readonly dragging = signal(false);
  protected readonly error = signal("");
  protected readonly notice = signal("");
  protected readonly locked = computed(
    () => this.loading() || this.exporting(),
  );
  protected readonly status = computed(() =>
    this.loading()
      ? "正在讀取圖片…"
      : this.exporting()
        ? "正在以原始尺寸處理並編碼 PNG，請稍候…"
        : this.processing()
          ? "正在生成預覽…"
          : this.notice() ||
            (this.result() ? "預覽已更新。" : "等待圖片，像素準備就緒。"),
  );
  protected readonly algorithms: RadioOption[] = [
    { value: "floyd-steinberg", label: "Floyd–Steinberg" },
    { value: "bayer", label: "Bayer 4×4" },
  ];
  protected readonly palettes: RadioOption[] = [
    { value: "monochrome", label: "黑白" },
    { value: "mint", label: "薄荷綠雙色" },
    { value: "amber", label: "琥珀雙色" },
    { value: "color", label: "彩色減色" },
  ];
  protected readonly colorOptions: RadioOption[] = [
    { value: "8", label: "8 色" },
    { value: "27", label: "27 色" },
    { value: "64", label: "64 色" },
  ];
  private worker: Worker | null = null;
  private activeJob: Job | null = null;
  private pendingPreview = false;
  private previewTimer: ReturnType<typeof setTimeout> | undefined;
  private revision = 0;
  private requestId = 0;
  private loadId = 0;
  private decodingImage: HTMLImageElement | null = null;
  private decodeUrl: string | null = null;
  private readonly downloadUrls = new Map<
    string,
    ReturnType<typeof setTimeout>
  >();
  private destroyed = false;

  constructor() {
    effect(() =>
      this.draw(
        this.originalCanvas()?.nativeElement,
        this.source()?.preview ?? null,
      ),
    );
    effect(() => this.draw(this.resultCanvas()?.nativeElement, this.result()));
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) this.acceptFiles(input.files);
    input.value = "";
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    if (!this.exporting()) this.dragging.set(true);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    if (event.dataTransfer) this.acceptFiles(event.dataTransfer.files);
  }

  private acceptFiles(files: FileList): void {
    if (this.exporting() || !files.length) return;
    this.error.set("");
    this.notice.set("");
    if (files.length !== 1) {
      this.error.set("一次放一張就好，請重新選擇單張圖片。");
      return;
    }
    const file = files[0];
    if (
      !["image/png", "image/jpeg", "image/webp", "image/avif"].includes(
        file.type.toLowerCase(),
      )
    ) {
      this.error.set("只支援 PNG、JPEG、WebP、AVIF，請換一張圖片。");
      return;
    }
    if (file.size > MAX_DITHER_BYTES) {
      this.error.set("圖片超過 20 MiB，請縮小檔案後再試。");
      return;
    }
    this.releaseImage();
    const loadId = this.loadId;
    this.loading.set(true);
    try {
      const image = new Image();
      this.decodingImage = image;
      this.decodeUrl = URL.createObjectURL(file);
      image.onload = () => {
        if (loadId !== this.loadId || this.destroyed) return;
        let canvas: HTMLCanvasElement | null = null;
        try {
          const width = image.naturalWidth,
            height = image.naturalHeight;
          if (!width || !height)
            throw new ImageDitherError("圖片尺寸無效，請換一張圖片。");
          if (width * height > MAX_DITHER_PIXELS)
            throw new ImageDitherError(
              "圖片超過 4,000 萬像素，請縮小尺寸後再試。",
            );
          canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const context = this.context(canvas);
          // Freeze a single frame and flatten transparency before any resizing.
          context.fillStyle = "#ffffff";
          context.fillRect(0, 0, width, height);
          context.drawImage(image, 0, 0);
          const scale = Math.min(1, 1024 / Math.max(width, height));
          const preview = document.createElement("canvas");
          try {
            preview.width = Math.max(1, Math.round(width * scale));
            preview.height = Math.max(1, Math.round(height * scale));
            const ctx = this.context(preview);
            ctx.drawImage(canvas, 0, 0, preview.width, preview.height);
            this.source.set({
              name: file.name,
              canvas,
              preview: ctx.getImageData(0, 0, preview.width, preview.height),
              scale,
            });
          } finally {
            preview.width = preview.height = 0;
          }
          this.schedulePreview(0);
        } catch (error) {
          if (canvas) canvas.width = canvas.height = 0;
          this.error.set(
            error instanceof ImageDitherError
              ? error.message
              : "Canvas 讀取失敗，請換一張較小的圖片或其他瀏覽器後再試。",
          );
        } finally {
          this.loading.set(false);
          this.releaseDecode();
        }
      };
      image.onerror = () => {
        if (loadId !== this.loadId || this.destroyed) return;
        this.loading.set(false);
        this.error.set(
          "圖片無法解碼，可能已損壞或瀏覽器不支援此格式，請換一張圖片。",
        );
        this.releaseDecode();
      };
      image.src = this.decodeUrl;
    } catch {
      this.loading.set(false);
      this.releaseDecode();
      this.error.set("無法開啟圖片，請重新選擇。");
    }
  }

  protected setOption(
    key: "algorithm" | "palette" | "colors",
    value: string,
  ): void {
    if (this.locked()) return;
    if (key === "algorithm" && !this.algorithms.some((o) => o.value === value))
      return;
    if (key === "palette" && !this.palettes.some((o) => o.value === value))
      return;
    if (key === "colors" && !this.colorOptions.some((o) => o.value === value))
      return;
    this.settings.update((settings) => ({
      ...settings,
      [key]: key === "colors" ? Number(value) : value,
      ...(key === "palette" && value === "color"
        ? { colors: 64 as const }
        : {}),
    }));
    this.schedulePreview();
  }

  protected setNumber(
    key: "brightness" | "contrast" | "pixelSize",
    value: number,
  ): void {
    if (this.locked() || !Number.isFinite(value)) return;
    const safe =
      key === "pixelSize"
        ? Math.max(1, Math.min(16, Math.round(value)))
        : Math.max(-100, Math.min(100, Math.round(value)));
    this.settings.update((settings) => ({ ...settings, [key]: safe }));
    this.schedulePreview();
  }

  protected reset(): void {
    if (this.locked()) return;
    this.settings.set({ ...DEFAULT_DITHER_SETTINGS });
    this.schedulePreview();
  }

  protected clear(): void {
    if (this.exporting()) return;
    this.releaseImage();
    this.error.set("");
    this.notice.set("");
    this.dragging.set(false);
  }

  private schedulePreview(delay = 150): void {
    this.revision++;
    if (this.previewTimer !== undefined) clearTimeout(this.previewTimer);
    this.pendingPreview = false;
    this.notice.set("");
    if (!this.source()) return;
    this.processing.set(true);
    this.previewTimer = setTimeout(() => {
      this.previewTimer = undefined;
      this.pendingPreview = true;
      this.runPreview();
    }, delay);
  }

  private runPreview(): void {
    const source = this.source();
    if (
      !this.pendingPreview ||
      this.activeJob ||
      !source ||
      this.destroyed ||
      this.exporting()
    )
      return;
    this.pendingPreview = false;
    const settings = {
      ...this.settings(),
      pixelSize: Math.max(1, this.settings().pixelSize * source.scale),
    };
    // Copy only the thumbnail; transfer ownership without detaching the cached source.
    this.startJob(
      "preview",
      new Uint8ClampedArray(source.preview.data),
      source.preview.width,
      source.preview.height,
      settings,
    );
  }

  private startJob(
    kind: Job["kind"],
    pixels: Uint8ClampedArray,
    width: number,
    height: number,
    settings: DitherSettings,
  ): void {
    try {
      if (!this.worker) {
        this.worker = new Worker(
          new URL("./image-dither.worker.ts", import.meta.url),
          { type: "module" },
        );
        this.worker.onmessage = ({ data }: MessageEvent<DitherResponse>) =>
          this.receive(data);
        const worker = this.worker;
        const fail = () => {
          if (this.worker === worker) this.failWorker();
        };
        this.worker.onerror = fail;
        this.worker.onmessageerror = fail;
      }
      const id = ++this.requestId;
      this.activeJob = { id, revision: this.revision, kind, width, height };
      const request: DitherRequest = {
        id,
        data: pixels.buffer as ArrayBuffer,
        width,
        height,
        settings,
      };
      this.worker.postMessage(request, [request.data]);
    } catch {
      this.failWorker();
    }
  }

  private receive(response: DitherResponse): void {
    const job = this.activeJob;
    if (!job || response.id !== job.id || this.destroyed) return;
    this.activeJob = null;
    if (job.kind === "preview" && job.revision !== this.revision) {
      this.processing.set(
        this.pendingPreview || this.previewTimer !== undefined,
      );
      this.runPreview();
      return;
    }
    if (response.type === "error") {
      this.failWorker();
      return;
    }
    try {
      if (
        response.width !== job.width ||
        response.height !== job.height ||
        response.data.byteLength !== job.width * job.height * 4
      )
        throw new Error();
      const frame = new ImageData(
        new Uint8ClampedArray(response.data),
        job.width,
        job.height,
      );
      if (job.kind === "export") {
        void this.encodeDownload(frame, this.loadId);
        return;
      }
      if (job.revision === this.revision) {
        this.result.set(frame);
        this.error.set("");
      }
      this.processing.set(
        this.pendingPreview || this.previewTimer !== undefined,
      );
      this.runPreview();
    } catch {
      this.failWorker();
    }
  }

  private failWorker(): void {
    this.stopWorker();
    this.pendingPreview = false;
    if (this.previewTimer !== undefined) clearTimeout(this.previewTimer);
    this.previewTimer = undefined;
    this.processing.set(false);
    this.exporting.set(false);
    this.error.set("圖片運算失敗，請重設參數或換一張較小的圖片後再試。");
  }

  protected download(): void {
    const source = this.source();
    if (!source || this.locked()) return;
    this.stopWorker();
    if (this.previewTimer !== undefined) clearTimeout(this.previewTimer);
    this.previewTimer = undefined;
    this.pendingPreview = false;
    this.revision++;
    this.exporting.set(true);
    this.processing.set(false);
    this.error.set("");
    this.notice.set("");
    try {
      const { width, height } = source.canvas;
      const pixels = this.context(source.canvas).getImageData(
        0,
        0,
        width,
        height,
      ).data;
      this.startJob("export", pixels, width, height, { ...this.settings() });
    } catch {
      this.exporting.set(false);
      this.error.set("無法讀取原圖像素，請換一張較小的圖片後再試。");
    }
  }

  private async encodeDownload(
    frame: ImageData,
    loadId: number,
  ): Promise<void> {
    const canvas = document.createElement("canvas");
    try {
      canvas.width = frame.width;
      canvas.height = frame.height;
      this.context(canvas).putImageData(frame, 0, 0);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png"),
      );
      if (this.destroyed || loadId !== this.loadId) return;
      if (!blob || blob.type !== "image/png") throw new Error();
      const url = URL.createObjectURL(blob);
      this.downloadUrls.set(
        url,
        setTimeout(() => {
          URL.revokeObjectURL(url);
          this.downloadUrls.delete(url);
        }, 1000),
      );
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${this.source()!.name.replace(/\.[^.]+$/, "")}-dither.png`;
      anchor.click();
      this.notice.set(
        `PNG 已下載，保留 ${frame.width} × ${frame.height} 原始尺寸。`,
      );
    } catch {
      if (!this.destroyed && loadId === this.loadId)
        this.error.set("PNG 編碼或下載失敗，請換一張較小的圖片後再試。");
    } finally {
      canvas.width = canvas.height = 0;
      if (!this.destroyed && loadId === this.loadId) this.exporting.set(false);
    }
  }

  private context(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context)
      throw new ImageDitherError("無法使用 Canvas，請換個瀏覽器後再試。");
    return context;
  }

  private draw(
    canvas: HTMLCanvasElement | undefined,
    frame: ImageData | null,
  ): void {
    if (!canvas || !frame) return;
    try {
      canvas.width = frame.width;
      canvas.height = frame.height;
      this.context(canvas).putImageData(frame, 0, 0);
    } catch {
      this.error.set("Canvas 預覽失敗，請換一張較小的圖片後再試。");
    }
  }

  private stopWorker(): void {
    if (this.worker) {
      this.worker.onmessage =
        this.worker.onerror =
        this.worker.onmessageerror =
          null;
    }
    this.worker?.terminate();
    this.worker = null;
    this.activeJob = null;
  }

  private releaseDecode(): void {
    if (this.decodingImage) {
      this.decodingImage.onload = this.decodingImage.onerror = null;
      this.decodingImage.src = "";
      this.decodingImage = null;
    }
    if (this.decodeUrl) URL.revokeObjectURL(this.decodeUrl);
    this.decodeUrl = null;
  }

  private releaseImage(): void {
    this.loadId++;
    this.revision++;
    this.releaseDecode();
    this.stopWorker();
    if (this.previewTimer !== undefined) clearTimeout(this.previewTimer);
    this.previewTimer = undefined;
    this.pendingPreview = false;
    for (const [url, timer] of this.downloadUrls) {
      clearTimeout(timer);
      URL.revokeObjectURL(url);
    }
    this.downloadUrls.clear();
    const canvas = this.source()?.canvas;
    if (canvas) canvas.width = canvas.height = 0;
    this.source.set(null);
    this.result.set(null);
    this.loading.set(false);
    this.processing.set(false);
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.releaseImage();
  }
}
