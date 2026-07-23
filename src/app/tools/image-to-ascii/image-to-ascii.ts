import { Component, signal, computed, effect, viewChild, ElementRef } from "@angular/core";
import { CommonModule } from "@angular/common";
import { convertImageToAscii, generateTsCode, ConvertResult } from "./image-to-ascii-core";
import { ToolSlider } from "../../shared/ui/tool-slider/tool-slider";
import { ToolRadioGroup, RadioOption } from "../../shared/ui/tool-radio-group/tool-radio-group";
import { ToolAlert } from "../../shared/ui/tool-alert/tool-alert";
import { ToolBreadcrumb } from "../../shared/ui/tool-breadcrumb/tool-breadcrumb";
import { ToolHeader } from "../../shared/ui/tool-header/tool-header";
import { ToolPanel } from "../../shared/ui/tool-panel/tool-panel";

// 我們元件內部渲染器，與導出播放器的畫圖邏輯相同
function renderAsciiInComponent(
  canvas: HTMLCanvasElement,
  result: ConvertResult,
  options: {
    colorMode: 'monochrome' | 'retro-green' | 'retro-amber' | 'original';
    animationType: 'none' | 'typewriter' | 'matrix' | 'jitter';
    scanlines: boolean;
    flicker: boolean;
  }
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const safeCtx = ctx;

  const fontSize = 12;
  const charWidth = fontSize * 0.6;
  const charHeight = fontSize;

  const displayWidth = result.width * charWidth;
  const displayHeight = result.height * charHeight;

  // 設定 Canvas 設計尺寸（防鋸齒、高 DPI）
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width = `${displayWidth}px`;
  canvas.style.height = `${displayHeight}px`;
  canvas.width = displayWidth * dpr;
  canvas.height = displayHeight * dpr;

  safeCtx.scale(dpr, dpr);
  safeCtx.textBaseline = 'top';
  safeCtx.font = `${fontSize}px VT323, "IBM Plex Mono", "Courier New", monospace`;

  let textColor = '#e6f1ff'; // 預設白金色
  if (options.colorMode === 'retro-green') {
    textColor = '#3fe0c5'; // 復古薄荷綠
  } else if (options.colorMode === 'retro-amber') {
    textColor = '#f1b434'; // 復古琥珀色
  }

  let animationId: number;
  let lastTime = 0;
  const fps = 30;
  const frameInterval = 1000 / fps;

  // 動畫狀態
  let typewriterIndex = 0;
  const totalChars = result.width * result.height;

  const matrixProgress = new Float32Array(result.width);
  for (let x = 0; x < result.width; x++) {
    matrixProgress[x] = -Math.floor(Math.random() * result.height);
  }

  let isDestroyed = false;

  // 預先處理調色盤顏色以利 original 彩色模式渲染
  let palette: string[] = [];
  let colorIndices: number[] = [];
  if (result.colors && options.colorMode === 'original') {
    const paletteMap = new Map<string, number>();
    for (const color of result.colors) {
      let idx = paletteMap.get(color);
      if (idx === undefined) {
        idx = palette.length;
        palette.push(color);
        paletteMap.set(color, idx);
      }
      colorIndices.push(idx);
    }
  }

  function draw(timestamp: number) {
    if (isDestroyed) return;

    animationId = requestAnimationFrame(draw);

    if (timestamp - lastTime < frameInterval) return;
    lastTime = timestamp;

    // 清除背景 (CRT Dark Navy 0a1a2f)
    safeCtx.fillStyle = '#0a1a2f';
    safeCtx.fillRect(0, 0, displayWidth, displayHeight);

    // 繪製 ASCII
    for (let y = 0; y < result.height; y++) {
      for (let x = 0; x < result.width; x++) {
        const charIdx = y * result.width + x;
        const char = result.chars[charIdx] || ' ';

        if (char === ' ') continue;

        let shouldDraw = true;
        let opacity = 1.0;

        if (options.animationType === 'typewriter') {
          shouldDraw = charIdx <= typewriterIndex;
        } else if (options.animationType === 'matrix') {
          const dropY = matrixProgress[x];
          if (y > dropY) {
            shouldDraw = false;
          } else {
            const dist = dropY - y;
            if (dist > 15) {
              shouldDraw = false;
            } else {
              opacity = Math.max(0.1, 1.0 - dist / 15);
            }
          }
        }

        if (!shouldDraw) continue;

        let renderX = x * charWidth;
        let renderY = y * charHeight;

        if (options.animationType === 'jitter') {
          renderX += (Math.random() - 0.5) * 0.8;
          renderY += (Math.random() - 0.5) * 0.8;
        }

        let fillStyle = textColor;
        if (options.colorMode === 'original' && result.colors) {
          const colorIdx = colorIndices[charIdx];
          fillStyle = palette[colorIdx] || '#ffffff';
        }

        if (opacity < 1.0) {
          safeCtx.save();
          safeCtx.globalAlpha = opacity;
        }

        safeCtx.fillStyle = fillStyle;
        safeCtx.fillText(char, renderX, renderY);

        if (opacity < 1.0) {
          safeCtx.restore();
        }
      }
    }

    // 更新狀態
    if (options.animationType === 'typewriter') {
      typewriterIndex = Math.min(totalChars, typewriterIndex + Math.ceil(totalChars / 150));
    } else if (options.animationType === 'matrix') {
      for (let x = 0; x < result.width; x++) {
        matrixProgress[x] += 0.5;
        if (matrixProgress[x] - 15 > result.height) {
          matrixProgress[x] = -Math.floor(Math.random() * 10);
        }
      }
    }

    // 繪製 CRT 掃描線
    if (options.scanlines) {
      safeCtx.fillStyle = 'rgba(63, 224, 197, 0.05)';
      for (let y = 0; y < displayHeight; y += 4) {
        safeCtx.fillRect(0, y, displayWidth, 1.5);
      }
    }

    // 繪製 CRT 閃爍
    if (options.flicker && Math.random() < 0.15) {
      safeCtx.fillStyle = 'rgba(63, 224, 197, 0.02)';
      safeCtx.fillRect(0, 0, displayWidth, displayHeight);
    }
  }

  animationId = requestAnimationFrame(draw);

  return {
    destroy: () => {
      isDestroyed = true;
      cancelAnimationFrame(animationId);
    }
  };
}

