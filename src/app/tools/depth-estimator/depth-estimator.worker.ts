import { pipeline, env, RawImage } from "@huggingface/transformers";
import {
  WorkerRequest,
  WorkerResponse,
  DepthModelId,
  DeviceType,
} from "./depth-estimator-types";
import { resizeDepthArray } from "./depth-estimator-core";

// 關閉本地模型載入限制，使用遠端 Hugging Face Hub / 瀏覽器快取
env.allowLocalModels = false;

interface PipelineProgressData {
  readonly file?: string;
  readonly progress?: number;
  readonly loaded?: number;
  readonly total?: number;
}

function readProgressData(value: unknown): PipelineProgressData {
  if (typeof value !== "object" || value === null) return {};
  const data = value as Record<string, unknown>;
  return {
    file: typeof data["file"] === "string" ? data["file"] : undefined,
    progress:
      typeof data["progress"] === "number" ? data["progress"] : undefined,
    loaded: typeof data["loaded"] === "number" ? data["loaded"] : undefined,
    total: typeof data["total"] === "number" ? data["total"] : undefined,
  };
}

interface DepthTensorOutput {
  readonly data?: ArrayLike<number>;
  readonly dims?: readonly number[];
}

interface RawDepthOutput {
  readonly predicted_depth?: DepthTensorOutput;
  readonly depth?: {
    readonly data?: ArrayLike<number>;
    readonly width: number;
    readonly height: number;
    readonly channels?: number;
  };
}

type DepthPipeline = (image: RawImage) => Promise<RawDepthOutput>;

// 儲存目前已載入之 pipeline 實例與配置
let currentPipeline: DepthPipeline | null = null;
let loadedModel: DepthModelId | null = null;
let loadedDevice: DeviceType = "webgpu";

/**
 * 取得或初始化深度估計 Pipeline
 */
async function getDepthPipeline(
  model: DepthModelId,
  preferredDevice: DeviceType = "webgpu",
  requestId = 0,
): Promise<{ pipe: DepthPipeline; device: DeviceType }> {
  if (
    currentPipeline &&
    loadedModel === model &&
    loadedDevice === preferredDevice
  ) {
    return { pipe: currentPipeline, device: loadedDevice };
  }

  let chosenDevice = preferredDevice;

  try {
    const pipe = await pipeline("depth-estimation", model, {
      device: chosenDevice,
      progress_callback: (rawProgressData: unknown) => {
        const progressData = readProgressData(rawProgressData);
        const msg: WorkerResponse = {
          type: "progress",
          requestId,
          progress: {
            status: "downloading",
            file: progressData?.file,
            progress:
              typeof progressData?.progress === "number"
                ? Math.round(progressData.progress)
                : undefined,
            loaded: progressData?.loaded,
            total: progressData?.total,
          },
        };
        self.postMessage(msg);
      },
    });

    const typedPipe = pipe as unknown as DepthPipeline;
    currentPipeline = typedPipe;
    loadedModel = model;
    loadedDevice = chosenDevice;
    return { pipe: typedPipe, device: chosenDevice };
  } catch (gpuError) {
    if (chosenDevice === "webgpu") {
      console.warn(
        "WebGPU initialization failed, falling back to WASM (CPU)...",
        gpuError,
      );
      chosenDevice = "wasm";

      const pipe = await pipeline("depth-estimation", model, {
        device: "wasm",
        progress_callback: (rawProgressData: unknown) => {
          const progressData = readProgressData(rawProgressData);
          const msg: WorkerResponse = {
            type: "progress",
            requestId,
            progress: {
              status: "downloading",
              file: progressData?.file,
              progress:
                typeof progressData?.progress === "number"
                  ? Math.round(progressData.progress)
                  : undefined,
              loaded: progressData?.loaded,
              total: progressData?.total,
            },
          };
          self.postMessage(msg);
        },
      });

      const typedPipe = pipe as unknown as DepthPipeline;
      currentPipeline = typedPipe;
      loadedModel = model;
      loadedDevice = "wasm";
      return { pipe: typedPipe, device: "wasm" };
    }
    throw gpuError;
  }
}

/**
 * 處理來自 Angular 主線程的訊息
 */
