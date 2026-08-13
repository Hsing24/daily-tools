import { Component, signal, computed, OnDestroy } from "@angular/core";
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
import { ToolSlider } from "../../shared/ui/tool-slider/tool-slider";
import {
  type ImageItem,
  type OutputFormat,
  FORMAT_LABELS,
  DEFAULT_QUALITY,
  generateId,
  formatFileSize,
  compressionRatio,
  estimatedRatio,
  isLossyFormat,
  loadImage,
  convertImage,
  checkFormatSupport,
  outputFileName,
  createZipBlob,
  type ZipFileEntry,
  getDefaultOutputFormat,
  isOutputFormat,
  isSupportedInputFile,
} from "./image-converter-utils";

@Component({
  selector: "app-image-converter",
  imports: [
    CommonModule,
    ToolBreadcrumb,
    ToolPanel,
    ToolHeader,
    ToolAlert,
    StatRow,
    ToolRadioGroup,
    ToolSlider,
  ],
  templateUrl: "./image-converter.html",
  styleUrl: "./image-converter.css",
  host: {
    class: "d:block font-family:var(--font-mono) color:var(--ink)",
  },
})
export class ImageConverter implements OnDestroy {
  // --- Template mapping helpers ---
  protected readonly formatFileSize = formatFileSize;
  protected readonly compressionRatio = compressionRatio;
  protected readonly estimatedRatio = estimatedRatio;
  protected readonly isLossyFormat = isLossyFormat;
  protected readonly outputFileName = outputFileName;
  protected readonly labels = FORMAT_LABELS;

  private readonly allFormatOptions: RadioOption[] = [
    { value: "png", label: "PNG" },
    { value: "jpeg", label: "JPEG" },
    { value: "webp", label: "WebP" },
    { value: "avif", label: "AVIF" },
  ];

  // --- Reactive State ---
  protected readonly items = signal<ImageItem[]>([]);
  protected readonly alertMessage = signal("");
  protected readonly alertVariant = signal<"success" | "error" | "warning">(
    "success",
  );
  protected readonly isDragging = signal(false);
  protected readonly supportedFormats = signal<Set<OutputFormat>>(new Set());
  protected readonly formatOptions = computed(() =>
    this.allFormatOptions.filter((option) =>
      this.supportedFormats().has(option.value as OutputFormat),
    ),
  );

  private readonly formatSupportPromise: Promise<void>;
  private alertTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly pendingZipUrls = new Map<
    ReturnType<typeof setTimeout>,
    string
  >();
  private destroyed = false;

  // --- Computed ---
  protected readonly totalItems = computed(() => this.items().length);
  protected readonly completedItems = computed(
    () => this.items().filter((i) => i.status === "done").length,
  );
  protected readonly isConverting = computed(() =>
    this.items().some((i) => i.status === "converting"),
  );

  constructor() {
    this.formatSupportPromise = this.detectFormatSupport();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.cleanupUrls();
    if (this.alertTimer !== undefined) clearTimeout(this.alertTimer);
    for (const [timer, url] of this.pendingZipUrls) {
      clearTimeout(timer);
      URL.revokeObjectURL(url);
    }
    this.pendingZipUrls.clear();
  }

  private cleanupUrls(): void {
    for (const item of this.items()) {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      if (item.resultUrl) URL.revokeObjectURL(item.resultUrl);
    }
  }

  private async detectFormatSupport(): Promise<void> {
    const supported = new Set<OutputFormat>();
    for (const fmt of ["png", "jpeg", "webp", "avif"] as OutputFormat[]) {
      if (await checkFormatSupport(fmt)) {
        supported.add(fmt);
      }
    }
    if (this.destroyed) return;
    this.supportedFormats.set(supported);
    if (!supported.has("avif") && supported.size > 0) {
      this.showAlert(
        "您的瀏覽器不支援 AVIF 編碼，已自動停用該選項。",
        "warning",
      );
    }
  }

