export type DepthModelId =
  | "onnx-community/depth-anything-v2-small"
  | "onnx-community/depth-anything-v2-tiny";

export type ColorMapType =
  | "grayscale"
  | "viridis"
  | "inferno"
  | "turbo"
  | "plasma"
  | "magma"
  | "coolwarm";

export type PreviewMode = "depth" | "split" | "parallax" | "mesh3d";

export type DeviceType = "webgpu" | "wasm";

export interface ProgressInfo {
  readonly status:
    "init" | "downloading" | "ready" | "processing" | "done" | "error";
  readonly progress?: number; // 0 ~ 100
  readonly file?: string;
  readonly loaded?: number;
  readonly total?: number;
  readonly message?: string;
}

export interface DepthResult {
  readonly depthArray: Float32Array; // 0.0 (far) to 1.0 (near)
  readonly width: number;
  readonly height: number;
  readonly minDepth: number;
  readonly maxDepth: number;
  readonly inferenceTimeMs: number;
  readonly device: DeviceType;
}

export interface WorkerInitRequest {
  readonly type: "init";
  readonly requestId: number;
  readonly model: DepthModelId;
  readonly device?: DeviceType;
}

export interface WorkerEstimateRequest {
  readonly type: "estimate";
  readonly requestId: number;
  readonly model: DepthModelId;
  readonly device?: DeviceType;
  readonly imageBitmap: ImageBitmap;
}

export type WorkerRequest = WorkerInitRequest | WorkerEstimateRequest;

export interface WorkerProgressResponse {
  readonly type: "progress";
  readonly requestId: number;
  readonly progress: ProgressInfo;
}

export interface WorkerReadyResponse {
  readonly type: "ready";
  readonly requestId: number;
  readonly device: DeviceType;
}

export interface WorkerEstimateSuccessResponse {
  readonly type: "success";
  readonly requestId: number;
  readonly depthArray: Float32Array;
  readonly width: number;
  readonly height: number;
  readonly minDepth: number;
  readonly maxDepth: number;
  readonly inferenceTimeMs: number;
  readonly device: DeviceType;
}

export interface WorkerErrorResponse {
  readonly type: "error";
  readonly requestId: number;
  readonly message: string;
}

export type WorkerResponse =
  | WorkerProgressResponse
  | WorkerReadyResponse
  | WorkerEstimateSuccessResponse
  | WorkerErrorResponse;
