/// <reference lib="webworker" />

import ImageTracer from 'imagetracerjs';
import type { TraceOptions, TraceWorkerOutput } from './svg-draw-tracer';

addEventListener('message', (event: MessageEvent) => {
  const { data, width, height, options } = event.data as {
    data: ArrayBuffer;
    width: number;
    height: number;
    options: TraceOptions;
  };

  try {
    const start = performance.now();

    const clampedArray = new Uint8ClampedArray(data);
    const imgd = { width, height, data: clampedArray };

    const svgString: string = ImageTracer.imagedataToSVG(imgd, options as any);

    const elapsedMs = performance.now() - start;

    const output: TraceWorkerOutput = {
      type: 'done',
      svgString,
      elapsedMs,
    };
    postMessage(output);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const output: TraceWorkerOutput = {
      type: 'error',
      error: message,
    };
    postMessage(output);
  }
});