@Component({
  selector: "app-image-to-ascii",
  imports: [
    CommonModule,
    ToolSlider,
    ToolRadioGroup,
    ToolAlert,
    ToolBreadcrumb,
    ToolHeader,
    ToolPanel
  ],
  templateUrl: "./image-to-ascii.html",
  styleUrl: "./image-to-ascii.css",
  host: {
    class: "d:block font-family:var(--font-mono) color:var(--ink)",
  },
})
export class ImageToAscii {
  // UI DOM 引用
  private readonly previewCanvas = viewChild<ElementRef<HTMLCanvasElement>>("previewCanvas");
  protected readonly charsetScrollContainer = viewChild<ElementRef<HTMLDivElement>>("charsetScrollContainer");
  protected readonly colorScrollContainer = viewChild<ElementRef<HTMLDivElement>>("colorScrollContainer");
  protected readonly animScrollContainer = viewChild<ElementRef<HTMLDivElement>>("animScrollContainer");

  // 滾動狀態控制
  protected readonly charsetScroll = signal({ showLeft: false, showRight: false, hasScroll: false });
  protected readonly colorScroll = signal({ showLeft: false, showRight: false, hasScroll: false });
  protected readonly animScroll = signal({ showLeft: false, showRight: false, hasScroll: false });

  // 使用者上傳與狀態控制
  protected readonly uploadedImage = signal<string | null>(null);
  protected readonly isDragging = signal<boolean>(false);
  protected readonly errorMessage = signal<string>("");
  protected readonly successMessage = signal<string>("");
  protected readonly activeTab = signal<'preview' | 'code'>('preview');
  protected readonly showSettings = signal<boolean>(true);

  // 控制參數 (Signals)
  protected readonly charWidth = signal<number>(80);
  protected readonly selectedCharSetType = signal<string>('standard');
  protected readonly customCharSet = signal<string>('@#W$9876543210?!abc;:+=-,._ ');
  protected readonly dither = signal<boolean>(true);
  protected readonly contrast = signal<number>(0);
  protected readonly brightness = signal<number>(0);

  // 色彩與動畫預覽參數 (Signals)
  protected readonly colorMode = signal<'monochrome' | 'retro-green' | 'retro-amber' | 'original'>('retro-green');
  protected readonly animationType = signal<'none' | 'typewriter' | 'matrix' | 'jitter'>('none');
  protected readonly scanlines = signal<boolean>(true);
  protected readonly flicker = signal<boolean>(false);

