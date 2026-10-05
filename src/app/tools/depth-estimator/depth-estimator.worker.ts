import { pipeline, env, RawImage } from "@huggingface/transformers";
import {
  WorkerRequest,
  WorkerResponse,
  DepthModelId,
  DeviceType,
} from "./depth-estimator-types";
import { normalizeModelDepth, resizeDepthArray } from "./depth-estimator-core";

const workerScope = self as unknown as {
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
  postMessage(message: WorkerResponse, transfer: Transferable[]): void;
};

// 使用遠端 Hugging Face Hub 與瀏覽器快取，圖片仍只在本機推論。
env.allowLocalModels = false;

interface RawDepthOutput {
  readonly predicted_depth?: {
    readonly data?: ArrayLike<number>;
    readonly dims?: readonly number[];
  };
  readonly depth?: {
    readonly data?: ArrayLike<number>;
    readonly width: number;
    readonly height: number;
    readonly channels?: number;
  };
}

type DepthPipeline = ((image: RawImage) => Promise<RawDepthOutput>) & {
  dispose(): Promise<void>;
};

let currentPipeline: DepthPipeline | null = null;
let loadedModel: DepthModelId | null = null;
let loadedDevice: DeviceType = "webgpu";
let loadedPreference: DeviceType = "webgpu";
let latestRequestId = 0;
let pendingRequest: Exclude<WorkerRequest, { type: "cancel" }> | null = null;
let processing = false;

function postResponse(
  response: WorkerResponse,
  transfer: Transferable[] = [],
): void {
  if (response.requestId === latestRequestId)
    workerScope.postMessage(response, transfer);
}

async function releasePipeline(): Promise<void> {
  const previous = currentPipeline;
  currentPipeline = null;
  loadedModel = null;
  await previous?.dispose();
}

async function getDepthPipeline(
  model: DepthModelId,
  preference: DeviceType,
  requestId: number,
): Promise<{ pipe: DepthPipeline; device: DeviceType }> {
  if (
    currentPipeline &&
    loadedModel === model &&
    loadedPreference === preference
  ) {
    return { pipe: currentPipeline, device: loadedDevice };
  }
  await releasePipeline();
  const load = async (device: DeviceType): Promise<DepthPipeline> => {
    const pipe = await pipeline("depth-estimation", model, {
      device,
      progress_callback: (raw: unknown) => {
        const progress =
          typeof raw === "object" && raw !== null
            ? (raw as Record<string, unknown>)
            : {};
        postResponse({
          type: "progress",
          requestId,
          progress: {
            status: "downloading",
            file:
              typeof progress["file"] === "string"
                ? progress["file"]
                : undefined,
            progress:
              typeof progress["progress"] === "number"
                ? Math.round(progress["progress"])
                : undefined,
            loaded:
              typeof progress["loaded"] === "number"
                ? progress["loaded"]
                : undefined,
            total:
              typeof progress["total"] === "number"
                ? progress["total"]
                : undefined,
          },
        });
      },
    });
    return pipe as unknown as DepthPipeline;
  };
  let device = preference;
  let pipe: DepthPipeline;
  try {
    pipe = await load(device);
  } catch (error) {
    if (device !== "webgpu") throw error;
    device = "wasm";
    pipe = await load(device);
  }
  currentPipeline = pipe;
  loadedModel = model;
  loadedDevice = device;
  loadedPreference = preference;
  return { pipe, device };
}

