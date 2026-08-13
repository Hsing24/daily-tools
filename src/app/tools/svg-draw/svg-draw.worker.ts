/// <reference lib="webworker" />

import ImageTracer from "imagetracerjs";
import type { TraceWorkerOutput, TraceWorkerRequest } from "./svg-draw-tracer";

addEventListener("message", (event: MessageEvent) => {
  const request = event.data as TraceWorkerRequest;
  const { data, width, height, options, generation } = request;

  try {
    const start = performance.now();

    const clampedArray = new Uint8ClampedArray(data);
    const imgd = { width, height, data: clampedArray };

    const svgString: string = ImageTracer.imagedataToSVG(imgd, options);

    const elapsedMs = performance.now() - start;

    const output: TraceWorkerOutput = {
      type: "done",
      generation,
      svgString,
      elapsedMs,
    };
    postMessage(output);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const output: TraceWorkerOutput = {
      type: "error",
      generation,
      error: message,
    };
    postMessage(output);
  }
});
