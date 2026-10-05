import { describe, it, expect, vi } from "vitest";
import ts from "typescript";
import {
  convertImageToAscii,
  generateTsCode,
  type ConvertOptions,
} from "./image-to-ascii-core";

describe("ImageToAscii Core 核心演算法", () => {
  it("產出的播放器通過 strict TypeScript 並保留靜態畫面與 destroy 行為", () => {
    const code = generateTsCode(
      { width: 2, height: 1, chars: ["👾", "@"] },
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
        options?: { animationType: string },
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
      expect(context.fillText.mock.calls.map((call) => call[0])).toEqual([
        "👾",
        "@",
      ]);
      expect(raf).not.toHaveBeenCalled();
      staticPlayer.destroy();
      const animatedPlayer = runtime.renderAscii(canvas, {
        animationType: "jitter",
      });
      expect(raf).toHaveBeenCalledOnce();
      animatedPlayer.destroy();
      expect(cancel).toHaveBeenCalledWith(17);
    } finally {
      raf.mockRestore();
      cancel.mockRestore();
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
        expect(result.chars).toEqual(["@", ".", " ", "."]);
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

  it("透明像素以白色背景合成，避免被誤判為黑色密集字元", () => {
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
          dither: false,
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
