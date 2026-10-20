/// <reference lib="webworker" />
import {
  ditherRgba,
  type DitherRequest,
  type DitherResponse,
} from "./image-dither-core";

addEventListener(
  "message",
  ({ data: request }: MessageEvent<DitherRequest>) => {
    try {
      const result = ditherRgba(
        new Uint8ClampedArray(request.data),
        request.width,
        request.height,
        request.settings,
      );
      const response: DitherResponse = {
        id: request.id,
        type: "done",
        data: result.buffer as ArrayBuffer,
        width: request.width,
        height: request.height,
      };
      postMessage(response, [response.data]);
    } catch {
      const response: DitherResponse = { id: request.id, type: "error" };
      postMessage(response);
    }
  },
);