async function processRequest(
  req: Exclude<WorkerRequest, { type: "cancel" }>,
): Promise<void> {
  try {
    if (req.type === "init") {
      const { device } = await getDepthPipeline(
        req.model,
        req.device ?? "webgpu",
        req.requestId,
      );
      postResponse({ type: "ready", requestId: req.requestId, device });
      return;
    }

    const bitmap = req.imageBitmap;
    const width = bitmap.width;
    const height = bitmap.height;
    let rawImage: RawImage;
    // close() 也涵蓋 context/decode 失敗；模型下載期間不保留 bitmap。
    try {
      const canvas = new OffscreenCanvas(width, height);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("無法建立 OffscreenCanvas 2D context");
      ctx.drawImage(bitmap, 0, 0);
      const image = ctx.getImageData(0, 0, width, height);
      rawImage = new RawImage(image.data, width, height, 4);
    } finally {
      bitmap.close();
    }
    let { pipe, device } = await getDepthPipeline(
      req.model,
      req.device ?? "webgpu",
      req.requestId,
    );
    if (req.requestId !== latestRequestId) return;
    postResponse({
      type: "progress",
      requestId: req.requestId,
      progress: { status: "processing", message: "深度模型推論中..." },
    });
    let startTime = performance.now();
    let output: RawDepthOutput;
    try {
      output = await pipe(rawImage);
    } catch (error) {
      if (device !== "webgpu" || req.requestId !== latestRequestId) throw error;
      await releasePipeline();
      ({ pipe, device } = await getDepthPipeline(
        req.model,
        "wasm",
        req.requestId,
      ));
      // 下次使用同一 GPU 偏好時直接重用已成功的 CPU fallback。
      loadedPreference = req.device ?? "webgpu";
      startTime = performance.now();
      output = await pipe(rawImage);
    }
    const inferenceTimeMs = Math.round(performance.now() - startTime);
    if (req.requestId !== latestRequestId) return;

    let depthArray: Float32Array;
    let minDepth: number;
    let maxDepth: number;
    let outWidth: number;
    let outHeight: number;
    if (output.predicted_depth?.data) {
      const dims = output.predicted_depth.dims;
      if (!dims || dims.length < 2)
        throw new Error("模型深度輸出的尺寸資訊無效");
      outHeight = dims[dims.length - 2] ?? 0;
      outWidth = dims[dims.length - 1] ?? 0;
      ({ depthArray, minDepth, maxDepth } = normalizeModelDepth(
        output.predicted_depth.data,
        outWidth,
        outHeight,
      ));
    } else if (output.depth?.data) {
      const raw = output.depth;
      outWidth = raw.width;
      outHeight = raw.height;
      const channels = raw.channels ?? 1;
      if (
        !Number.isInteger(channels) ||
        channels < 1 ||
        channels > 4 ||
        raw.data!.length !== outWidth * outHeight * channels
      ) {
        throw new Error("模型深度影像的資料尺寸無效");
      }
      depthArray = new Float32Array(outWidth * outHeight);
      for (let i = 0; i < depthArray.length; i++) {
        const value = Number(raw.data![i * channels]);
        if (!Number.isFinite(value) || value < 0 || value > 255)
          throw new Error("模型深度輸出含有無效數值");
        depthArray[i] = value / 255;
      }
      minDepth = 0;
      maxDepth = 255;
    } else {
      throw new Error("未能從模型輸出中解析深度資訊");
    }
    const resized =
      width === outWidth && height === outHeight
        ? depthArray
        : resizeDepthArray(depthArray, outWidth, outHeight, width, height);
    postResponse(
      {
        type: "success",
        requestId: req.requestId,
        depthArray: resized,
        width,
        height,
        minDepth,
        maxDepth,
        inferenceTimeMs,
        device,
      },
      [resized.buffer],
    );
  } catch (error) {
    postResponse({
      type: "error",
      requestId: req.requestId,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

// async onmessage 本身不會序列化。只跑一項推論，待執行佇列只留最新圖片。
workerScope.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const req = event.data;
  if (req.requestId < latestRequestId) {
    if (req.type === "estimate") req.imageBitmap.close();
    return;
  }
  latestRequestId = req.requestId;
  if (pendingRequest?.type === "estimate") pendingRequest.imageBitmap.close();
  pendingRequest = req.type === "cancel" ? null : req;
  if (processing) return;
  processing = true;
  void (async () => {
    try {
      while (pendingRequest) {
        const next = pendingRequest;
        pendingRequest = null;
        await processRequest(next);
      }
    } finally {
      processing = false;
    }
  })();
};
