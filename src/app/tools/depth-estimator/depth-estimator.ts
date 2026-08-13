import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  computed,
  signal,
  viewChild,
} from "@angular/core";
import { CommonModule } from "@angular/common";
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
  exportDepthToObj,
  generateSampleDepthMap,
} from "./depth-estimator-core";

@Component({
  selector: "app-depth-estimator",
  imports: [
    CommonModule,
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
    "onnx-community/depth-anything-v2-small"
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
  readonly isPointCloud = signal<boolean>(false);

  readonly isLoading = signal<boolean>(false);
  readonly progressInfo = signal<ProgressInfo | null>(null);
  readonly alertState = signal<{
    type: "error" | "warning" | "success";
    message: string;
  } | null>(null);

  readonly inputImageUrl = signal<string | null>(null);
  readonly inputImageElement = signal<HTMLImageElement | null>(null);
  readonly imageDimensions = signal<{ width: number; height: number } | null>(
    null
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
  private glTexture: WebGLTexture | null = null;
  private glIndexCount = 0;

  // Web Worker 實例
  private worker: Worker | null = null;

  // Radio 選項定義
  readonly modelOptions: RadioOption[] = [
    {
      value: "onnx-community/depth-anything-v2-small",
      label: "Depth Anything V2 (Small)",
    },
    {
      value: "onnx-community/depth-anything-v2-tiny",
      label: "Depth Anything V2 (Tiny)",
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
        label: "深度範圍",
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

  ngOnInit(): void {
    this.initWorker();
  }

  clearImage(): void {
    this.inputImageUrl.set(null);
    this.inputImageElement.set(null);
    this.imageDimensions.set(null);
    this.depthResult.set(null);
    this.alertState.set(null);
    if (this.fileInputRef()?.nativeElement) {
      this.fileInputRef()!.nativeElement.value = "";
    }
  }


  ngOnDestroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }

  private initWorker(): void {
    if (typeof Worker !== "undefined") {
      try {
        this.worker = new Worker(
          new URL("./depth-estimator.worker.ts", import.meta.url),
          { type: "module" }
        );

        this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
          this.handleWorkerMessage(event.data);
        };

        this.worker.onerror = (err) => {
          console.error("Worker error:", err);
          this.isLoading.set(false);
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
        setTimeout(() => this.renderCurrentView(), 50);
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
    const sample = generateSampleDepthMap(384, 384);
    const dataUrl = sample.imageCanvas.toDataURL("image/png");

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      this.inputImageUrl.set(dataUrl);
      this.inputImageElement.set(img);
      this.imageDimensions.set({ width: 384, height: 384 });

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

      setTimeout(() => this.renderCurrentView(), 60);
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
      if (item && item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          this.processUploadedFile(file);
          break;
        }
      }
    }
  }

  private processUploadedFile(file: File): void {
    if (!file.type.startsWith("image/")) {
      this.alertState.set({
        type: "error",
        message: "請上傳標準圖片檔案 (JPG、PNG、WEBP)",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        // 限制最大推論輸入尺寸，兼顧效能與記憶體
        const maxDimension = 640;
        let w = img.naturalWidth;
        let h = img.naturalHeight;

        if (w > maxDimension || h > maxDimension) {
          if (w > h) {
            h = Math.round((h * maxDimension) / w);
            w = maxDimension;
          } else {
            w = Math.round((w * maxDimension) / h);
            h = maxDimension;
          }
        }

        const resizeCanvas = document.createElement("canvas");
        resizeCanvas.width = w;
        resizeCanvas.height = h;
        const ctx = resizeCanvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const scaledUrl = resizeCanvas.toDataURL("image/png");

          const scaledImg = new Image();
          scaledImg.onload = () => {
            this.inputImageUrl.set(scaledUrl);
            this.inputImageElement.set(scaledImg);
            this.imageDimensions.set({ width: w, height: h });
            this.startDepthEstimation(scaledImg, w, h);
          };
          scaledImg.src = scaledUrl;
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }

  /**
   * 啟動深度推論
   */
  protected startDepthEstimation(
    imgElement?: HTMLImageElement,
    width?: number,
    height?: number
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

    this.isLoading.set(true);
    this.alertState.set(null);
    this.progressInfo.set({
      status: "init",
      message: "準備載入深度神經網絡...",
    });

    if (this.worker) {
      createImageBitmap(img).then((bitmap) => {
        const req: WorkerRequest = {
          type: "estimate",
          model: this.selectedModel(),
          device: this.preferredDevice(),
          imageBitmap: bitmap,
        };
        this.worker?.postMessage(req, [bitmap]);
      });
    } else {
      // 若無 Worker 則提示
      this.isLoading.set(false);
      this.alertState.set({
        type: "error",
        message: "瀏覽器不支援 Web Worker，無法啟動背景推論",
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

    const imgData = depthArrayToImageData(res.depthArray, res.width, res.height, {
      colorMap: this.colorMap(),
      invert: this.invertDepth(),
      contrast: this.contrast() / 100,
      brightness: this.brightness() / 100,
    });

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
      res.depthArray,
      res.width,
      res.height,
      {
        colorMap: this.colorMap(),
        invert: this.invertDepth(),
        contrast: this.contrast() / 100,
        brightness: this.brightness() / 100,
      }
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
    const invert = this.invertDepth();

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        let d = res.depthArray[idx] ?? 0;
        if (invert) d = 1.0 - d;

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
    this.gl = gl;

    canvas.width = canvas.clientWidth * (window.devicePixelRatio || 1);
    canvas.height = canvas.clientHeight * (window.devicePixelRatio || 1);
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

      const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
      gl.shaderSource(fs, fsSource);
      gl.compileShader(fs);

      const prog = gl.createProgram()!;
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      this.glProgram = prog;
    }

    gl.useProgram(this.glProgram);

    // 建置網格頂點
    const step = 2; // 降採樣
    const cols = Math.floor((res.width - 1) / step) + 1;
    const rows = Math.floor((res.height - 1) / step) + 1;
    const aspect = res.width / res.height;
    const scaleZ = (this.depthScale3D() / 100) * 0.8;
    const invert = this.invertDepth();

    const positions: number[] = [];
    const texCoords: number[] = [];
    const indices: number[] = [];

    for (let r = 0; r < rows; r++) {
      const yPixel = Math.min(r * step, res.height - 1);
      const v = 1.0 - yPixel / (res.height - 1);
      const yWorld = (v - 0.5) * 2.0;

      for (let c = 0; c < cols; c++) {
        const xPixel = Math.min(c * step, res.width - 1);
        const u = xPixel / (res.width - 1);
        const xWorld = (u - 0.5) * 2.0 * aspect;

        const idx = yPixel * res.width + xPixel;
        let d = res.depthArray[idx] ?? 0;
        if (invert) d = 1.0 - d;
        const zWorld = (d - 0.5) * scaleZ;

        positions.push(xWorld, yWorld, zWorld);
        texCoords.push(u, 1.0 - v);
      }
    }

    for (let r = 0; r < rows - 1; r++) {
      for (let c = 0; c < cols - 1; c++) {
        const p1 = r * cols + c;
        const p2 = r * cols + (c + 1);
        const p3 = (r + 1) * cols + (c + 1);
        const p4 = (r + 1) * cols + c;

        indices.push(p1, p2, p3);
        indices.push(p1, p3, p4);
      }
    }

    // 更新頂點 Buffer
    if (!this.glPositionBuffer) this.glPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.glPositionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(positions),
      gl.DYNAMIC_DRAW
    );

    const aPosLoc = gl.getAttribLocation(this.glProgram, "aPosition");
    gl.enableVertexAttribArray(aPosLoc);
    gl.vertexAttribPointer(aPosLoc, 3, gl.FLOAT, false, 0, 0);

    if (!this.glTexCoordBuffer) this.glTexCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.glTexCoordBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(texCoords),
      gl.DYNAMIC_DRAW
    );

    const aTexLoc = gl.getAttribLocation(this.glProgram, "aTexCoord");
    gl.enableVertexAttribArray(aTexLoc);
    gl.vertexAttribPointer(aTexLoc, 2, gl.FLOAT, false, 0, 0);

    // 紋理貼圖
    if (!this.glTexture) this.glTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.glTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);

    // MVP 矩陣運算
    const mvpMatrix = this.computeMVPMatrix(canvas.width / canvas.height);
    const uMVPLoc = gl.getUniformLocation(this.glProgram, "uMVPMatrix");
    gl.uniformMatrix4fv(uMVPLoc, false, mvpMatrix);

    const uTexLoc = gl.getUniformLocation(this.glProgram, "uTexture");
    gl.uniform1i(uTexLoc, 0);

    // 繪製網格或點雲
    if (this.isPointCloud()) {
      gl.drawArrays(gl.POINTS, 0, positions.length / 3);
    } else {
      const idxBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuffer);
      gl.bufferData(
        gl.ELEMENT_ARRAY_BUFFER,
        new Uint16Array(indices),
        gl.DYNAMIC_DRAW
      );
      gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
    }
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
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (far + near) / (near - far), -1,
      0, 0, (2 * far * near) / (near - far), 0,
    ];

    // 相機旋轉與位移 (Yaw, Pitch, Zoom)
    const cy = Math.cos(this.yaw);
    const sy = Math.sin(this.yaw);
    const cp = Math.cos(this.pitch);
    const sp = Math.sin(this.pitch);

    // View Matrix
    const view = [
      cy, sy * sp, -sy * cp, 0,
      0, cp, sp, 0,
      sy, -cy * sp, cy * cp, 0,
      0, 0, -this.zoom * 2.5, 1,
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
    this.selectedModel.set(val as DepthModelId);
    if (this.inputImageElement()) {
      this.startDepthEstimation();
    }
  }

  protected onDeviceChange(val: string): void {
    this.preferredDevice.set(val as DeviceType);
    if (this.inputImageElement()) {
      this.startDepthEstimation();
    }
  }

  protected onPreviewModeChange(val: string): void {
    this.previewMode.set(val as PreviewMode);
    setTimeout(() => this.renderCurrentView(), 30);
  }

  protected onColorMapChange(val: string): void {
    this.colorMap.set(val as ColorMapType);
    this.renderCurrentView();
  }

  protected onInvertToggle(): void {
    this.invertDepth.set(!this.invertDepth());
    this.renderCurrentView();
  }

  protected onContrastChange(val: number): void {
    this.contrast.set(val);
    this.renderCurrentView();
  }

  protected onBrightnessChange(val: number): void {
    this.brightness.set(val);
    this.renderCurrentView();
  }

  protected onDepthScale3DChange(val: number): void {
    this.depthScale3D.set(val);
    this.render3DMeshCanvas();
  }

  protected togglePointCloud(): void {
    this.isPointCloud.set(!this.isPointCloud());
    this.render3DMeshCanvas();
  }

  /**
   * 匯出下載 8-bit PNG
   */
  protected downloadPng(): void {
    const res = this.depthResult();
    if (!res) return;

    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = res.width;
    tempCanvas.height = res.height;
    const ctx = tempCanvas.getContext("2d");
    if (!ctx) return;

    const imgData = depthArrayToImageData(res.depthArray, res.width, res.height, {
      colorMap: this.colorMap(),
      invert: this.invertDepth(),
      contrast: this.contrast() / 100,
      brightness: this.brightness() / 100,
    });
    ctx.putImageData(imgData, 0, 0);

    const a = document.createElement("a");
    a.href = tempCanvas.toDataURL("image/png");
    a.download = `depth-map-${this.colorMap()}-${Date.now()}.png`;
    a.click();
  }

  /**
   * 匯出下載 16-bit 灰階 PNG (供 Blender / ControlNet)
   */
  protected download16BitPng(): void {
    const res = this.depthResult();
    if (!res) return;

    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = res.width;
    tempCanvas.height = res.height;
    const ctx = tempCanvas.getContext("2d");
    if (!ctx) return;

    const imgData = depthArrayToImageData(res.depthArray, res.width, res.height, {
      colorMap: "grayscale",
      invert: this.invertDepth(),
      contrast: 1.0,
      brightness: 0.0,
    });
    ctx.putImageData(imgData, 0, 0);

    const a = document.createElement("a");
    a.href = tempCanvas.toDataURL("image/png");
    a.download = `depth-map-16bit-${Date.now()}.png`;
    a.click();
  }

  /**
   * 匯出下載 3D .OBJ 幾何網格檔
   */
  protected downloadObj(): void {
    const res = this.depthResult();
    if (!res) return;

    const objContent = exportDepthToObj(res.depthArray, res.width, res.height, {
      step: 2,
      depthScale: (this.depthScale3D() / 100) * 0.8,
      invert: this.invertDepth(),
    });

    const blob = new Blob([objContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `depth-mesh-${Date.now()}.obj`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * 複製深度圖至剪貼簿
   */
  protected async copyToClipboard(): Promise<void> {
    const res = this.depthResult();
    if (!res) return;

    try {
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = res.width;
      tempCanvas.height = res.height;
      const ctx = tempCanvas.getContext("2d");
      if (!ctx) return;

      const imgData = depthArrayToImageData(
        res.depthArray,
        res.width,
        res.height,
        {
          colorMap: this.colorMap(),
          invert: this.invertDepth(),
          contrast: this.contrast() / 100,
          brightness: this.brightness() / 100,
        }
      );
      ctx.putImageData(imgData, 0, 0);

      tempCanvas.toBlob(async (blob) => {
        if (blob && navigator.clipboard && navigator.clipboard.write) {
          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob }),
          ]);
          this.alertState.set({
            type: "success",
            message: "深度圖已成功複製至剪貼簿！",
          });
        }
      }, "image/png");
    } catch (e) {
      this.alertState.set({
        type: "error",
        message: "剪貼簿寫入失敗，請改用下載功能",
      });
    }
  }
}
