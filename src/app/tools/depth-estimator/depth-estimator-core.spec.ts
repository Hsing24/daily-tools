import { describe, it, expect } from "vitest";
import { unzlibSync } from "fflate";
import {
  adjustDepthArray,
  normalizeModelDepth,
  getDepthColor,
  depthArrayToImageData,
  encodeGrayscalePng,
  detectGlbImageMimeType,
  exportDepthToGlb,
  exportDepthToObj,
  gaussianBlurDepthArray,
  generateSampleDepthMap,
  getSafePreviewGrid,
  prepareDepthForExport,
  resizeDepthArray,
} from "./depth-estimator-core";

describe("depth-estimator-core", () => {
  describe("model normalization", () => {
    it("preserves finite relative depth range and handles constant images", () => {
      const result = normalizeModelDepth(new Float32Array([2, 4, 6, 8]), 2, 2);
      expect(result.minDepth).toBe(2);
      expect(result.maxDepth).toBe(8);
      expect(result.depthArray[0]).toBe(0);
      expect(result.depthArray[3]).toBe(1);
      expect(
        normalizeModelDepth(new Float32Array([3, 3]), 2, 1).depthArray,
      ).toEqual(new Float32Array(2));
    });
    it.each([NaN, Infinity, -Infinity])(
      "rejects nonfinite output %s",
      (value) => {
        expect(() =>
          normalizeModelDepth(new Float32Array([0, value]), 2, 1),
        ).toThrow("無效數值");
      },
    );
    it("rejects incomplete tensors", () => {
      expect(() => normalizeModelDepth(new Float32Array([0]), 2, 2)).toThrow(
        "尺寸不符",
      );
    });
  });

  describe("getDepthColor", () => {
    it("should return grayscale values correctly", () => {
      const black = getDepthColor(0, "grayscale", false);
      expect(black).toEqual([0, 0, 0]);

      const white = getDepthColor(1, "grayscale", false);
      expect(white).toEqual([255, 255, 255]);

      const mid = getDepthColor(0.5, "grayscale", false);
      expect(mid[0]).toBeGreaterThan(120);
      expect(mid[0]).toBeLessThan(135);
      expect(mid[0]).toBe(mid[1]);
      expect(mid[1]).toBe(mid[2]);
    });

    it("should respect invert flag", () => {
      const invertedZero = getDepthColor(0, "grayscale", true);
      expect(invertedZero).toEqual([255, 255, 255]);

      const invertedOne = getDepthColor(1, "grayscale", true);
      expect(invertedOne).toEqual([0, 0, 0]);
    });

    it("should interpolate viridis colormap", () => {
      const c0 = getDepthColor(0, "viridis");
      expect(c0).toEqual([68, 1, 84]);

      const c1 = getDepthColor(1, "viridis");
      expect(c1).toEqual([253, 231, 37]);

      const mid = getDepthColor(0.5, "viridis");
      expect(mid.length).toBe(3);
      expect(mid[0]).toBeGreaterThan(0);
      expect(mid[1]).toBeGreaterThan(0);
      expect(mid[2]).toBeGreaterThan(0);
    });

    it("should clamp values out of [0, 1] range", () => {
      const low = getDepthColor(-1.5, "grayscale");
      expect(low).toEqual([0, 0, 0]);

      const high = getDepthColor(2.5, "grayscale");
      expect(high).toEqual([255, 255, 255]);
    });
  });

  describe("depthArrayToImageData", () => {
    it("should generate ImageData with correct dimensions and RGBA values", () => {
      const width = 4;
      const height = 4;
      const depthArray = new Float32Array([
        0.0, 0.2, 0.4, 0.6, 0.8, 1.0, 0.5, 0.3, 0.1, 0.9, 0.7, 0.2, 0.0, 0.4,
        0.8, 1.0,
      ]);

      const imgData = depthArrayToImageData(depthArray, width, height, {
        colorMap: "grayscale",
      });

      expect(imgData.width).toBe(4);
      expect(imgData.height).toBe(4);
      expect(imgData.data.length).toBe(4 * 4 * 4);

      // Check first pixel (0.0 depth -> black, alpha 255)
      expect(imgData.data[0]).toBe(0);
      expect(imgData.data[1]).toBe(0);
      expect(imgData.data[2]).toBe(0);
      expect(imgData.data[3]).toBe(255);

      // Check pixel at 1.0 depth -> white, alpha 255
      const idx1 = 5 * 4;
      expect(imgData.data[idx1]).toBe(255);
      expect(imgData.data[idx1 + 1]).toBe(255);
      expect(imgData.data[idx1 + 2]).toBe(255);
      expect(imgData.data[idx1 + 3]).toBe(255);
    });
  });

  describe("exportDepthToObj", () => {
    it("should generate valid OBJ mesh string", () => {
      const width = 4;
      const height = 4;
      const depthArray = new Float32Array(width * height).fill(0.5);

      const objStr = exportDepthToObj(depthArray, width, height, {
        step: 1,
        depthScale: 0.5,
      });

      expect(objStr).toContain("# Wavefront OBJ");
      expect(objStr).toContain("v ");
      expect(objStr).toContain("vt ");
      expect(objStr).toContain("f ");

      const lines = objStr.split("\n");
      const vLines = lines.filter((l) => l.startsWith("v "));
      const fLines = lines.filter((l) => l.startsWith("f "));

      // 4x4 grid has 16 vertices and 3x3x2 = 18 triangular faces
      expect(vLines.length).toBe(16);
      expect(fLines.length).toBe(18);
    });

    it.each([
      [1, 4],
      [4, 1],
      [1, 1],
    ])("exports %i×%i without nonfinite vertices", (width, height) => {
      const obj = exportDepthToObj(
        new Float32Array(width * height).fill(0.5),
        width,
        height,
      );
      expect(obj).not.toMatch(/NaN|Infinity/);
    });

    it("covers source edges and faces the camera in positive Z", () => {
      const obj = exportDepthToObj(
        new Float32Array([0, 0.5, 1, 0, 0.5, 1]),
        3,
        2,
        { step: 2, depthScale: 1 },
      );
      const lines = obj.split("\n");
      const vertices = lines
        .filter((line) => line.startsWith("v "))
        .map((line) => line.split(" ").slice(1).map(Number));
      const face = lines
        .find((line) => line.startsWith("f "))!
        .split(" ")
        .slice(1)
        .map((part) => Number(part.split("/")[0]) - 1);
      const [a, b, c] = face.map((index) => vertices[index]);
      const normalZ =
        (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
      expect(normalZ).toBeGreaterThan(0);
      expect(vertices[1][2]).toBe(1);
    });

    it("should preserve source aspect ratio with a bounded grid", () => {
      const objStr = exportDepthToObj(
        new Float32Array(384 * 384).fill(0.5),
        384,
        384,
        {
          maxGridDimension: 192,
          sourceDimensions: { width: 1600, height: 1000 },
        },
      );

      expect(objStr).toContain("# Dimensions: 1600x1000, Grid: 192x120");
      const vertices = objStr
        .split("\n")
        .filter((line) => line.startsWith("v "));
      const first = vertices[0]?.split(" ").map(Number) ?? [];
      const last = vertices.at(-1)?.split(" ").map(Number) ?? [];
      expect((last[1] ?? 0) - (first[1] ?? 0)).toBeCloseTo(3.2, 3);
      expect(Math.abs((last[2] ?? 0) - (first[2] ?? 0))).toBeCloseTo(2, 3);
    });
  });

  describe("depth export pipeline", () => {
    it("should resize float depth bilinearly without reducing it to 8-bit", () => {
      const output = resizeDepthArray(
        new Float32Array([0, 0.25, 0.75, 1]),
        2,
        2,
        4,
        4,
      );
      expect(output).toHaveLength(16);
      expect(new Set(output).size).toBeGreaterThan(4);
    });

    it("should bake numeric adjustments", () => {
      const output = adjustDepthArray(new Float32Array([0.25, 0.75]), {
        invert: true,
        contrast: 1,
        brightness: 0,
      });
      expect(output[0]).toBeCloseTo(0.75);
      expect(output[1]).toBeCloseTo(0.25);
    });

    it("should leave values unchanged when edge softening is zero", () => {
      const input = new Float32Array([0, 1, 0, 1]);
      expect(gaussianBlurDepthArray(input, 2, 2, 0)).toEqual(input);
    });

    it("should clamp edges while softening a hard boundary", () => {
      const input = new Float32Array(21).fill(1);
      input.fill(0, 0, 10);
      const output = gaussianBlurDepthArray(input, 21, 1, 3);
      expect(output[0]).toBeCloseTo(0, 3);
      expect(output[20]).toBeCloseTo(1, 3);
      expect(output[10]).toBeGreaterThan(0);
      expect(output[10]).toBeLessThan(1);
    });

    it("should restore requested source dimensions", () => {
      const output = prepareDepthForExport(
        new Float32Array(16).map((_, index) => index / 15),
        4,
        4,
        16,
        10,
        { blurPercent: 0 },
      );
      expect(output).toHaveLength(160);
    });

    it.each([8, 16] as const)(
      "should encode %i-bit single-channel grayscale PNG",
      async (bitDepth) => {
        const width = 32;
        const height = 20;
        const depth = new Float32Array(width * height).map(
          (_, index) => index / (width * height - 1),
        );
        const png = await encodeGrayscalePng(depth, width, height, bitDepth, {
          minDepth: 0.15,
          maxDepth: 3.57,
        });

        expect(new DataView(png.buffer).getUint32(16)).toBe(width);
        expect(new DataView(png.buffer).getUint32(20)).toBe(height);
        expect(png[24]).toBe(bitDepth);
        expect(png[25]).toBe(0);
        expect(new TextDecoder().decode(png)).toContain("DepthMin\u00000.15");
      },
    );

    it.each([8, 16] as const)(
      "roundtrips filtered %i-bit PNG samples across rows",
      async (bitDepth) => {
        const width = 63;
        const height = 17;
        const depth = Float32Array.from(
          { length: width * height },
          (_, i) => (i % width) / (width - 1),
        );
        const png = await encodeGrayscalePng(depth, width, height, bitDepth);
        const view = new DataView(png.buffer);
        let compressed = new Uint8Array();
        for (let offset = 8; offset < png.length;) {
          const length = view.getUint32(offset);
          const type = new TextDecoder().decode(
            png.subarray(offset + 4, offset + 8),
          );
          if (type === "IDAT")
            compressed = png.slice(offset + 8, offset + 8 + length);
          offset += length + 12;
        }
        const raw = unzlibSync(compressed);
        const bpp = bitDepth / 8;
        const rowBytes = width * bpp;
        const pixels = new Uint8Array(rowBytes * height);
        for (let y = 0; y < height; y++) {
          const rowOffset = y * (rowBytes + 1);
          const filter = raw[rowOffset];
          expect([0, 1, 2]).toContain(filter);
          for (let x = 0; x < rowBytes; x++) {
            const idx = y * rowBytes + x;
            const predictor =
              filter === 1 && x >= bpp
                ? pixels[idx - bpp]
                : filter === 2 && y > 0
                  ? pixels[idx - rowBytes]
                  : 0;
            pixels[idx] = (raw[rowOffset + x + 1] + predictor) & 255;
          }
        }
        for (let i = 0; i < depth.length; i++) {
          const actual =
            bitDepth === 16
              ? pixels[i * 2] * 256 + pixels[i * 2 + 1]
              : pixels[i];
          expect(actual).toBe(
            Math.round(depth[i] * (bitDepth === 16 ? 65535 : 255)),
          );
        }
      },
    );

    it("should retain more than 256 distinct 16-bit samples", async () => {
      const depth = new Float32Array(1024).map((_, index) => index / 1023);
      const png = await encodeGrayscalePng(depth, 1024, 1, 16);
      const bytes = new DataView(png.buffer);
      let offset = 8;
      let compressed = new Uint8Array();
      while (offset < png.length) {
        const length = bytes.getUint32(offset);
        const type = new TextDecoder().decode(
          png.subarray(offset + 4, offset + 8),
        );
        if (type === "IDAT")
          compressed = png.slice(offset + 8, offset + 8 + length);
        offset += length + 12;
      }
      const stream = new Response(
        compressed.buffer as ArrayBuffer,
      ).body!.pipeThrough(new DecompressionStream("deflate"));
      const scanline = new Uint8Array(await new Response(stream).arrayBuffer());
      const samples = new Set<number>();
      if (scanline[0] === 1) {
        for (let i = 3; i < scanline.length; i++) {
          scanline[i] = (scanline[i] + scanline[i - 2]) & 255;
        }
      }
      for (let i = 1; i < scanline.length; i += 2) {
        const sample = (scanline[i] ?? 0) * 256 + (scanline[i + 1] ?? 0);
        expect(sample).toBe(Math.round((depth[(i - 1) / 2] ?? 0) * 65535));
        samples.add(sample);
      }
      expect(samples.size).toBeGreaterThan(256);
    });
  });

  describe("exportDepthToGlb", () => {
    it("should create a valid GLB with embedded texture and aspect-correct mesh", () => {
      const depth = new Float32Array(384 * 384).map(
        (_, index) => index / (384 * 384 - 1),
      );
      const imageBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
      const glb = exportDepthToGlb(depth, 384, 384, imageBytes, "image/png", {
        maxGridDimension: 192,
        sourceDimensions: { width: 1600, height: 1000 },
      });
      const view = new DataView(glb.buffer);
      expect(view.getUint32(0, true)).toBe(0x46546c67);
      expect(view.getUint32(4, true)).toBe(2);
      expect(view.getUint32(8, true)).toBe(glb.length);
      const jsonLength = view.getUint32(12, true);
      const json = JSON.parse(
        new TextDecoder().decode(glb.subarray(20, 20 + jsonLength)).trim(),
      );
      expect(json.accessors[0].count).toBe(192 * 120);
      expect(json.accessors[0].min[0]).toBeCloseTo(-1.6);
      expect(json.accessors[0].max[0]).toBeCloseTo(1.6);
      expect(json.images[0].mimeType).toBe("image/png");
      expect(json.images[0].bufferView).toBe(3);

      const obj = exportDepthToObj(depth, 384, 384, {
        maxGridDimension: 192,
        sourceDimensions: { width: 1600, height: 1000 },
      });
      expect(glb.length).toBeLessThan(new TextEncoder().encode(obj).length);
    });

    it("declares WebP support as required when there is no PNG/JPEG fallback", () => {
      const webp = new Uint8Array([82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80]);
      const glb = exportDepthToGlb(
        new Float32Array(4),
        2,
        2,
        webp,
        "image/webp",
      );
      const length = new DataView(glb.buffer).getUint32(12, true);
      const json = JSON.parse(
        new TextDecoder().decode(glb.subarray(20, 20 + length)),
      );
      expect(json.extensionsRequired).toContain("EXT_texture_webp");
    });

    it("should reject a texture whose MIME does not match its signature", () => {
      expect(() =>
        exportDepthToGlb(
          new Float32Array(4).fill(0.5),
          2,
          2,
          new Uint8Array([1, 2, 3]),
          "image/png",
        ),
      ).toThrow("格式與檔案內容不一致");
      expect(
        detectGlbImageMimeType(
          new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
        ),
      ).toBe("image/png");
    });

    it("should cap large export grids below the Uint16 vertex limit", () => {
      const glb = exportDepthToGlb(
        new Float32Array(4).fill(0.5),
        2,
        2,
        new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
        "image/png",
        { maxGridDimension: 1000 },
      );
      const jsonLength = new DataView(glb.buffer).getUint32(12, true);
      const json = JSON.parse(
        new TextDecoder().decode(glb.subarray(20, 20 + jsonLength)).trim(),
      );
      expect(json.accessors[0].count).toBeLessThanOrEqual(65_535);
    });
  });

  describe("preview mesh budget", () => {
    it("should keep a 640px preview within the Uint16 vertex budget", () => {
      const grid = getSafePreviewGrid(640, 640);
      expect(grid.step).toBeGreaterThan(2);
      expect(grid.vertices).toBeLessThanOrEqual(65_535);
      expect(grid.cols * grid.rows).toBe(grid.vertices);
    });
  });

  describe("generateSampleDepthMap", () => {
    it("should generate sample depth map and canvas", () => {
      const sample = generateSampleDepthMap(32, 32);
      expect(sample.depthArray.length).toBe(32 * 32);
      expect(sample.imageCanvas.width).toBe(32);
      expect(sample.imageCanvas.height).toBe(32);

      // Center should have higher depth (nearer) than corners
      const centerIdx = 16 * 32 + 16;
      const cornerIdx = 0;
      expect(sample.depthArray[centerIdx]).toBeGreaterThan(
        sample.depthArray[cornerIdx],
      );
    });
  });
});