  // --- 檔案上傳與處理 ---
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
    if (files) await this.addFiles(files);
  }

  protected async onFileSelect(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      await this.addFiles(input.files);
      input.value = ""; // 重設 input 值以供重選
    }
  }

  private async addFiles(fileList: FileList): Promise<void> {
    await this.formatSupportPromise;
    if (this.destroyed) return;

    const files = Array.from(fileList);
    const imageFiles = files.filter((file) => isSupportedInputFile(file));
    const rejectedCount = files.length - imageFiles.length;
    if (imageFiles.length === 0) {
      this.showAlert("只支援 PNG、JPEG、WebP、AVIF 圖片。", "error");
      return;
    }

    const defaultFormat = getDefaultOutputFormat(this.supportedFormats());
    const newItems: ImageItem[] = [];
    for (const file of imageFiles) {
      try {
        const { width, height } = await loadImage(file);
        const previewUrl = URL.createObjectURL(file);
        newItems.push({
          id: generateId(),
          file,
          previewUrl,
          width,
          height,
          revision: 0,
          outputFormat: defaultFormat,
          quality: DEFAULT_QUALITY * 100,
          status: "pending",
          resultBlob: null,
          resultUrl: "",
          errorMessage: "",
        });
      } catch {
        this.showAlert(
          `無法載入圖片 ${file.name}，請確認檔案格式正確。`,
          "error",
        );
      }
    }

    this.items.update((prev) => [...prev, ...newItems]);
    if (rejectedCount > 0) {
      this.showAlert(
        `已加入 ${newItems.length} 張圖片，略過 ${rejectedCount} 個不支援的檔案。`,
        "warning",
      );
    } else {
      this.showAlert(`已成功加入 ${newItems.length} 張圖片`, "success");
    }
  }

  // --- 參數控制與刪除 ---
  protected updateFormat(id: string, format: string): void {
    if (!isOutputFormat(format) || !this.isFormatSupported(format)) return;
    this.items.update((items) =>
      items.map((item) => {
        if (item.id !== id) return item;
        if (item.resultUrl) URL.revokeObjectURL(item.resultUrl);
        return {
          ...item,
          outputFormat: format as OutputFormat,
          revision: item.revision + 1,
          status: "pending",
          resultBlob: null,
          resultUrl: "",
          errorMessage: "",
        };
      }),
    );
  }

  protected updateQuality(id: string, quality: number): void {
    this.items.update((items) =>
      items.map((item) => {
        if (item.id !== id) return item;
        if (item.resultUrl) URL.revokeObjectURL(item.resultUrl);
        return {
          ...item,
          quality,
          revision: item.revision + 1,
          status: "pending",
          resultBlob: null,
          resultUrl: "",
          errorMessage: "",
        };
      }),
    );
  }

  protected removeItem(id: string): void {
    const item = this.items().find((i) => i.id === id);
    if (item) {
      URL.revokeObjectURL(item.previewUrl);
      if (item.resultUrl) URL.revokeObjectURL(item.resultUrl);
    }
    this.items.update((items) => items.filter((i) => i.id !== id));
  }

  // --- 轉換功能 ---
  protected async convertSingle(id: string): Promise<void> {
    const item = this.items().find((i) => i.id === id);
    if (!item) return;

    const snapshot = {
      file: item.file,
      format: item.outputFormat,
      quality: item.quality,
      revision: item.revision,
    };
    this.setItemStatus(id, "converting");
    try {
      const { img } = await loadImage(snapshot.file);
      const blob = await convertImage(img, snapshot.format, snapshot.quality);
      const current = this.items().find((candidate) => candidate.id === id);
      if (
        this.destroyed ||
        !current ||
        current.revision !== snapshot.revision ||
        current.file !== snapshot.file
      ) {
        return;
      }
      const resultUrl = URL.createObjectURL(blob);
      this.items.update((items) =>
        items.map((i) =>
          i.id === id
            ? {
                ...i,
                status: "done",
                resultBlob: blob,
                resultUrl,
                errorMessage: "",
              }
            : i,
        ),
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "轉檔失敗";
      const current = this.items().find((candidate) => candidate.id === id);
      if (this.destroyed || !current || current.revision !== snapshot.revision)
        return;
      this.items.update((items) =>
        items.map((i) =>
          i.id === id ? { ...i, status: "error", errorMessage: msg } : i,
        ),
      );
    }
  }

  protected async convertAll(): Promise<void> {
    const pending = this.items().filter((i) => i.status !== "done");
    for (const item of pending) {
      await this.convertSingle(item.id);
    }
    if (this.destroyed) return;
    const errors = this.items().filter((i) => i.status === "error").length;
    if (errors > 0) {
      this.showAlert(
        `批次轉換完成，其中 ${errors} 張圖片轉換失敗。`,
        "warning",
      );
    } else {
      this.showAlert("所有圖片轉換成功！", "success");
    }
  }

  // --- 下載與打包 ---
  protected downloadSingle(item: ImageItem): void {
    if (!item.resultBlob) return;
    const a = document.createElement("a");
    a.href = item.resultUrl;
    a.download = outputFileName(item.file.name, item.outputFormat);
    a.click();
  }

  protected async downloadAllZip(): Promise<void> {
    const doneItems = this.items().filter(
      (i) => i.status === "done" && i.resultBlob,
    );
    if (doneItems.length === 0) {
      this.showAlert("目前沒有已轉換完成的圖片可供下載。", "warning");
      return;
    }

    try {
      const zipEntries: ZipFileEntry[] = [];
      for (const item of doneItems) {
        if (!item.resultBlob) continue;
        const arrayBuffer = await item.resultBlob.arrayBuffer();
        zipEntries.push({
          name: outputFileName(item.file.name, item.outputFormat),
          content: new Uint8Array(arrayBuffer),
        });
      }

      const zipBlob = createZipBlob(zipEntries);
      const zipUrl = URL.createObjectURL(zipBlob);

      const a = document.createElement("a");
      a.href = zipUrl;
      a.download = "converted_images.zip";
      a.click();

      // 延遲釋放 url
      const timer = setTimeout(() => {
        this.pendingZipUrls.delete(timer);
        URL.revokeObjectURL(zipUrl);
      }, 1000);
      this.pendingZipUrls.set(timer, zipUrl);
      this.showAlert("ZIP 檔案打包下載成功！", "success");
    } catch (err) {
      this.showAlert("打包 ZIP 失敗，請點選單張下載。", "error");
    }
  }

  // --- 清除與輔助 ---
  protected clearAll(): void {
    this.cleanupUrls();
    this.items.set([]);
    this.showAlert("已清除所有圖片清單。", "success");
  }

  private setItemStatus(id: string, status: ImageItem["status"]): void {
    this.items.update((items) =>
      items.map((i) => (i.id === id ? { ...i, status } : i)),
    );
  }

  private showAlert(
    message: string,
    variant: "success" | "error" | "warning",
  ): void {
    if (this.alertTimer !== undefined) clearTimeout(this.alertTimer);
    this.alertMessage.set(message);
    this.alertVariant.set(variant);
    this.alertTimer = setTimeout(() => {
      this.alertMessage.set("");
      this.alertTimer = undefined;
    }, 4000);
  }

  protected isFormatSupported(format: string): boolean {
    return isOutputFormat(format) && this.supportedFormats().has(format);
  }
}
