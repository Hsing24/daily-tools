// Node 26: compare isolated cores against an explicit Git revision.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const flag = process.argv.indexOf("--baseline");
const baseline = flag >= 0 ? process.argv[flag + 1] : "HEAD";
if (!baseline) throw new Error("--baseline requires a Git revision");
const directory = await mkdtemp(join(tmpdir(), "daily-tools-benchmark-"));
const median = (values) =>
  values.sort((a, b) => a - b)[Math.floor(values.length / 2)];

async function versions(slug, module) {
  const source = `src/app/tools/${slug}/${module}.ts`;
  const modules = [];
  for (const version of ["before", "after"]) {
    const content =
      version === "before"
        ? execFileSync("git", ["show", `${baseline}:${source}`], {
            cwd: root,
            encoding: "utf8",
          })
        : await readFile(join(root, source), "utf8");
    const path = join(directory, `${module}-${version}.mts`);
    await writeFile(path, content);
    modules.push(await import(pathToFileURL(path).href));
  }
  return modules;
}

function measure(label, before, after, iterations = 1) {
  for (let index = 0; index < 8; index += 1) {
    before();
    after();
  }
  const times = [[], []];
  for (let run = 0; run < 25; run += 1) {
    for (const index of run % 2 ? [1, 0] : [0, 1]) {
      const start = performance.now();
      for (let repeat = 0; repeat < iterations; repeat += 1)
        [before, after][index]();
      times[index].push((performance.now() - start) / iterations);
    }
  }
  const [oldTime, newTime] = times.map(median);
  console.log(
    JSON.stringify({
      label,
      beforeMs: +oldTime.toFixed(3),
      afterMs: +newTime.toFixed(3),
      reductionPercent: +((1 - newTime / oldTime) * 100).toFixed(1),
    }),
  );
}

try {
  console.log(
    JSON.stringify({
      node: process.version,
      baseline,
      samples: 25,
      statistic: "median",
      scope: "cores only; excludes decode, rendering, model inference",
    }),
  );
  const [oldWords, newWords] = await versions("word-count", "word-count-stats");
  const text = "中文 hello 👩‍💻 \n".repeat(5000);
  assert.deepEqual(
    oldWords.computeTextStats(text),
    newWords.computeTextStats(text),
  );
  measure(
    `word-count mixed text ${text.length} UTF-16 units`,
    () => oldWords.computeTextStats(text),
    () => newWords.computeTextStats(text),
  );

  const [oldAscii, newAscii] = await versions(
    "image-to-ascii",
    "image-to-ascii-core",
  );
  let pixels;
  globalThis.document = {
    createElement: () => ({
      getContext: () => ({
        drawImage() {},
        getImageData: () => ({ data: pixels }),
      }),
    }),
  };
  const source = { width: 600, height: 333 };
  pixels = Uint8ClampedArray.from(
    { length: source.width * source.height * 4 },
    (_, index) => (index * 37 + (index >> 2)) % 256,
  );
  for (const dither of [false, true]) {
    for (const colorMode of ["monochrome", "original"]) {
      const options = {
        width: 600,
        charSet: "@#W$9876543210?!abc;:+=-,._ ",
        dither,
        contrast: 35,
        brightness: 7,
        colorMode,
        charAspectRatio: 1,
      };
      assert.deepEqual(
        oldAscii.convertImageToAscii(source, options),
        newAscii.convertImageToAscii(source, options),
      );
      measure(
        `ascii 199800 cells ${colorMode} dither=${dither}`,
        () => oldAscii.convertImageToAscii(source, options),
        () => newAscii.convertImageToAscii(source, options),
      );
    }
  }

  const [oldPasswords, newPasswords] = await versions(
    "password-generator",
    "password-generator-logic",
  );
  const options = {
    length: 16,
    useUppercase: true,
    useLowercase: true,
    useNumbers: true,
    useSymbols: true,
    excludeAmbiguous: false,
    uniqueOnly: false,
    firstCharRule: "any",
  };
  for (const [name, override] of [
    ["default16", {}],
    ["unique64", { length: 64, uniqueOnly: true }],
    ["four-pool4", { length: 4 }],
  ]) {
    const settings = { ...options, ...override };
    measure(
      `password ${name}`,
      () => oldPasswords.generatePassword(settings),
      () => newPasswords.generatePassword(settings),
      500,
    );
  }
} finally {
  await rm(directory, { recursive: true, force: true });
}
