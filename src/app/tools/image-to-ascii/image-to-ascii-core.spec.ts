import { describe, it, expect, vi } from "vitest";
import {
  convertImageToAscii,
  generateTsCode,
  type ConvertOptions,
} from "./image-to-ascii-core";

describe("ImageToAscii Core 核心演算法", () => {
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
