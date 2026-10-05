import { describe, it, expect, vi } from "vitest";
import ts from "typescript";
import {
  convertImageToAscii,
  DEFAULT_CHAR_ASPECT_RATIO,
  generateTsCode,
  type ConvertOptions,
} from "./image-to-ascii-core";

describe("ImageToAscii Core 核心演算法", () => {
  it.each([
    "@#W$9876543210?!abc;:+=-,._ ",
    "#+- ",
    "01 ",
    "█田口甲十卜人一 ",
    "█▓▒░ ",
    "👾田 ",
  ])("內建與自訂字元集 %s 都預設正像，反相恢復暗部密集", (charSet) => {
    const context = vi
      .spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockReturnValue({
        drawImage: vi.fn(),
        getImageData: () => ({
          data: new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 255]),
        }),
      } as unknown as CanvasRenderingContext2D);
    try {
      for (const dither of [false, true]) {
        const options: ConvertOptions = {
          width: 2,
          charSet,
          dither,
          contrast: 0,
          brightness: 0,
          colorMode: "original",
          charAspectRatio: 0.6,
        };
        const source = { width: 2, height: 1 } as HTMLCanvasElement;
        const positive = convertImageToAscii(source, options);
        const negative = convertImageToAscii(source, {
          ...options,
          invert: true,
        });
        const dense = [
          ...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(
            charSet,
          ),
        ][0].segment;
        expect(positive.chars).toEqual([" ", dense]);
        expect(negative.chars).toEqual([dense, " "]);
        expect(positive.colors).toEqual(["#000000", "#ffffff"]);
        expect(negative.colors).toEqual(positive.colors);
      }
    } finally {
      context.mockRestore();
    }
  });

  it.each([false, true])(
    "灰階的正反像保留同一誤差擴散：invert=%s",
    (invert) => {
      const data = new Uint8ClampedArray(8 * 4);
      for (let i = 0; i < 8; i++) data.set([96, 96, 96, 255], i * 4);
      const context = vi
        .spyOn(HTMLCanvasElement.prototype, "getContext")
        .mockReturnValue({
          drawImage: vi.fn(),
          getImageData: () => ({ data }),
        } as unknown as CanvasRenderingContext2D);
      try {
        const options: ConvertOptions = {
          width: 8,
          charSet: "@ ",
          dither: true,
          invert,
          contrast: 0,
          brightness: 0,
          colorMode: "monochrome",
          charAspectRatio: 1,
        };
        const source = { width: 8, height: 1 } as HTMLCanvasElement;
        expect(convertImageToAscii(source, options).chars.join("")).toBe(
          invert ? "@ @@ @@ " : " @  @  @",
        );
        expect(
          convertImageToAscii(source, { ...options, dither: false }).chars.join(
            "",
          ),
        ).toBe(invert ? "@@@@@@@@" : "        ");
      } finally {
        context.mockRestore();
      }
    },
  );

  it.each([false, true])(
    "匯出播放器保留轉換方向與原色：invert=%s",
    (invert) => {
      const context = vi
        .spyOn(HTMLCanvasElement.prototype, "getContext")
        .mockReturnValue({
          drawImage: vi.fn(),
          getImageData: () => ({
            data: new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 255]),
          }),
        } as unknown as CanvasRenderingContext2D);
      try {
        const result = convertImageToAscii(
          { width: 2, height: 1 } as HTMLCanvasElement,
          {
            width: 2,
            charSet: "@ ",
            dither: true,
            invert,
            contrast: 0,
            brightness: 0,
            colorMode: "original",
            charAspectRatio: 0.5,
          },
        );
        const code = generateTsCode(result, {
          colorMode: "original",
          animationType: "none",
          scanlines: false,
          flicker: false,
        });
        const javascript = ts.transpileModule(code, {
          compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2022,
          },
        }).outputText;
        const runtime = {} as {
          ASCII_ROWS: string[][];
          renderAscii: (canvas: HTMLCanvasElement) => { destroy: () => void };
        };
        new Function("exports", javascript)(runtime);
        expect(runtime.ASCII_ROWS).toEqual([invert ? ["@", " "] : [" ", "@"]]);
        const drawn: { glyph: string; x: number; color: string }[] = [];
        const drawing = {
          scale: vi.fn(),
          fillRect: vi.fn(),
          fillStyle: "",
          fillText(glyph: string, x: number) {
            drawn.push({ glyph, x, color: this.fillStyle });
          },
        };
        const player = runtime.renderAscii({
          style: {},
          getContext: () => drawing,
        } as unknown as HTMLCanvasElement);
        expect(drawn).toEqual([
          {
            glyph: "@",
            x: invert ? 0 : 6,
            color: invert ? "#000000" : "#ffffff",
          },
        ]);
        player.destroy();
      } finally {
        context.mockRestore();
      }
    },
  );

  it.each([false, true])(
    "透明 glyph 覆寫不改變相鄰畫素的誤差擴散：invert=%s",
    (invert) => {
      const data = new Uint8ClampedArray([
        96, 96, 96, 255, 0, 0, 0, 0, 96, 96, 96, 255, 96, 96, 96, 255, 96, 96,
        96, 255, 96, 96, 96, 255,
      ]);
      const context = vi
        .spyOn(HTMLCanvasElement.prototype, "getContext")
        .mockReturnValue({
          drawImage: vi.fn(),
          getImageData: () => ({ data }),
        } as unknown as CanvasRenderingContext2D);
      try {
        const source = { width: 6, height: 1 } as HTMLCanvasElement;
        const options: ConvertOptions = {
          width: 6,
          charSet: "@. ",
          dither: true,
          invert,
          contrast: -40,
          brightness: -20,
          colorMode: "original",
          charAspectRatio: 1,
        };
        const transparent = convertImageToAscii(source, options);
        data.set([255, 255, 255, 255], 4);
        const white = convertImageToAscii(source, options);
        expect(transparent.chars[1]).toBe(" ");
        expect(transparent.chars.filter((_, index) => index !== 1)).toEqual(
          white.chars.filter((_, index) => index !== 1),
        );
        expect(transparent.colors).toEqual(white.colors);
      } finally {
        context.mockRestore();
      }
    },
  );

  it("產出的播放器通過 strict TypeScript 並保留靜態畫面與 destroy 行為", () => {
    const code = generateTsCode(
      { width: 2, height: 1, chars: ["👾", "@"], charAspectRatio: 0.5 },
      {
        colorMode: "monochrome",
        animationType: "none",
        scanlines: false,
        flicker: false,
      },
    );
    const compilerOptions: ts.CompilerOptions = {
      strict: true,
      noEmit: true,
      skipLibCheck: true,
      types: [],
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    };
    const host = ts.createCompilerHost(compilerOptions);
    const getSourceFile = host.getSourceFile.bind(host);
    host.getSourceFile = (
      name,
      languageVersion,
      onError,
      shouldCreateNewSourceFile,
    ) =>
      name === "/generated-ascii.ts"
        ? ts.createSourceFile(name, code, languageVersion, true)
        : getSourceFile(
            name,
            languageVersion,
            onError,
            shouldCreateNewSourceFile,
          );
    const program = ts.createProgram(
      ["/generated-ascii.ts"],
      compilerOptions,
      host,
    );
    expect(
      ts
        .getPreEmitDiagnostics(program)
        .map((diagnostic) =>
          ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
        ),
    ).toEqual([]);

    const javascript = ts.transpileModule(code, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText;
    const runtime = {} as {
      renderAscii: (
        canvas: HTMLCanvasElement,
        options?: { animationType?: string; flicker?: boolean },
      ) => { destroy: () => void };
    };
    new Function("exports", javascript)(runtime);
    const context = { scale: vi.fn(), fillRect: vi.fn(), fillText: vi.fn() };
    const canvas = {
      style: {},
      getContext: () => context,
    } as unknown as HTMLCanvasElement;
    const raf = vi
      .spyOn(globalThis, "requestAnimationFrame")
      .mockReturnValue(17);
    const cancel = vi
      .spyOn(globalThis, "cancelAnimationFrame")
      .mockImplementation(() => {});
    try {
      const staticPlayer = runtime.renderAscii(canvas);
      expect(canvas.style.width).toBe("12px");
      expect(canvas.style.height).toBe("12px");
      expect(context.fillText.mock.calls.map((call) => call[0])).toEqual([
        "👾",
        "@",
      ]);
      expect(context.fillText.mock.calls).toEqual([
        ["👾", 0, 0, 6],
        ["@", 6, 0, 6],
      ]);
      expect(raf).not.toHaveBeenCalled();
      staticPlayer.destroy();
      const animatedPlayer = runtime.renderAscii(canvas, {
        animationType: "jitter",
      });
      expect(raf).toHaveBeenCalledOnce();
      animatedPlayer.destroy();
      expect(cancel).toHaveBeenCalledWith(17);
      raf.mockClear();
      const flickerPlayer = runtime.renderAscii(canvas, { flicker: true });
      expect(raf).toHaveBeenCalledOnce();
      flickerPlayer.destroy();
    } finally {
      raf.mockRestore();
      cancel.mockRestore();
    }
  });

  it("正方形來源的取樣與播放器字格比例相同", () => {
    const context = vi
      .spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockReturnValue({
        drawImage: vi.fn(),
        getImageData: (
          _x: number,
          _y: number,
          width: number,
          height: number,
        ) => ({
          data: new Uint8ClampedArray(width * height * 4),
        }),
      } as unknown as CanvasRenderingContext2D);
    try {
      const result = convertImageToAscii(
        { width: 80, height: 80 } as HTMLCanvasElement,
        {
          width: 80,
          charSet: "@ ",
          dither: false,
          contrast: 0,
          brightness: 0,
          colorMode: "monochrome",
          charAspectRatio: DEFAULT_CHAR_ASPECT_RATIO,
        },
      );
      expect(result.charAspectRatio).toBe(DEFAULT_CHAR_ASPECT_RATIO);
      expect(result.width * result.charAspectRatio!).toBe(result.height);
    } finally {
      context.mockRestore();
    }
  });

  it.each([false, true])(
    "dither=%s 應保留字元、原色與半透明合成品質",
    (dither) => {
      const context = vi
        .spyOn(HTMLCanvasElement.prototype, "getContext")
        .mockReturnValue({
          drawImage: vi.fn(),
          getImageData: () => ({
            data: new Uint8ClampedArray([
              0, 0, 0, 255, 128, 128, 128, 255, 255, 255, 255, 255, 255, 0, 0,
              128,
            ]),
          }),
        } as unknown as CanvasRenderingContext2D);
      try {
        const result = convertImageToAscii(
          { width: 4, height: 1 } as HTMLCanvasElement,
          {
            width: 4,
            charSet: "@. ",
            dither,
            contrast: 0,
            brightness: 0,
            colorMode: "original",
            charAspectRatio: 0.55,
          },
        );
        expect(result.chars).toEqual([" ", ".", "@", "."]);
        expect(result.colors).toEqual([
          "#000000",
          "#808080",
          "#ffffff",
          "#ff7f7f",
        ]);
      } finally {
        context.mockRestore();
      }
    },
  );

  it("應能正確生成包含 ASCII 資料與播放器的 TS 模組代碼", () => {
    const mockResult = {
      width: 4,
      height: 3,
      chars: ["@", "@", "#", "#", "$", "$", ".", ".", "?", "?", "!", "!"],
      colors: [
        "#000000",
        "#000000",
        "#ffffff",
        "#ffffff",
        "#000000",
        "#000000",
        "#ffffff",
        "#ffffff",
        "#000000",
        "#000000",
        "#ffffff",
        "#ffffff",
      ],
    };

    const code = generateTsCode(mockResult, {
      colorMode: "original",
      animationType: "matrix",
      scanlines: true,
      flicker: false,
    });

    expect(code).toContain("export const WIDTH = 4");
    expect(code).toContain("export const HEIGHT = 3");
    expect(code).toContain("export function renderAscii");
    expect(code).toContain("COLOR_DATA");
    expect(code).toContain("palette");
    expect(code).toContain("indices");
    expect(code).toContain("export const ASCII_ROWS: string[][]");
    expect(code).toContain("fps must be between 1 and 120");
    expect(code).toContain(
      "if (shouldAnimate) animationId = requestAnimationFrame(draw);",
    );
    expect(code).toContain("else draw(0);");
  });

  it("當非彩色模式時，generateTsCode 的 COLOR_DATA 應為 undefined", () => {
    const mockResult = {
      width: 4,
      height: 3,
      chars: ["@", "@", "#", "#", "$", "$", ".", ".", "?", "?", "!", "!"],
    };

    const code = generateTsCode(mockResult, {
      colorMode: "monochrome",
      animationType: "none",
      scanlines: false,
      flicker: false,
    });

    expect(code).toContain(
      "export const COLOR_DATA: { palette: string[]; indices: number[] } | undefined = undefined;",
    );
  });

  it("在不支援 Canvas 2D getContext 的環境下呼叫 convertImageToAscii 應拋出錯誤", () => {
    // 暫時將全域 prototype.getContext 設為回傳 null
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(null);

    const mockCanvas = {
      width: 10,
      height: 10,
    } as unknown as HTMLCanvasElement;

    const options: ConvertOptions = {
      width: 5,
      charSet: "@#.- ",
      dither: false,
      contrast: 0,
      brightness: 0,
      colorMode: "monochrome",
      charAspectRatio: 0.55,
    };

    try {
      expect(() => convertImageToAscii(mockCanvas, options)).toThrow();
    } finally {
      // 恢復原本的 getContext 避免影響其他測試
      HTMLCanvasElement.prototype.getContext = originalGetContext;
    }
  });

  it("單一 grapheme 字元集不應產生 undefined", () => {
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    const mockContext = {
      drawImage: vi.fn(),
      getImageData: vi.fn().mockReturnValue({
        data: new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 255]),
      }),
    };
    HTMLCanvasElement.prototype.getContext = vi
      .fn()
      .mockReturnValue(
        mockContext,
      ) as unknown as typeof HTMLCanvasElement.prototype.getContext;

    try {
      const result = convertImageToAscii(
        { width: 2, height: 1 } as HTMLCanvasElement,
        {
          width: 2,
          charSet: "👾",
          dither: true,
          contrast: 0,
          brightness: 0,
          colorMode: "monochrome",
          charAspectRatio: 0.55,
        },
      );

      expect(result.chars).toEqual(["👾", "👾"]);
      expect(result.chars.join("")).not.toContain("undefined");
    } finally {
      HTMLCanvasElement.prototype.getContext = originalGetContext;
    }
  });

  it.each([
    { invert: false, dither: false },
    { invert: false, dither: true },
    { invert: true, dither: false },
    { invert: true, dither: true },
  ])("全透明畫素保持空格：$invert / dither=$dither", ({ invert, dither }) => {
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    const mockContext = {
      drawImage: vi.fn(),
      getImageData: vi.fn().mockReturnValue({
        data: new Uint8ClampedArray([0, 0, 0, 0]),
      }),
    };
    HTMLCanvasElement.prototype.getContext = vi
      .fn()
      .mockReturnValue(
        mockContext,
      ) as unknown as typeof HTMLCanvasElement.prototype.getContext;

    try {
      const result = convertImageToAscii(
        { width: 1, height: 1 } as HTMLCanvasElement,
        {
          width: 1,
          charSet: "@ ",
          dither,
          invert,
          contrast: 0,
          brightness: 0,
          colorMode: "monochrome",
          charAspectRatio: 0.55,
        },
      );

      expect(result.chars).toEqual([" "]);
    } finally {
      HTMLCanvasElement.prototype.getContext = originalGetContext;
    }
  });

  it("空字元集應明確拒絕", () => {
    expect(() =>
      convertImageToAscii({ width: 1, height: 1 } as HTMLCanvasElement, {
        width: 1,
        charSet: "",
        dither: false,
        contrast: 0,
        brightness: 0,
        colorMode: "monochrome",
        charAspectRatio: 0.55,
      }),
    ).toThrow("至少需要 1 個 grapheme");
  });
});
