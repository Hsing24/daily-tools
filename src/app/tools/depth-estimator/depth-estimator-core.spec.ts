import { describe, it, expect } from "vitest";
import {
  getDepthColor,
  depthArrayToImageData,
  exportDepthToObj,
  generateSampleDepthMap,
} from "./depth-estimator-core";

describe("depth-estimator-core", () => {
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
        0.0, 0.2, 0.4, 0.6,
        0.8, 1.0, 0.5, 0.3,
        0.1, 0.9, 0.7, 0.2,
        0.0, 0.4, 0.8, 1.0,
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
      expect(sample.depthArray[centerIdx]).toBeGreaterThan(sample.depthArray[cornerIdx]);
    });
  });
});
