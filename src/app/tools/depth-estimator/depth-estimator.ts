import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  computed,
  signal,
  viewChild,
} from "@angular/core";
import { ToolBreadcrumb } from "../../shared/ui/tool-breadcrumb/tool-breadcrumb";
import { ToolPanel } from "../../shared/ui/tool-panel/tool-panel";
import { ToolHeader } from "../../shared/ui/tool-header/tool-header";
import { ToolAlert } from "../../shared/ui/tool-alert/tool-alert";
import { ToolSlider } from "../../shared/ui/tool-slider/tool-slider";
import {
  ToolRadioGroup,
  RadioOption,
} from "../../shared/ui/tool-radio-group/tool-radio-group";
import { StatRow } from "../../shared/ui/stat-row/stat-row";
import {
  ColorMapType,
  DepthModelId,
  DepthResult,
  DeviceType,
  PreviewMode,
  ProgressInfo,
  WorkerRequest,
  WorkerResponse,
} from "./depth-estimator-types";
import {
  depthArrayToImageData,
  encodeGrayscalePng,
  detectGlbImageMimeType,
  exportDepthToGlb,
  exportDepthToObj,
  generateSampleDepthMap,
  getSafePreviewGrid,
  GlbImageMimeType,
  MAX_DEPTH_IMAGE_PIXELS,
  prepareDepthForExport,
} from "./depth-estimator-core";

function isDepthModelId(value: string): value is DepthModelId {
  return value === "onnx-community/depth-anything-v2-small";
}

function isDeviceType(value: string): value is DeviceType {
  return value === "webgpu" || value === "wasm";
}

function isPreviewMode(value: string): value is PreviewMode {
  return (
    value === "depth" ||
    value === "split" ||
    value === "parallax" ||
    value === "mesh3d"
  );
}

function isColorMapType(value: string): value is ColorMapType {
  return (
    value === "grayscale" ||
    value === "viridis" ||
    value === "inferno" ||
    value === "turbo" ||
    value === "plasma" ||
    value === "magma" ||
    value === "coolwarm"
  );
}

@Component({
  selector: "app-depth-estimator",
  imports: [
    ToolBreadcrumb,
    ToolPanel,
    ToolHeader,
    ToolAlert,
    ToolSlider,
    ToolRadioGroup,
    StatRow,
  ],
  templateUrl: "./depth-estimator.html",
  styleUrl: "./depth-estimator.css",
  host: {
    class: "d:block",
  },
})
export class DepthEstimator implements OnInit, OnDestroy {
  // Signals 狀態管理
  readonly selectedModel = signal<DepthModelId>(
    "onnx-community/depth-anything-v2-small",
  );
  readonly preferredDevice = signal<DeviceType>("webgpu");
  readonly activeDevice = signal<DeviceType | null>(null);
  readonly colorMap = signal<ColorMapType>("grayscale");
  readonly previewMode = signal<PreviewMode>("depth");
  readonly invertDepth = signal<boolean>(false);
  readonly contrast = signal<number>(100); // 50 ~ 150 (%)
  readonly brightness = signal<number>(0); // -50 ~ 50 (%)
  readonly splitPosition = signal<number>(50); // 0 ~ 100 (%)
  readonly depthScale3D = signal<number>(35); // 5 ~ 100 (%)
  readonly edgeSoftening = signal<number>(0.5); // 0 ~ 2 (% of width)
  readonly isPointCloud = signal<boolean>(false);

  readonly isLoading = signal<boolean>(false);
  readonly progressInfo = signal<ProgressInfo | null>(null);
  readonly alertState = signal<{
    type: "error" | "warning" | "success";
    message: string;
  } | null>(null);

  readonly inputImageUrl = signal<string | null>(null);
  readonly sourceImageUrl = signal<string | null>(null);
  readonly sourceImageMimeType = signal<GlbImageMimeType | null>(null);
  readonly inputImageElement = signal<HTMLImageElement | null>(null);
  readonly imageDimensions = signal<{ width: number; height: number } | null>(
    null,
  );
  readonly sourceDimensions = signal<{ width: number; height: number } | null>(
    null,
  );
  readonly depthResult = signal<DepthResult | null>(null);
  readonly isDragging = signal<boolean>(false);

  // 3D 視角旋轉狀態
  private yaw = 0.2;
  private pitch = 0.25;
  private zoom = 1.6;
  private isMouseDragging3D = false;
  private lastMousePos = { x: 0, y: 0 };
  private animationFrameId: number | null = null;
  private renderTimerId: number | null = null;
  private readonly downloadRevokeTimers = new Map<number, string>();

  // 2.5D 視差滑鼠座標
  private parallaxOffset = { x: 0, y: 0 };

  // ViewChild Canvas 參照
  private readonly depthCanvasRef =
    viewChild<ElementRef<HTMLCanvasElement>>("depthCanvas");
  private readonly splitCanvasRef =
    viewChild<ElementRef<HTMLCanvasElement>>("splitCanvas");
  private readonly parallaxCanvasRef =
    viewChild<ElementRef<HTMLCanvasElement>>("parallaxCanvas");
  private readonly glCanvasRef =
    viewChild<ElementRef<HTMLCanvasElement>>("glCanvas");
  private readonly fileInputRef =
    viewChild<ElementRef<HTMLInputElement>>("fileInput");

  // WebGL 資源快取
  private gl: WebGLRenderingContext | null = null;
  private glProgram: WebGLProgram | null = null;
  private glPositionBuffer: WebGLBuffer | null = null;
  private glTexCoordBuffer: WebGLBuffer | null = null;
  private glIndexBuffer: WebGLBuffer | null = null;
  private glTexture: WebGLTexture | null = null;
  private glIndexCount = 0;
  private glVertexCount = 0;
  private glGeometryDepth: Float32Array | null = null;
  private glGeometryScale = 0;
  private glTextureImage: HTMLImageElement | null = null;