  // 內部圖片快取，當上傳後在隱屏建立 Canvas 繪圖
  private readonly sourceCanvasSignal = signal<HTMLCanvasElement | null>(null);
  private activePlayer: { destroy: () => void } | null = null;

  // 預設字元集
  protected readonly charSetOptions = [
    { id: 'standard', label: '標準', value: '@#W$9876543210?!abc;:+=-,._ ' },
    { id: 'minimal', label: '極簡', value: '#+- ' },
    { id: 'binary', label: '二進位', value: '01 ' },
    { id: 'chinese', label: '漢字', value: '█田口甲十卜人一 ' },
    { id: 'blocks', label: '區塊', value: '█▓▒░ ' },
    { id: 'custom', label: '自定義', value: '' }
  ];

  protected readonly charSetRadioOptions: RadioOption[] = [
    { value: 'standard', label: '標準' },
    { value: 'minimal', label: '極簡' },
    { value: 'binary', label: '二進位' },
    { value: 'chinese', label: '漢字' },
    { value: 'blocks', label: '區塊' },
    { value: 'custom', label: '自定義' }
  ];

  protected readonly colorModeOptions: RadioOption[] = [
    { value: 'monochrome', label: '黑白' },
    { value: 'retro-green', label: '綠色' },
    { value: 'retro-amber', label: '琥珀色' },
    { value: 'original', label: '原色' }
  ];

  protected readonly animationOptions: RadioOption[] = [
    { value: 'none', label: '無動畫' },
    { value: 'typewriter', label: '打字機' },
    { value: 'matrix', label: '矩陣雨' },
    { value: 'jitter', label: '微幅抖動' }
  ];

  constructor() {
    // 預覽重繪的響應式 Effect
    effect(() => {
      const result = this.asciiResult();
      const canvas = this.previewCanvas()?.nativeElement;

      if (this.activePlayer) {
        this.activePlayer.destroy();
        this.activePlayer = null;
      }

      if (!result || !canvas) return;

      const player = renderAsciiInComponent(canvas, result, {
        colorMode: this.colorMode(),
        animationType: this.animationType(),
        scanlines: this.scanlines(),
        flicker: this.flicker(),
      });

      if (player) {
        this.activePlayer = player;
      }
    });

    // 當選單參數、選項或顯示狀態變更時，初始偵測滾動遮罩狀態
    effect(() => {
      // 訂閱可能會改變 DOM 選項長度的訊號
      this.selectedCharSetType();
      this.colorMode();
      this.animationType();

      if (this.showSettings()) {
        setTimeout(() => this.checkAllScrolls(), 150);
      }
    });
  }

  // 切換設定面板的顯示狀態，這會觸發上面的 effect 進而自動進行檢測
  protected toggleSettings(): void {
    this.showSettings.set(!this.showSettings());
  }

  // 檢測橫向滾動容器狀態並更新遮罩 Signal
  protected updateScrollState(el: HTMLDivElement, type: 'charset' | 'color' | 'anim'): void {
    const hasScroll = el.scrollWidth > el.clientWidth;
    // 捲軸大於 2px 表示已向右滾動，此時需要顯示左邊漸隱遮罩
    const showLeft = hasScroll && el.scrollLeft > 2;
    // 捲軸加上可視寬度若小於總寬度 2px 表示未達最右邊，此時需要顯示右邊漸隱遮罩
    const showRight = hasScroll && (el.scrollLeft + el.clientWidth < el.scrollWidth - 2);

    const state = { showLeft, showRight, hasScroll };
    if (type === 'charset') this.charsetScroll.set(state);
    if (type === 'color') this.colorScroll.set(state);
    if (type === 'anim') this.animScroll.set(state);
  }

  // 處理滾動事件
  protected onScroll(event: Event, type: 'charset' | 'color' | 'anim'): void {
    const el = event.target as HTMLDivElement;
    this.updateScrollState(el, type);
  }

  // 一鍵檢測所有滾動容器
  protected checkAllScrolls(): void {
    const charsetEl = this.charsetScrollContainer()?.nativeElement;
    const colorEl = this.colorScrollContainer()?.nativeElement;
    const animEl = this.animScrollContainer()?.nativeElement;

    if (charsetEl) this.updateScrollState(charsetEl, 'charset');
    if (colorEl) this.updateScrollState(colorEl, 'color');
    if (animEl) this.updateScrollState(animEl, 'anim');
  }