self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const req = event.data;

  try {
    if (req.type === "init") {
      const { device } = await getDepthPipeline(
        req.model,
        req.device ?? "webgpu",
        req.requestId,
      );
      const readyMsg: WorkerResponse = {
        type: "ready",
        requestId: req.requestId,
        device,
      };
      self.postMessage(readyMsg);
      return;
    }

    if (req.type === "estimate") {
      self.postMessage({
        type: "progress",
        requestId: req.requestId,
        progress: { status: "processing", message: "深度模型推論中..." },
      } as WorkerResponse);

      const { pipe, device } = await getDepthPipeline(
        req.model,
        req.device ?? "webgpu",
        req.requestId,
      );

      // 將傳入的 ImageBitmap 繪製到 OffscreenCanvas 並轉為 RawImage
      const bitmap = req.imageBitmap;
      const width = bitmap.width;
      const height = bitmap.height;

      const offscreen = new OffscreenCanvas(width, height);
      const ctx = offscreen.getContext("2d");
      if (!ctx) {
        throw new Error("無法建立 OffscreenCanvas 2D context");
      }
      ctx.drawImage(bitmap, 0, 0);
      const imgData = ctx.getImageData(0, 0, width, height);
      bitmap.close(); // 釋放 bitmap 記憶體

      const rawImage = new RawImage(imgData.data, width, height, 4);

      // 執行模型推論
      const startTime = performance.now();
      const output = await pipe(rawImage);
      const endTime = performance.now();
      const inferenceTimeMs = Math.round(endTime - startTime);

      // 提取深度資料
      // output 格式通常為 { depth: RawImage, predicted_depth: Tensor }
      let outWidth = width;
      let outHeight = height;
      let depthFloatArray: Float32Array;

      if (output.predicted_depth && output.predicted_depth.data) {
        const tensorData = output.predicted_depth.data;
        const dims = output.predicted_depth.dims; // [1, H, W] 或 [H, W]
        if (!dims || dims.length < 2) {
          throw new Error("模型深度輸出的尺寸資訊無效");
        }
        outHeight = dims[dims.length - 2] ?? 0;
        outWidth = dims[dims.length - 1] ?? 0;
        if (!outWidth || !outHeight) {
          throw new Error("模型深度輸出的尺寸無效");
        }

        const totalPixels = outWidth * outHeight;
        depthFloatArray = new Float32Array(totalPixels);

        let minD = Infinity;
        let maxD = -Infinity;

        for (let i = 0; i < totalPixels; i++) {
          const v = Number(tensorData[i]);
          if (v < minD) minD = v;
          if (v > maxD) maxD = v;
        }

        const range = maxD - minD || 1;
        for (let i = 0; i < totalPixels; i++) {
          depthFloatArray[i] = (Number(tensorData[i]) - minD) / range;
        }

        const resizedDepthArray = resizeDepthArray(
          depthFloatArray,
          outWidth,
          outHeight,
          width,
          height,
        );
        const successMsg: WorkerResponse = {
          type: "success",
          requestId: req.requestId,
          depthArray: resizedDepthArray,
          width,
          height,
          minDepth: minD,
          maxDepth: maxD,
          inferenceTimeMs,
          device,
        };

        self.postMessage(successMsg, [resizedDepthArray.buffer]);
      } else if (output.depth && output.depth.data) {
        outWidth = output.depth.width;
        outHeight = output.depth.height;
        const totalPixels = outWidth * outHeight;
        depthFloatArray = new Float32Array(totalPixels);
        const rawData = output.depth.data; // Uint8ClampedArray (grayscale or RGB)
        const channels = output.depth.channels || 1;

        for (let i = 0; i < totalPixels; i++) {
          depthFloatArray[i] = rawData[i * channels] / 255.0;
        }

        const successMsg: WorkerResponse = {
          type: "success",
          requestId: req.requestId,
          depthArray: depthFloatArray,
          width: outWidth,
          height: outHeight,
          minDepth: 0,
          maxDepth: 255,
          inferenceTimeMs,
          device,
        };

        self.postMessage(successMsg, [depthFloatArray.buffer]);
      } else {
        throw new Error("未能從模型輸出中解析深度資訊");
      }
    }
  } catch (err: unknown) {
    const errorMsg: WorkerResponse = {
      type: "error",
      requestId: req.requestId,
      message: err instanceof Error ? err.message : String(err),
    };
    self.postMessage(errorMsg);
  }
};
