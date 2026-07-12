import { Component, signal, computed, OnDestroy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ToolBreadcrumb } from "../../shared/ui/tool-breadcrumb/tool-breadcrumb";
import { ToolPanel } from "../../shared/ui/tool-panel/tool-panel";
import { ToolHeader } from "../../shared/ui/tool-header/tool-header";
import { ToolAlert } from "../../shared/ui/tool-alert/tool-alert";
import { StatRow } from "../../shared/ui/stat-row/stat-row";
import { ToolRadioGroup, RadioOption } from "../../shared/ui/tool-radio-group/tool-radio-group";
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
  ],
  templateUrl: "./image-converter.html",
  styleUrl: "./image-converter.css",
})
export class ImageConverter implements OnDestroy {
  // --- Template mapping helpers ---
  protected readonly formatFileSize = formatFileSize;
  protected readonly compressionRatio = compressionRatio;
  protected readonly estimatedRatio = estimatedRatio;
  protected readonly isLossyFormat = isLossyFormat;
  protected readonly outputFileName = outputFileName;
  protected readonly labels = FORMAT_LABELS;

  protected readonly formatOptions: RadioOption[] = [
    { value: "png", label: "PNG" },
    { value: "jpeg", label: "JPEG" },
    { value: "webp", label: "WebP" },
    { value: "avif", label: "AVIF" },
  ];

  // --- Reactive State ---
  protected readonly items = signal<ImageItem[]>([]);
  protected readonly alertMessage = signal("");
  protected readonly alertVariant = signal<"success" | "error" | "warning">("success");
  protected readonly isDragging = signal(false);
  protected readonly supportedFormats = signal<Set<OutputFormat>>(
    new Set(["png", "jpeg", "webp"])
  );

  // --- Computed ---
  protected readonly totalItems = computed(() => this.items().length);
  protected readonly completedItems = computed(
    () => this.items().filter((i) => i.status === "done").length
  );
  protected readonly isConverting = computed(
    () => this.items().some((i) => i.status === "converting")
  );

  constructor() {
    this.detectFormatSupport();
  }

  ngOnDestroy(): void {
    this.cleanupUrls();
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
    this.supportedFormats.set(supported);
    if (!supported.has("avif")) {
      this.showAlert("您的瀏覽器不支援 AVIF 編碼，已自動停用該選項。", "warning");
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
    const imageFiles = Array.from(fileList).filter((f) =>
      f.type.startsWith("image/")
    );
    if (imageFiles.length === 0) {
      this.showAlert("未偵測到圖片檔案，請選擇圖片格式。", "error");
      return;
    }

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
          outputFormat: "webp", // 預設轉 WebP
          quality: DEFAULT_QUALITY * 100,
          status: "pending",
          resultBlob: null,
          resultUrl: "",
          errorMessage: "",
        });
      } catch {
        this.showAlert(`無法載入圖片 ${file.name}，請確認檔案格式正確。`, "error");
      }
    }

    this.items.update((prev) => [...prev, ...newItems]);
    this.showAlert(`已成功加入 ${newItems.length} 張圖片`, "success");
  }

  // --- 參數控制與刪除 ---
  protected updateFormat(id: string, format: string): void {
    this.items.update((items) =>
      items.map((item) => {
        if (item.id !== id) return item;
        if (item.resultUrl) URL.revokeObjectURL(item.resultUrl);
        return {
          ...item,
          outputFormat: format as OutputFormat,
          status: "pending",
          resultBlob: null,
          resultUrl: "",
          errorMessage: "",
        };
      })
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
          status: "pending",
          resultBlob: null,
          resultUrl: "",
          errorMessage: "",
        };
      })
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

    this.setItemStatus(id, "converting");
    try {
      const { img } = await loadImage(item.file);
      const blob = await convertImage(img, item.outputFormat, item.quality);
      const resultUrl = URL.createObjectURL(blob);
      this.items.update((items) =>
        items.map((i) =>
          i.id === id
            ? { ...i, status: "done", resultBlob: blob, resultUrl, errorMessage: "" }
            : i
        )
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "轉檔失敗";
      this.items.update((items) =>
        items.map((i) =>
          i.id === id
            ? { ...i, status: "error", errorMessage: msg }
            : i
        )
      );
    }
  }

  protected async convertAll(): Promise<void> {
    const pending = this.items().filter((i) => i.status !== "done");
    for (const item of pending) {
      await this.convertSingle(item.id);
    }
    const errors = this.items().filter((i) => i.status === "error").length;
    if (errors > 0) {
      this.showAlert(`批次轉換完成，其中 ${errors} 張圖片轉換失敗。`, "warning");
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
    const doneItems = this.items().filter((i) => i.status === "done" && i.resultBlob);
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
      setTimeout(() => URL.revokeObjectURL(zipUrl), 1000);
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
      items.map((i) => (i.id === id ? { ...i, status } : i))
    );
  }

  private showAlert(message: string, variant: "success" | "error" | "warning"): void {
    this.alertMessage.set(message);
    this.alertVariant.set(variant);
    setTimeout(() => this.alertMessage.set(""), 4000);
  }

  protected isFormatSupported(format: string): boolean {
    return this.supportedFormats().has(format as OutputFormat);
  }
}
