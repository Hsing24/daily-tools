import {
  DEFAULT_DITHER_SETTINGS,
  ditherRgba,
  type DitherSettings,
} from "./image-dither-core";

const rgba = (values: number[]) =>
  new Uint8ClampedArray(values.flatMap((value) => [value, value, value, 255]));
const run = (
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  settings: Partial<DitherSettings> = {},
) =>
  ditherRgba(pixels, width, height, {
    ...DEFAULT_DITHER_SETTINGS,
    ...settings,
  });
const reds = (pixels: Uint8ClampedArray) =>
  Array.from(pixels).filter((_, i) => i % 4 === 0);

describe("ImageDither core", () => {
  it("diffuses 7/16 to the right and 5/16 down without wrapping edges", () => {
    expect(reds(run(rgba([100, 100]), 2, 1))).toEqual([0, 255]);
    expect(reds(run(rgba([100, 100]), 1, 2))).toEqual([0, 255]);
    expect(reds(run(rgba([0, 100, 100, 0]), 2, 2))).toEqual([0, 0, 0, 0]);
  });

  it("uses the Bayer 4×4 matrix at neutral midgray", () => {
    expect(
      reds(run(rgba(Array(16).fill(128)), 4, 4, { algorithm: "bayer" })),
    ).toEqual([0, 255, 0, 255, 255, 0, 255, 0, 0, 255, 0, 255, 255, 0, 255, 0]);
  });

  for (const algorithm of ["floyd-steinberg", "bayer"] as const) {
    for (const [palette, dark, light] of [
      ["monochrome", [0, 0, 0], [255, 255, 255]],
      ["mint", [10, 26, 47], [63, 224, 197]],
      ["amber", [10, 26, 47], [241, 180, 52]],
    ] as const) {
      it(`${algorithm} emits only the ${palette} endpoints`, () => {
        const result = run(rgba([0, 255, 90, 200]), 4, 1, {
          algorithm,
          palette,
        });
        expect(Array.from(result.slice(0, 4))).toEqual([...dark, 255]);
        expect(Array.from(result.slice(4, 8))).toEqual([...light, 255]);
        for (let i = 0; i < result.length; i += 4)
          expect([dark.join(), light.join()]).toContain(
            Array.from(result.slice(i, i + 3)).join(),
          );
      });
    }
    for (const [colors, levels] of [
      [8, [0, 255]],
      [27, [0, 128, 255]],
      [64, [0, 85, 170, 255]],
    ] as const) {
      it(`${algorithm} quantizes RGB independently to ${colors} colors`, () => {
        const pixels = new Uint8ClampedArray(
          Array.from({ length: 256 }, (_, i) => [
            i,
            255 - i,
            i % 137,
            255,
          ]).flat(),
        );
        const result = run(pixels, 16, 16, {
          algorithm,
          palette: "color",
          colors,
        });
        expect(
          new Set(Array.from(result).filter((_, i) => i % 4 !== 3)),
        ).toEqual(new Set(levels));
        expect(
          Array.from(result)
            .filter((_, i) => i % 4 === 3)
            .every((v) => v === 255),
        ).toBe(true);
      });
    }
  }

  it("applies brightness and contrast before quantization", () => {
    expect(reds(run(rgba([100]), 1, 1, { brightness: 100 }))).toEqual([255]);
    expect(reds(run(rgba([200]), 1, 1, { brightness: -100 }))).toEqual([0]);
    expect(
      reds(
        run(rgba([100, 200]), 2, 1, {
          contrast: -100,
          palette: "color",
          colors: 64,
        }),
      ),
    ).toEqual([170, 85]);
    expect(reds(run(rgba([100, 200]), 2, 1, { contrast: 100 }))).toEqual([
      0, 255,
    ]);
  });

  it("composites transparent and translucent pixels on white", () => {
    expect(
      Array.from(run(new Uint8ClampedArray([255, 0, 0, 0]), 1, 1)),
    ).toEqual([255, 255, 255, 255]);
    expect(
      Array.from(
        run(new Uint8ClampedArray([0, 0, 0, 128]), 1, 1, {
          palette: "color",
          colors: 64,
        }),
      ),
    ).toEqual([85, 85, 85, 255]);
  });

  it("averages blocks before processing then fills original dimensions with nearest-neighbor", () => {
    const result = run(rgba([0, 255, 0, 255, 255, 255, 0, 0, 0]), 3, 3, {
      pixelSize: 2,
    });
    expect(result.length).toBe(36);
    expect(reds(result)).toEqual([255, 255, 0, 255, 255, 0, 0, 0, 0]);
    expect(reds(run(rgba([0]), 1, 1, { pixelSize: 16 }))).toEqual([0]);
    expect(
      run(rgba(Array(15).fill(100)), 5, 3, { pixelSize: 1.5 }),
    ).toHaveLength(60);
  });

  it("is deterministic and never mutates the input or settings", () => {
    const pixels = rgba([23, 200, 90, 55, 220, 30]);
    const copy = pixels.slice();
    const settings = Object.freeze({ ...DEFAULT_DITHER_SETTINGS });
    expect(ditherRgba(pixels, 3, 2, settings)).toEqual(
      ditherRgba(pixels, 3, 2, settings),
    );
    expect(pixels).toEqual(copy);
  });

  it("rejects invalid dimensions, pixel buffers and unsafe settings", () => {
    for (const [width, height] of [
      [0, 1],
      [1, -1],
      [1.5, 1],
      [40_000_001, 1],
    ])
      expect(() => run(rgba([0]), width, height)).toThrow();
    expect(() => run(new Uint8ClampedArray(3), 1, 1)).toThrow();
    for (const settings of [
      { pixelSize: 0 },
      { pixelSize: 17 },
      { brightness: NaN },
      { contrast: 101 },
    ])
      expect(() => run(rgba([0]), 1, 1, settings)).toThrow();
  });
});