  protected onColorModeChange(mode: string): void {
    this.colorMode.set(mode as 'monochrome' | 'retro-green' | 'retro-amber' | 'original');
  }

  protected onAnimationTypeChange(type: string): void {
    this.animationType.set(type as 'none' | 'typewriter' | 'matrix' | 'jitter');
  }

  // 取得當前有效的字元集字串
  protected getCharSetString(): string {
    const type = this.selectedCharSetType();
    if (type === 'custom') {
      return this.customCharSet() || ' ';
    }
    const option = this.charSetOptions.find(o => o.id === type);
    return option ? option.value : '@#W$9876543210?!abc;:+=-,._ ';
  }

  // 計算轉換後的 ASCII 結果
  protected readonly asciiResult = computed<ConvertResult | null>(() => {
    const sourceCanvas = this.sourceCanvasSignal();
    if (!sourceCanvas) return null;

    const charSet = this.getCharSetString();
    return convertImageToAscii(sourceCanvas, {
      width: this.charWidth(),
      charSet: charSet,
      dither: this.dither(),
      contrast: this.contrast(),
      brightness: this.brightness(),
      colorMode: this.colorMode(),
      charAspectRatio: 0.55
    });
  });

  // 計算生成的 TS 導出代碼
  protected readonly generatedTsCode = computed<string>(() => {
    const result = this.asciiResult();
    if (!result) return "";

    return generateTsCode(result, {
      colorMode: this.colorMode(),
      animationType: this.animationType(),
      scanlines: this.scanlines(),
      flicker: this.flicker(),
    });
  });

  // 選擇預設字元集
  protected selectCharSetType(typeId: string): void {
    this.selectedCharSetType.set(typeId);
    if (typeId !== 'custom') {
      const option = this.charSetOptions.find(o => o.id === typeId);
      if (option) {
        this.customCharSet.set(option.value);
      }
    }
  }

  // 處理自訂字元集輸入
  protected onCustomCharSetInput(val: string): void {
    this.customCharSet.set(val);
  }

  // 處理拖放與上傳
  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(true);
  }

  protected onDragLeave(): void {
    this.isDragging.set(false);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
    this.errorMessage.set("");
    this.successMessage.set("");

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFile(files[0]);
    }
  }

  protected onFileSelected(event: Event): void {
    this.errorMessage.set("");
    this.successMessage.set("");
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (files && files.length > 0) {
      this.handleFile(files[0]);
    }
  }

  private handleFile(file: File): void {
    if (!file.type.startsWith("image/")) {
      this.errorMessage.set("不支援的檔案格式，請上傳 PNG 或 JPG 圖片檔案。");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      this.uploadedImage.set(dataUrl);

      // 加載圖片並轉為 Canvas ImageData
      const img = new Image();
      img.onload = () => {
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        const ctx = tempCanvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          this.sourceCanvasSignal.set(tempCanvas);
        } else {
          this.errorMessage.set("無法讀取圖片畫素資訊。");
        }
      };
      img.onerror = () => {
        this.errorMessage.set("圖片載入失敗。");
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }

  // 複製 TypeScript 代碼
  protected async copyCode(): Promise<void> {
    const code = this.generatedTsCode();
    if (!code) return;

    try {
      if (!navigator.clipboard || typeof navigator.clipboard.writeText !== "function") {
        throw new Error("Clipboard API not supported");
      }
      await navigator.clipboard.writeText(code);
      this.successMessage.set("TS 代碼已成功複製到剪貼簿！");
      setTimeout(() => this.successMessage.set(""), 3000);
    } catch (err) {
      this.errorMessage.set("複製失敗，請手動複製右方文字框內容。");
      setTimeout(() => this.errorMessage.set(""), 3000);
    }
  }

  // 下載 .ts 檔案
  protected downloadTsFile(): void {
    const code = this.generatedTsCode();
    if (!code) return;

    const blob = new Blob([code], { type: "text/typescript;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "ascii-image.ts";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // 清除當前上傳的圖片
  protected clearImage(): void {
    this.uploadedImage.set(null);
    this.sourceCanvasSignal.set(null);
    this.errorMessage.set("");
    this.successMessage.set("");
    this.showSettings.set(true);
    if (this.activePlayer) {
      this.activePlayer.destroy();
      this.activePlayer = null;
    }
  }
}