  // Web Worker 實例
  private worker: Worker | null = null;
  private nextRequestId = 0;
  private activeRequestId = 0;
  private fileGeneration = 0;
  private isDestroyed = false;
  private pendingFileReader: FileReader | null = null;
  private pendingImage: HTMLImageElement | null = null;

  // Radio 選項定義
  readonly modelOptions: RadioOption[] = [
    {
      value: "onnx-community/depth-anything-v2-small",
      label: "Depth Anything V2 (Small)",
    },
  ];

  readonly deviceOptions: RadioOption[] = [
    { value: "webgpu", label: "WebGPU (推薦高速)" },
    { value: "wasm", label: "WASM (CPU 模式)" },
  ];

  readonly previewModeOptions: RadioOption[] = [
    { value: "depth", label: "深度圖" },
    { value: "split", label: "左右對比" },
    { value: "parallax", label: "2.5D 視差" },
    { value: "mesh3d", label: "3D 幾何" },
  ];

  readonly colorMapOptions: RadioOption[] = [
    { value: "grayscale", label: "灰階 (Grayscale)" },
    { value: "viridis", label: "Viridis (翠綠藍)" },
    { value: "inferno", label: "Inferno (烈焰)" },
    { value: "turbo", label: "Turbo (彩虹)" },
    { value: "plasma", label: "Plasma (電漿)" },
    { value: "magma", label: "Magma (岩漿)" },
    { value: "coolwarm", label: "CoolWarm (冷熱)" },
  ];

  readonly statData = computed(() => {
    const res = this.depthResult();
    const dims = this.imageDimensions();
    const dev = this.activeDevice() || this.preferredDevice();

    return [
      {
        label: "影像解析度",
        value: dims ? `${dims.width} × ${dims.height} px` : "---",
      },
      {
        label: "相對深度（disparity，非公尺）",
        value: res
          ? `${res.minDepth.toFixed(2)} ~ ${res.maxDepth.toFixed(2)}`
          : "---",
      },
      {
        label: "推論耗時",
        value: res ? `${res.inferenceTimeMs} ms` : "---",
      },
      {
        label: "運算加速",
        value: dev === "webgpu" ? "WebGPU (GPU)" : "WASM (CPU)",
      },
    ];
  });

  private readonly processedPreviewDepth = computed(() => {
    const res = this.depthResult();
    if (!res) return new Float32Array();
    return prepareDepthForExport(
      res.depthArray,
      res.width,
      res.height,
      res.width,
      res.height,
      {
        invert: this.invertDepth(),
        contrast: this.contrast() / 100,
        brightness: this.brightness() / 100,
        blurPercent: this.edgeSoftening(),
      },
    );
  });

  ngOnInit(): void {
    this.initWorker();
  }

  clearImage(): void {
    this.fileGeneration += 1;
    this.cancelPendingImageLoad();
    this.invalidateActiveRequest();
    this.clearRenderTimer();
    this.inputImageUrl.set(null);
    this.sourceImageUrl.set(null);
    this.sourceImageMimeType.set(null);
    this.inputImageElement.set(null);
    this.imageDimensions.set(null);
    this.sourceDimensions.set(null);
    this.depthResult.set(null);
    this.isLoading.set(false);
    this.progressInfo.set(null);
    this.activeDevice.set(null);
    this.alertState.set(null);
    if (this.fileInputRef()?.nativeElement) {
      this.fileInputRef()!.nativeElement.value = "";
    }
  }

  ngOnDestroy(): void {
    this.isDestroyed = true;
    this.fileGeneration += 1;
    this.cancelPendingImageLoad();
    this.invalidateActiveRequest();
    this.clearRenderTimer();
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    for (const [timerId, href] of this.downloadRevokeTimers) {
      clearTimeout(timerId);
      URL.revokeObjectURL(href);
    }
    this.downloadRevokeTimers.clear();
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.releaseGlResources();
  }

  private invalidateActiveRequest(): number {
    this.nextRequestId = Math.max(this.nextRequestId, this.activeRequestId) + 1;
    this.activeRequestId = this.nextRequestId;
    this.worker?.postMessage({
      type: "cancel",
      requestId: this.activeRequestId,
    } satisfies WorkerRequest);
    return this.activeRequestId;
  }

  private clearRenderTimer(): void {
    if (this.renderTimerId !== null) {
      clearTimeout(this.renderTimerId);
      this.renderTimerId = null;
    }
  }

  private scheduleRender(delay = 0): void {
    if (this.isDestroyed) return;
    this.clearRenderTimer();
    this.renderTimerId = window.setTimeout(() => {
      this.renderTimerId = null;
      this.renderCurrentView();
    }, delay);
  }

  private cancelPendingImageLoad(): void {
    if (this.pendingFileReader) {
      this.pendingFileReader.abort();
      this.pendingFileReader = null;
    }
    if (this.pendingImage) {
      this.pendingImage.onload = null;
      this.pendingImage.onerror = null;
      this.pendingImage.src = "";
      this.pendingImage = null;
    }
  }

