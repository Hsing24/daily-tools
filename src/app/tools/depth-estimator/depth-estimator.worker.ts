import { pipeline, env, RawImage } from "@huggingface/transformers";
import {
  WorkerRequest,
  WorkerResponse,
  DepthModelId,
  DeviceType,
} from "./depth-estimator-types";

// 關閉本地模型載入限制，使用遠端 Hugging Face Hub / 瀏覽器快取
env.allowLocalModels = false;

// 儲存目前已載入之 pipeline 實例與配置
let currentPipeline: any = null;
let loadedModel: DepthModelId | null = null;
let loadedDevice: DeviceType = "webgpu";

/**
 * 取得或初始化深度估計 Pipeline
 */
async function getDepthPipeline(
  model: DepthModelId,
  preferredDevice: DeviceType = "webgpu"
): Promise<{ pipe: any; device: DeviceType }> {
  if (currentPipeline && loadedModel === model && loadedDevice === preferredDevice) {
    return { pipe: currentPipeline, device: loadedDevice };
  }

  let chosenDevice = preferredDevice;

  try {
    const pipe = await pipeline("depth-estimation", model, {
      device: chosenDevice,
      progress_callback: (progressData: any) => {
        const msg: WorkerResponse = {
          type: "progress",
          progress: {
            status: "downloading",
            file: progressData?.file,
            progress: typeof progressData?.progress === "number" ? Math.round(progressData.progress) : undefined,
            loaded: progressData?.loaded,
            total: progressData?.total,
          },
        };
        self.postMessage(msg);
      },
    });

    currentPipeline = pipe;
    loadedModel = model;
    loadedDevice = chosenDevice;
    return { pipe, device: chosenDevice };
  } catch (gpuError) {
    if (chosenDevice === "webgpu") {
      console.warn("WebGPU initialization failed, falling back to WASM (CPU)...", gpuError);
      chosenDevice = "wasm";

      const pipe = await pipeline("depth-estimation", model, {
        device: "wasm",
        progress_callback: (progressData: any) => {
          const msg: WorkerResponse = {
            type: "progress",
            progress: {
              status: "downloading",
              file: progressData?.file,
              progress: typeof progressData?.progress === "number" ? Math.round(progressData.progress) : undefined,
              loaded: progressData?.loaded,
              total: progressData?.total,
            },
          };
          self.postMessage(msg);
        },
      });

      currentPipeline = pipe;
      loadedModel = model;
      loadedDevice = "wasm";
      return { pipe, device: "wasm" };
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
      const { device } = await getDepthPipeline(req.model, req.device ?? "webgpu");
      const readyMsg: WorkerResponse = { type: "ready", device };
      self.postMessage(readyMsg);
      return;
    }

    if (req.type === "estimate") {
      const startTime = performance.now();

      self.postMessage({
        type: "progress",
        progress: { status: "processing", message: "深度模型推論中..." },
      } as WorkerResponse);

      const { pipe, device } = await getDepthPipeline(req.model, req.device ?? "webgpu");

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
        outHeight = dims[dims.length - 2];
        outWidth = dims[dims.length - 1];

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

        const successMsg: WorkerResponse = {
          type: "success",
          depthArray: depthFloatArray,
          width: outWidth,
          height: outHeight,
          minDepth: minD,
          maxDepth: maxD,
          inferenceTimeMs,
          device,
        };

        self.postMessage(successMsg, [depthFloatArray.buffer]);
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
  } catch (err: any) {
    const errorMsg: WorkerResponse = {
      type: "error",
      message: err?.message || String(err),
    };
    self.postMessage(errorMsg);
  }
};