  private initWorker(): void {
    if (typeof Worker !== "undefined") {
      try {
        this.worker = new Worker(
          new URL("./depth-estimator.worker.ts", import.meta.url),
          { type: "module" },
        );

        this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
          this.handleWorkerMessage(event.data);
        };

        this.worker.onerror = (err) => {
          console.error("Worker error:", err);
          this.isLoading.set(false);
          this.progressInfo.set(null);
          this.alertState.set({
            type: "error",
            message: "深度估計背景任務發生錯誤，請重新整理重試",
          });
        };
      } catch (e) {
        console.warn("無法啟動專屬 Web Worker，將使用本地回退方式", e);
      }
    }
  }

  private handleWorkerMessage(msg: WorkerResponse): void {
    if (msg.requestId !== this.activeRequestId) return;

    switch (msg.type) {
      case "progress":
        this.progressInfo.set(msg.progress);
        break;
      case "ready":
        this.activeDevice.set(msg.device);
        this.isLoading.set(false);
        this.alertState.set({
          type: "success",
          message: `深度模型已就緒 (${msg.device.toUpperCase()} 加速)`,
        });
        break;
      case "success":
        this.isLoading.set(false);
        this.progressInfo.set(null);
        this.activeDevice.set(msg.device);
        this.depthResult.set({
          depthArray: msg.depthArray,
          width: msg.width,
          height: msg.height,
          minDepth: msg.minDepth,
          maxDepth: msg.maxDepth,
          inferenceTimeMs: msg.inferenceTimeMs,
          device: msg.device,
        });
        this.alertState.set({
          type: "success",
          message: `深度轉換完成！耗時 ${msg.inferenceTimeMs}ms (${msg.device.toUpperCase()})`,
        });
        this.scheduleRender(50);
        break;
      case "error":
        this.isLoading.set(false);
        this.progressInfo.set(null);
        this.alertState.set({
          type: "error",
          message: `轉換失敗: ${msg.message}`,
        });
        break;
    }
  }

  /**
   * 載入預設幾何範例
   */
  protected loadPresetSample(): void {
    const generation = ++this.fileGeneration;
    this.cancelPendingImageLoad();
    this.invalidateActiveRequest();
    this.clearRenderTimer();
    this.isLoading.set(false);
    this.progressInfo.set(null);
    const sample = generateSampleDepthMap(384, 384);
    const dataUrl = sample.imageCanvas.toDataURL("image/png");

    const img = new Image();
    this.pendingImage = img;
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (this.pendingImage === img) this.pendingImage = null;
      if (generation !== this.fileGeneration) return;
      this.inputImageUrl.set(dataUrl);
      this.sourceImageUrl.set(dataUrl);
      this.sourceImageMimeType.set("image/png");
      this.inputImageElement.set(img);
      this.imageDimensions.set({ width: 384, height: 384 });
      this.sourceDimensions.set({ width: 384, height: 384 });

      this.depthResult.set({
        depthArray: sample.depthArray,
        width: 384,
        height: 384,
        minDepth: 0.1,
        maxDepth: 1.0,
        inferenceTimeMs: 12,
        device: "wasm",
      });

      this.alertState.set({
        type: "success",
        message: "已載入 3D 幾何測試範例，可立即切換視差或 3D 檢視！",
      });

      this.scheduleRender(60);
    };
    img.onerror = () => {
      if (this.pendingImage === img) this.pendingImage = null;
      if (generation !== this.fileGeneration) return;
      this.alertState.set({
        type: "error",
        message: "測試圖片載入失敗，請重新整理後再試",
      });
    };
    img.src = dataUrl;
  }

  /**
   * 觸發檔案選擇
   */
  protected triggerFileInput(): void {
    this.fileInputRef()?.nativeElement.click();
  }

  /**
   * 處理圖片上傳
   */
  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    if (!file) return;
    this.processUploadedFile(file);
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(true);
  }

  protected onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      if (file) this.processUploadedFile(file);
    }
  }

  protected onPaste(event: ClipboardEvent): void {
    const items = event.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (
        item?.type.startsWith("image/") &&
        !this.isSupportedImageMime(item.type)
      ) {
        this.showImageError("剪貼簿圖片必須是 PNG、JPG 或 WEBP");
        return;
      }
      if (item && this.isSupportedImageMime(item.type)) {
        const file = item.getAsFile();
        if (file) {
          this.processUploadedFile(file);
          break;
        }
      }
    }
  }

  private processUploadedFile(file: File): void {
    const generation = ++this.fileGeneration;
    this.cancelPendingImageLoad();
    this.invalidateActiveRequest();
    this.clearRenderTimer();
    this.inputImageUrl.set(null);
    this.sourceImageUrl.set(null);
    this.sourceImageMimeType.set(null);
    this.inputImageElement.set(null);
    this.imageDimensions.set(null);
    this.sourceDimensions.set(null);
    this.depthResult.set(null);
    this.isLoading.set(false);
    this.progressInfo.set(null);

    const sourceMimeType = file.type;
    if (!this.isSupportedImageMime(sourceMimeType)) {
      this.alertState.set({
        type: "error",
        message: "請上傳 PNG、JPG 或 WEBP 圖片檔案",
      });
      return;
    }

    const reader = new FileReader();
    this.pendingFileReader = reader;
    reader.onload = (e) => {
      if (this.pendingFileReader === reader) this.pendingFileReader = null;
      if (generation !== this.fileGeneration) return;
      const dataUrl = e.target?.result;
      if (typeof dataUrl !== "string") {
        this.showImageError("圖片讀取失敗，請重新選擇檔案");
        return;
      }
      this.sourceImageUrl.set(dataUrl);
      const img = new Image();
      this.pendingImage = img;
      img.onload = () => {
        if (this.pendingImage === img) this.pendingImage = null;
        if (generation !== this.fileGeneration) return;
        const naturalWidth = img.naturalWidth || img.width;
        const naturalHeight = img.naturalHeight || img.height;
        if (
          !naturalWidth ||
          !naturalHeight ||
          naturalWidth * naturalHeight > MAX_DEPTH_IMAGE_PIXELS
        ) {
          this.showImageError("圖片尺寸過大，請選擇不超過 4,000 萬像素的圖片");
          return;
        }
        this.sourceDimensions.set({
          width: naturalWidth,
          height: naturalHeight,
        });
        // 限制最大推論輸入尺寸，兼顧效能與記憶體
        const maxDimension = 640;
        let w = naturalWidth;
        let h = naturalHeight;

        if (w > maxDimension || h > maxDimension) {
          if (w > h) {
            h = Math.max(1, Math.round((h * maxDimension) / w));
            w = maxDimension;
          } else {
            w = Math.max(1, Math.round((w * maxDimension) / h));
            h = maxDimension;
          }
        }

        const resizeCanvas = document.createElement("canvas");
        resizeCanvas.width = w;
        resizeCanvas.height = h;
        const ctx = resizeCanvas.getContext("2d");
        if (!ctx) {
          this.showImageError("瀏覽器無法建立圖片處理畫布");
          return;
        }
        try {
          ctx.drawImage(img, 0, 0, w, h);
          const scaledUrl = resizeCanvas.toDataURL("image/png");

          const scaledImg = new Image();
          this.pendingImage = scaledImg;
          scaledImg.onload = () => {
            if (this.pendingImage === scaledImg) this.pendingImage = null;
            if (generation !== this.fileGeneration) return;
            this.inputImageUrl.set(scaledUrl);
            this.inputImageElement.set(scaledImg);
            this.sourceImageMimeType.set(sourceMimeType);
            this.imageDimensions.set({ width: w, height: h });
            this.startDepthEstimation(scaledImg, w, h);
          };
          scaledImg.onerror = () => {
            if (this.pendingImage === scaledImg) this.pendingImage = null;
            if (generation === this.fileGeneration) {
              this.showImageError("圖片縮放失敗，請重新選擇檔案");
            }
          };
          scaledImg.src = scaledUrl;
        } catch {
          this.showImageError("圖片處理失敗，請改用較小的圖片");
        }
      };
      img.onerror = () => {
        if (this.pendingImage === img) this.pendingImage = null;
        if (generation === this.fileGeneration) {
          this.showImageError("圖片格式無法解碼，請改用 PNG、JPG 或 WEBP");
        }
      };
      img.src = dataUrl;
    };
    reader.onerror = () => {
      if (this.pendingFileReader === reader) this.pendingFileReader = null;
      if (generation === this.fileGeneration) {
        this.showImageError("圖片讀取失敗，請重新選擇檔案");
      }
    };
    reader.readAsDataURL(file);
  }

  private isSupportedImageMime(mimeType: string): mimeType is GlbImageMimeType {
    return (
      mimeType === "image/png" ||
      mimeType === "image/jpeg" ||
      mimeType === "image/webp"
    );
  }

  private showImageError(message: string): void {
    this.isLoading.set(false);
    this.progressInfo.set(null);
    this.alertState.set({ type: "error", message });
  }

  /**
   * 啟動深度推論
   */
  protected startDepthEstimation(
    imgElement?: HTMLImageElement,
    width?: number,
    height?: number,
  ): void {
    const img = imgElement || this.inputImageElement();
    const dims = this.imageDimensions();
    const w = width || dims?.width;
    const h = height || dims?.height;

    if (!img || !w || !h) {
      this.alertState.set({
        type: "warning",
        message: "請先上傳圖片再執行轉換",
      });
      return;
    }

    const requestId = this.invalidateActiveRequest();
    this.isLoading.set(true);
    this.alertState.set(null);
    this.progressInfo.set({
      status: "init",
      message: "準備載入深度神經網絡...",
    });

    if (this.worker) {
      void this.sendEstimateRequest(img, requestId);
    } else {
      // 若無 Worker 則提示
      this.isLoading.set(false);
      this.progressInfo.set(null);
      this.alertState.set({
        type: "error",
        message: "瀏覽器不支援 Web Worker，無法啟動背景推論",
      });
    }
  }

  private async sendEstimateRequest(
    img: HTMLImageElement,
    requestId: number,
  ): Promise<void> {
    let bitmap: ImageBitmap | null = null;
    try {
      if (typeof createImageBitmap !== "function") {
        throw new Error("瀏覽器不支援 ImageBitmap");
      }
      bitmap = await createImageBitmap(img);
      if (requestId !== this.activeRequestId || !this.worker) {
        bitmap.close();
        return;
      }
      const req: WorkerRequest = {
        type: "estimate",
        requestId,
        model: this.selectedModel(),
        device: this.preferredDevice(),
        imageBitmap: bitmap,
      };
      this.worker.postMessage(req, [bitmap]);
      bitmap = null;
    } catch (error) {
      bitmap?.close();
      if (requestId !== this.activeRequestId) return;
      this.isLoading.set(false);
      this.progressInfo.set(null);
      this.alertState.set({
        type: "error",
        message: `圖片無法送入深度模型：${error instanceof Error ? error.message : "未知錯誤"}`,
      });
    }
  }

  /**
   * 更新預覽畫布
   */
  protected renderCurrentView(): void {
    const mode = this.previewMode();
    switch (mode) {
      case "depth":
        this.renderDepthCanvas();
        break;
      case "split":
        this.renderSplitCanvas();
        break;
      case "parallax":
        this.renderParallaxCanvas();
        break;
      case "mesh3d":
        this.render3DMeshCanvas();
        break;
    }
  }

  /**
   * 繪製 2D 深度圖
   */
  private renderDepthCanvas(): void {
    const res = this.depthResult();
    const canvas = this.depthCanvasRef()?.nativeElement;
    if (!res || !canvas) return;

    canvas.width = res.width;
    canvas.height = res.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const processedDepth = this.getProcessedDepth(res.width, res.height);
    const imgData = depthArrayToImageData(
      processedDepth,
      res.width,
      res.height,
      {
        colorMap: this.colorMap(),
      },
    );

    ctx.putImageData(imgData, 0, 0);
  }

  /**
   * 繪製左右對比 Canvas
   */
  private renderSplitCanvas(): void {
    const res = this.depthResult();
    const img = this.inputImageElement();
    const canvas = this.splitCanvasRef()?.nativeElement;
    if (!res || !img || !canvas) return;

    canvas.width = res.width;
    canvas.height = res.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 先繪製原圖
    ctx.drawImage(img, 0, 0, res.width, res.height);

    // 產生深度圖 ImageData
    const depthImgData = depthArrayToImageData(
      this.getProcessedDepth(res.width, res.height),
      res.width,
      res.height,
      {
        colorMap: this.colorMap(),
      },
    );

    // 建立暫存 depth canvas
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = res.width;
    tempCanvas.height = res.height;
    const tempCtx = tempCanvas.getContext("2d");
    if (!tempCtx) return;
    tempCtx.putImageData(depthImgData, 0, 0);

    // 依據分割位置繪製深度圖右半部
    const splitX = Math.round((this.splitPosition() / 100) * res.width);

    ctx.save();
    ctx.beginPath();
    ctx.rect(splitX, 0, res.width - splitX, res.height);
    ctx.clip();
    ctx.drawImage(tempCanvas, 0, 0);
    ctx.restore();

    // 繪製分割線 (CRT Mint)
    ctx.strokeStyle = "#3FE0C5";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(splitX, 0);
    ctx.lineTo(splitX, res.height);
    ctx.stroke();

    // 繪製分割指示把手標籤
    ctx.fillStyle = "#0A1A2F";
    ctx.fillRect(splitX - 32, res.height / 2 - 14, 64, 28);
    ctx.strokeStyle = "#3FE0C5";
    ctx.lineWidth = 2;
    ctx.strokeRect(splitX - 32, res.height / 2 - 14, 64, 28);

    ctx.fillStyle = "#3FE0C5";
    ctx.font = '12px "IBM Plex Mono", monospace';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("◀ ❚❚ ▶", splitX, res.height / 2);
  }

  /**
   * 處理 Split 對比 Canvas 滑鼠拖曳互動
   */
  protected onSplitCanvasPointerMove(event: MouseEvent | TouchEvent): void {
    if (this.previewMode() !== "split") return;
    const canvas = this.splitCanvasRef()?.nativeElement;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clientX =
      "touches" in event ? (event.touches[0]?.clientX ?? 0) : event.clientX;

    const relX = clientX - rect.left;
    const percent = Math.max(0, Math.min(100, (relX / rect.width) * 100));
    this.splitPosition.set(Math.round(percent));
    this.renderSplitCanvas();
  }

  /**
   * 繪製 2.5D 視差 Canvas
   */
  private renderParallaxCanvas(): void {
    const res = this.depthResult();
    const img = this.inputImageElement();
    const canvas = this.parallaxCanvasRef()?.nativeElement;
    if (!res || !img || !canvas) return;

    const w = res.width;
    const h = res.height;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 讀取原圖像素
    const srcCanvas = document.createElement("canvas");
    srcCanvas.width = w;
    srcCanvas.height = h;
    const srcCtx = srcCanvas.getContext("2d");
    if (!srcCtx) return;
    srcCtx.drawImage(img, 0, 0, w, h);
    const srcData = srcCtx.getImageData(0, 0, w, h).data;

    const outData = ctx.createImageData(w, h);
    const out = outData.data;

    const maxDisplacement = 18; // 最大位移像素
    const shiftX = this.parallaxOffset.x * maxDisplacement;
    const shiftY = this.parallaxOffset.y * maxDisplacement;
    const processedDepth = this.getProcessedDepth(w, h);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        const d = processedDepth[idx] ?? 0;

        // 前景位移大，背景位移小
        const dx = Math.round((d - 0.5) * shiftX);
        const dy = Math.round((d - 0.5) * shiftY);

        const sampleX = Math.max(0, Math.min(w - 1, x + dx));
        const sampleY = Math.max(0, Math.min(h - 1, y + dy));
        const srcIdx = (sampleY * w + sampleX) * 4;
        const destIdx = idx * 4;

        out[destIdx] = srcData[srcIdx] ?? 0;
        out[destIdx + 1] = srcData[srcIdx + 1] ?? 0;
        out[destIdx + 2] = srcData[srcIdx + 2] ?? 0;
        out[destIdx + 3] = 255;
      }
    }

    ctx.putImageData(outData, 0, 0);
  }

  /**
   * 處理 2.5D 視差滑鼠移動事件
   */
  protected onParallaxMouseMove(event: MouseEvent): void {
    if (this.previewMode() !== "parallax") return;
    const canvas = this.parallaxCanvasRef()?.nativeElement;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const normX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const normY = ((event.clientY - rect.top) / rect.height - 0.5) * 2;

    this.parallaxOffset = { x: normX, y: normY };
    this.renderParallaxCanvas();
  }

  /**
   * 繪製 3D 幾何 WebGL Canvas
   */
  private render3DMeshCanvas(): void {
    const res = this.depthResult();
    const img = this.inputImageElement();
    const canvas = this.glCanvasRef()?.nativeElement;
    if (!res || !img || !canvas) return;

    const gl = canvas.getContext("webgl");
    if (!gl) {
      console.warn("WebGL 不可用");
      return;
    }
    if (this.gl && this.gl !== gl) {
      this.releaseGlResources();
    }
    this.gl = gl;

    const displayWidth = Math.max(
      1,
      Math.round((canvas.clientWidth || 1) * (window.devicePixelRatio || 1)),
    );
    const displayHeight = Math.max(
      1,
      Math.round((canvas.clientHeight || 1) * (window.devicePixelRatio || 1)),
    );
    if (canvas.width !== displayWidth) canvas.width = displayWidth;
    if (canvas.height !== displayHeight) canvas.height = displayHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);

    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0.04, 0.1, 0.18, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // 建立 Shaders
    if (!this.glProgram) {
      const vsSource = `
        attribute vec3 aPosition;
        attribute vec2 aTexCoord;
        uniform mat4 uMVPMatrix;
        varying vec2 vTexCoord;
        void main() {
          gl_Position = uMVPMatrix * vec4(aPosition, 1.0);
          gl_PointSize = 2.5;
          vTexCoord = aTexCoord;
        }
      `;

      const fsSource = `
        precision mediump float;
        uniform sampler2D uTexture;
        uniform bool uUseColormap;
        uniform vec3 uBaseColor;
        varying vec2 vTexCoord;
        void main() {
          vec4 texColor = texture2D(uTexture, vTexCoord);
          if (uUseColormap) {
            gl_FragColor = vec4(texColor.rgb, 1.0);
          } else {
            gl_FragColor = texColor;
          }
        }
      `;

      const vs = gl.createShader(gl.VERTEX_SHADER)!;
      gl.shaderSource(vs, vsSource);
      gl.compileShader(vs);
      if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
        const info = gl.getShaderInfoLog(vs) || "vertex shader 編譯失敗";
        gl.deleteShader(vs);
        this.showImageError(`3D 預覽無法啟動：${info}`);
        return;
      }

      const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
      gl.shaderSource(fs, fsSource);
      gl.compileShader(fs);
      if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
        const info = gl.getShaderInfoLog(fs) || "fragment shader 編譯失敗";
        gl.deleteShader(vs);
        gl.deleteShader(fs);
        this.showImageError(`3D 預覽無法啟動：${info}`);
        return;
      }

      const prog = gl.createProgram()!;
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        const info = gl.getProgramInfoLog(prog) || "shader link 失敗";
        gl.deleteProgram(prog);
        this.showImageError(`3D 預覽無法啟動：${info}`);
        return;
      }
      this.glProgram = prog;
    }

    gl.useProgram(this.glProgram);

    // 建置網格頂點；Uint16 index 不可超過 65,535 個頂點。
    const { cols, rows } = getSafePreviewGrid(res.width, res.height);
    const aspect = res.width / res.height;
    const scaleZ = (this.depthScale3D() / 100) * 0.8;
    const processedDepth = this.getProcessedDepth(res.width, res.height);

    if (
      this.glGeometryDepth !== processedDepth ||
      this.glGeometryScale !== scaleZ
    ) {
      const positions = new Float32Array(cols * rows * 3);
      const texCoords = new Float32Array(cols * rows * 2);
      const indices = new Uint16Array(Math.max(0, (cols - 1) * (rows - 1) * 6));
      let indexOffset = 0;

      for (let r = 0; r < rows; r++) {
        const yPixel =
          rows > 1 ? Math.round((r * (res.height - 1)) / (rows - 1)) : 0;
        const v = res.height > 1 ? 1.0 - yPixel / (res.height - 1) : 1;
        const yWorld = (v - 0.5) * 2.0;

        for (let c = 0; c < cols; c++) {
          const xPixel =
            cols > 1 ? Math.round((c * (res.width - 1)) / (cols - 1)) : 0;
          const u = res.width > 1 ? xPixel / (res.width - 1) : 0;
          const xWorld = (u - 0.5) * 2.0 * aspect;

          const idx = yPixel * res.width + xPixel;
          const d = processedDepth[idx] ?? 0;
          const zWorld = d * scaleZ;

          const vertex = r * cols + c;
          positions[vertex * 3] = xWorld;
          positions[vertex * 3 + 1] = yWorld;
          positions[vertex * 3 + 2] = zWorld;
          texCoords[vertex * 2] = u;
          texCoords[vertex * 2 + 1] = 1.0 - v;
        }
      }

      for (let r = 0; r < rows - 1; r++) {
        for (let c = 0; c < cols - 1; c++) {
          const p1 = r * cols + c;
          const p2 = r * cols + (c + 1);
          const p3 = (r + 1) * cols + (c + 1);
          const p4 = (r + 1) * cols + c;

          indices[indexOffset++] = p1;
          indices[indexOffset++] = p3;
          indices[indexOffset++] = p2;
          indices[indexOffset++] = p1;
          indices[indexOffset++] = p4;
          indices[indexOffset++] = p3;
        }
      }

      // 更新頂點 Buffer
      if (!this.glPositionBuffer) this.glPositionBuffer = gl.createBuffer();
      if (!this.glPositionBuffer) return;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.glPositionBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, positions, gl.DYNAMIC_DRAW);

      if (!this.glTexCoordBuffer) this.glTexCoordBuffer = gl.createBuffer();
      if (!this.glTexCoordBuffer) return;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.glTexCoordBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.DYNAMIC_DRAW);

      if (!this.glIndexBuffer) this.glIndexBuffer = gl.createBuffer();
      if (!this.glIndexBuffer) return;
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.glIndexBuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
      this.glIndexCount = indices.length;
      this.glVertexCount = cols * rows;
      this.glGeometryDepth = processedDepth;
      this.glGeometryScale = scaleZ;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, this.glPositionBuffer);
    const aPosLoc = gl.getAttribLocation(this.glProgram, "aPosition");
    gl.enableVertexAttribArray(aPosLoc);
    gl.vertexAttribPointer(aPosLoc, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.glTexCoordBuffer);
    const aTexLoc = gl.getAttribLocation(this.glProgram, "aTexCoord");
    gl.enableVertexAttribArray(aTexLoc);
    gl.vertexAttribPointer(aTexLoc, 2, gl.FLOAT, false, 0, 0);

    // 紋理貼圖
    if (!this.glTexture) this.glTexture = gl.createTexture();
    if (!this.glTexture) return;
    gl.bindTexture(gl.TEXTURE_2D, this.glTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (this.glTextureImage !== img) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      this.glTextureImage = img;
    }

    // MVP 矩陣運算
    const mvpMatrix = this.computeMVPMatrix(canvas.width / canvas.height);
    const uMVPLoc = gl.getUniformLocation(this.glProgram, "uMVPMatrix");
    gl.uniformMatrix4fv(uMVPLoc, false, mvpMatrix);

    const uTexLoc = gl.getUniformLocation(this.glProgram, "uTexture");
    gl.uniform1i(uTexLoc, 0);

    // 繪製網格或點雲
    if (this.isPointCloud()) {
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
      gl.drawArrays(gl.POINTS, 0, this.glVertexCount);
    } else {
      if (!this.glIndexBuffer) this.glIndexBuffer = gl.createBuffer();
      if (!this.glIndexBuffer) return;
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.glIndexBuffer);
      gl.drawElements(gl.TRIANGLES, this.glIndexCount, gl.UNSIGNED_SHORT, 0);
    }
  }

  private releaseGlResources(): void {
    const gl = this.gl;
    if (!gl) return;
    if (this.glPositionBuffer) gl.deleteBuffer(this.glPositionBuffer);
    if (this.glTexCoordBuffer) gl.deleteBuffer(this.glTexCoordBuffer);
    if (this.glIndexBuffer) gl.deleteBuffer(this.glIndexBuffer);
    if (this.glTexture) gl.deleteTexture(this.glTexture);
    if (this.glProgram) gl.deleteProgram(this.glProgram);
    this.glPositionBuffer = null;
    this.glTexCoordBuffer = null;
    this.glIndexBuffer = null;
    this.glTexture = null;
    this.glProgram = null;
    this.glIndexCount = 0;
    this.glVertexCount = 0;
    this.glGeometryDepth = null;
    this.glTextureImage = null;
    this.gl = null;
  }

  /**
   * 計算 3D 軌道矩陣
   */
  private computeMVPMatrix(aspect: number): Float32Array {
    // 簡易 Perspective Projection
    const fov = (45 * Math.PI) / 180;
    const near = 0.1;
    const far = 100.0;
    const f = 1.0 / Math.tan(fov / 2);

    const proj = [
      f / aspect,
      0,
      0,
      0,
      0,
      f,
      0,
      0,
      0,
      0,
      (far + near) / (near - far),
      -1,
      0,
      0,
      (2 * far * near) / (near - far),
      0,
    ];

    // 相機旋轉與位移 (Yaw, Pitch, Zoom)
    const cy = Math.cos(this.yaw);
    const sy = Math.sin(this.yaw);
    const cp = Math.cos(this.pitch);
    const sp = Math.sin(this.pitch);

    // View Matrix
    const view = [
      cy,
      sy * sp,
      -sy * cp,
      0,
      0,
      cp,
      sp,
      0,
      sy,
      -cy * sp,
      cy * cp,
      0,
      0,
      0,
      -this.zoom * 2.5,
      1,
    ];

    // Matrix Multiply (Proj x View)
    const out = new Float32Array(16);
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        let sum = 0;
        for (let k = 0; k < 4; k++) {
          sum += (view[i * 4 + k] ?? 0) * (proj[k * 4 + j] ?? 0);
        }
        out[i * 4 + j] = sum;
      }
    }
    return out;
  }

  // 3D 視角滑鼠互動
  protected on3DMouseDown(event: MouseEvent): void {
    this.isMouseDragging3D = true;
    this.lastMousePos = { x: event.clientX, y: event.clientY };
  }

  protected on3DMouseMove(event: MouseEvent): void {
    if (!this.isMouseDragging3D) return;
    const dx = event.clientX - this.lastMousePos.x;
    const dy = event.clientY - this.lastMousePos.y;
    this.lastMousePos = { x: event.clientX, y: event.clientY };

    this.yaw += dx * 0.01;
    this.pitch = Math.max(-1.4, Math.min(1.4, this.pitch + dy * 0.01));
    this.render3DMeshCanvas();
  }

  protected on3DMouseUp(): void {
    this.isMouseDragging3D = false;
  }

  protected on3DWheel(event: WheelEvent): void {
    event.preventDefault();
    this.zoom = Math.max(0.6, Math.min(4.0, this.zoom + event.deltaY * 0.0015));
    this.render3DMeshCanvas();
  }

  protected reset3DCamera(): void {
    this.yaw = 0.2;
    this.pitch = 0.25;
    this.zoom = 1.6;
    this.render3DMeshCanvas();
  }

  // 控制項變更事件
  protected onModelChange(val: string): void {
    if (!isDepthModelId(val)) return;
    this.selectedModel.set(val);
    if (this.inputImageElement()) {
      this.startDepthEstimation();
    }
  }

  protected onDeviceChange(val: string): void {
    if (!isDeviceType(val)) return;
    this.preferredDevice.set(val);
    if (this.inputImageElement()) {
      this.startDepthEstimation();
    }
  }

  protected onPreviewModeChange(val: string): void {
    if (!isPreviewMode(val)) return;
    this.previewMode.set(val);
    this.scheduleRender(30);
  }

  protected onColorMapChange(val: string): void {
    if (!isColorMapType(val)) return;
    this.colorMap.set(val);
    this.scheduleRender();
  }

  protected onInvertToggle(): void {
    this.invertDepth.set(!this.invertDepth());
    this.scheduleRender();
  }

  protected onContrastChange(val: number): void {
    this.contrast.set(val);
    this.scheduleRender();
  }

  protected onBrightnessChange(val: number): void {
    this.brightness.set(val);
    this.scheduleRender();
  }

  protected onEdgeSofteningChange(val: number): void {
    this.edgeSoftening.set(val);
    this.scheduleRender();
  }

  protected onDepthScale3DChange(val: number): void {
    this.depthScale3D.set(val);
    this.scheduleRender();
  }

  protected togglePointCloud(): void {
    this.isPointCloud.set(!this.isPointCloud());
    this.scheduleRender();
  }

  private getProcessedDepth(
    targetWidth: number,
    targetHeight: number,
  ): Float32Array {
    const res = this.depthResult();
    if (!res) return new Float32Array();
    if (targetWidth === res.width && targetHeight === res.height) {
      return this.processedPreviewDepth();
    }

    return prepareDepthForExport(
      res.depthArray,
      res.width,
      res.height,
      targetWidth,
      targetHeight,
      {
        invert: this.invertDepth(),
        contrast: this.contrast() / 100,
        brightness: this.brightness() / 100,
        blurPercent: this.edgeSoftening(),
      },
    );
  }

  private async pngBytesToDataUrl(bytes: Uint8Array): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(
        new Blob([bytes.buffer.slice(0) as ArrayBuffer], { type: "image/png" }),
      );
    });
  }

  private triggerDownload(href: string, filename: string): void {
    if (this.isDestroyed) {
      if (href.startsWith("blob:")) URL.revokeObjectURL(href);
      return;
    }
    const a = document.createElement("a");
    a.href = href;
    a.download = filename;
    a.click();
    if (href.startsWith("blob:")) {
      const timerId = window.setTimeout(() => {
        URL.revokeObjectURL(href);
        this.downloadRevokeTimers.delete(timerId);
      }, 1_000);
      this.downloadRevokeTimers.set(timerId, href);
    }
  }

  private async downloadDepthPng(bitDepth: 8 | 16): Promise<void> {
    const res = this.depthResult();
    const dimensions = this.sourceDimensions() ?? this.imageDimensions();
    if (!res || !dimensions) return;
    const generation = this.fileGeneration;

    try {
      const processedDepth = this.getProcessedDepth(
        dimensions.width,
        dimensions.height,
      );
      const bytes = await encodeGrayscalePng(
        processedDepth,
        dimensions.width,
        dimensions.height,
        bitDepth,
        {
          minDepth: res.minDepth,
          maxDepth: res.maxDepth,
          invert: this.invertDepth(),
          contrast: this.contrast() / 100,
          brightness: this.brightness() / 100,
          blurPercent: this.edgeSoftening(),
        },
      );
      const href = await this.pngBytesToDataUrl(bytes);
      if (generation !== this.fileGeneration || this.isDestroyed) return;
      this.triggerDownload(href, `depth-map-${bitDepth}bit-${Date.now()}.png`);
    } catch {
      this.alertState.set({
        type: "error",
        message: "PNG 編碼失敗，請改用較小的圖片後再試",
      });
    }
  }

  /** 匯出單通道 8-bit 灰階 PNG。 */
  protected async downloadPng(): Promise<void> {
    await this.downloadDepthPng(8);
  }

  /** 匯出保留 normalized 深度階調的單通道 16-bit 灰階 PNG。 */
  protected async download16BitPng(): Promise<void> {
    await this.downloadDepthPng(16);
  }

  /** 匯出目前著色盤預覽，供簡報與說明使用。 */
  protected downloadPreviewPng(): void {
    const res = this.depthResult();
    const dimensions = this.sourceDimensions() ?? this.imageDimensions();
    if (!res || !dimensions) return;

    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = dimensions.width;
    tempCanvas.height = dimensions.height;
    const ctx = tempCanvas.getContext("2d");
    if (!ctx) return;

    const imgData = depthArrayToImageData(
      this.getProcessedDepth(dimensions.width, dimensions.height),
      dimensions.width,
      dimensions.height,
      {
        colorMap: this.colorMap(),
      },
    );
    ctx.putImageData(imgData, 0, 0);
    this.triggerDownload(
      tempCanvas.toDataURL("image/png"),
      `depth-preview-${this.colorMap()}-${Date.now()}.png`,
    );
  }

  /**
   * 匯出下載 3D .OBJ 幾何網格檔
   */
  protected downloadObj(): void {
    const res = this.depthResult();
    if (!res) return;

    const dimensions = this.sourceDimensions() ?? {
      width: res.width,
      height: res.height,
    };
    const adjustedDepth = this.getProcessedDepth(res.width, res.height);
    const objContent = exportDepthToObj(adjustedDepth, res.width, res.height, {
      depthScale: (this.depthScale3D() / 100) * 0.8,
      maxGridDimension: 192,
      sourceDimensions: dimensions,
    });

    const blob = new Blob([objContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    this.triggerDownload(url, `depth-mesh-${Date.now()}.obj`);
  }

  /** 匯出含來源圖片貼圖的 glTF 2.0 binary。 */
  protected async downloadGlb(): Promise<void> {
    const res = this.depthResult();
    const sourceImageUrl = this.sourceImageUrl();
    if (!res || !sourceImageUrl) return;
    const generation = this.fileGeneration;
    const dimensions = this.sourceDimensions() ?? {
      width: res.width,
      height: res.height,
    };
    const imageMimeType = this.sourceImageMimeType();
    const processedDepth = this.getProcessedDepth(res.width, res.height);
    if (!imageMimeType) return;

    try {
      const response = await fetch(sourceImageUrl);
      if (generation !== this.fileGeneration || this.isDestroyed) return;
      if (!response.ok) {
        throw new Error("無法讀取原始圖片");
      }
      const imageBytes = new Uint8Array(await response.arrayBuffer());
      if (generation !== this.fileGeneration || this.isDestroyed) return;
      if (detectGlbImageMimeType(imageBytes) !== imageMimeType) {
        throw new Error("原始圖片格式與內容不一致");
      }
      const glb = exportDepthToGlb(
        processedDepth,
        res.width,
        res.height,
        imageBytes,
        imageMimeType,
        {
          maxGridDimension: 192,
          depthScale: (this.depthScale3D() / 100) * 0.8,
          sourceDimensions: dimensions,
        },
      );
      const blob = new Blob([glb.buffer as ArrayBuffer], {
        type: "model/gltf-binary",
      });
      const url = URL.createObjectURL(blob);
      this.triggerDownload(url, `depth-scene-${Date.now()}.glb`);
    } catch {
      this.alertState.set({
        type: "error",
        message: "GLB 匯出失敗：原始貼圖必須是有效的 PNG、JPEG 或 WebP",
      });
    }
  }

  /**
   * 複製深度圖至剪貼簿
   */
  protected async copyToClipboard(): Promise<void> {
    const res = this.depthResult();
    if (!res) return;
    const generation = this.fileGeneration;

    try {
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = res.width;
      tempCanvas.height = res.height;
      const ctx = tempCanvas.getContext("2d");
      if (!ctx) return;

      const imgData = depthArrayToImageData(
        this.getProcessedDepth(res.width, res.height),
        res.width,
        res.height,
        {
          colorMap: this.colorMap(),
        },
      );
      ctx.putImageData(imgData, 0, 0);

      if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
        throw new Error("瀏覽器不支援圖片剪貼簿");
      }
      const blob = await new Promise<Blob>((resolve, reject) => {
        try {
          tempCanvas.toBlob(
            (value) =>
              value ? resolve(value) : reject(new Error("PNG 產生失敗")),
            "image/png",
          );
        } catch (error) {
          reject(error);
        }
      });
      if (generation !== this.fileGeneration || this.isDestroyed) return;
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      this.alertState.set({
        type: "success",
        message: "深度圖已成功複製至剪貼簿！",
      });
    } catch (e) {
      this.alertState.set({
        type: "error",
        message: "剪貼簿寫入失敗，請改用下載功能",
      });
    }
  }
}
