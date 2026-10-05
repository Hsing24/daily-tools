import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WorkerRequest, WorkerResponse } from "./depth-estimator-types";

const mocks = vi.hoisted(() => ({ pipeline: vi.fn() }));
vi.mock("@huggingface/transformers", () => ({
  pipeline: mocks.pipeline,
  env: {},
  RawImage: class {},
}));

describe("depth worker", () => {
  let worker: {
    onmessage: ((event: { data: WorkerRequest }) => void) | null;
    postMessage: ReturnType<typeof vi.fn>;
  };
  const model = "onnx-community/depth-anything-v2-small" as const;
  const output = {
    predicted_depth: { data: new Float32Array([1, 3, 2, 4]), dims: [2, 2] },
  };
  const bitmap = () =>
    ({ width: 2, height: 2, close: vi.fn() }) as unknown as ImageBitmap;
  const responses = () =>
    worker.postMessage.mock.calls.map(([message]) => message as WorkerResponse);
  const send = (
    requestId: number,
    imageBitmap: ImageBitmap,
    device: "wasm" | "webgpu" = "wasm",
  ) => {
    worker.onmessage!({
      data: { type: "estimate", requestId, model, device, imageBitmap },
    });
  };
  const makePipe = (call: ReturnType<typeof vi.fn>) =>
    Object.assign(call, { dispose: vi.fn().mockResolvedValue(undefined) });

  beforeEach(async () => {
    vi.resetModules();
    mocks.pipeline.mockReset();
    worker = { onmessage: null, postMessage: vi.fn() };
    vi.stubGlobal("self", worker);
    vi.stubGlobal(
      "OffscreenCanvas",
      class {
        getContext() {
          return {
            drawImage: vi.fn(),
            getImageData: () => ({ data: new Uint8ClampedArray(16) }),
          };
        }
      },
    );
    await import("./depth-estimator.worker");
  });
  afterEach(() => vi.unstubAllGlobals());

  it("serializes inference and drops intermediate queued images", async () => {
    let finish!: (value: typeof output) => void;
    const pipe = makePipe(
      vi
        .fn()
        .mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              finish = resolve;
            }),
        )
        .mockResolvedValue(output),
    );
    mocks.pipeline.mockResolvedValue(pipe);
    const first = bitmap();
    const second = bitmap();
    const third = bitmap();
    send(1, first);
    await vi.waitFor(() => expect(pipe).toHaveBeenCalledTimes(1));
    send(2, second);
    send(3, third);
    expect(second.close).toHaveBeenCalledOnce();
    expect(pipe).toHaveBeenCalledTimes(1);
    finish(output);
    await vi.waitFor(() =>
      expect(responses().filter((r) => r.type === "success")).toHaveLength(1),
    );
    expect(pipe).toHaveBeenCalledTimes(2);
    expect(responses().filter((r) => r.type === "success")[0]?.requestId).toBe(
      3,
    );
    expect(first.close).toHaveBeenCalledOnce();
    expect(third.close).toHaveBeenCalledOnce();
    expect(mocks.pipeline).toHaveBeenCalledOnce();
  });

  it("reuses CPU fallback for later requests with the same GPU preference", async () => {
    const pipe = makePipe(vi.fn().mockResolvedValue(output));
    mocks.pipeline
      .mockRejectedValueOnce(new Error("GPU unavailable"))
      .mockResolvedValue(pipe);
    send(1, bitmap(), "webgpu");
    await vi.waitFor(() =>
      expect(responses().some((r) => r.type === "success")).toBe(true),
    );
    send(2, bitmap(), "webgpu");
    await vi.waitFor(() =>
      expect(responses().filter((r) => r.type === "success")).toHaveLength(2),
    );
    expect(mocks.pipeline).toHaveBeenCalledTimes(2);
    expect(
      responses()
        .filter((r) => r.type === "success")
        .every((r) => r.device === "wasm"),
    ).toBe(true);
  });

  it("retries GPU inference failure on CPU and disposes the failed pipeline", async () => {
    const gpu = makePipe(vi.fn().mockRejectedValue(new Error("device lost")));
    const cpu = makePipe(vi.fn().mockResolvedValue(output));
    mocks.pipeline.mockResolvedValueOnce(gpu).mockResolvedValueOnce(cpu);
    send(1, bitmap(), "webgpu");
    await vi.waitFor(() =>
      expect(responses().some((r) => r.type === "success")).toBe(true),
    );
    expect(gpu.dispose).toHaveBeenCalledOnce();
    expect(responses().find((r) => r.type === "success")?.device).toBe("wasm");
  });

  it("closes the bitmap even when the drawing context is unavailable", async () => {
    vi.stubGlobal(
      "OffscreenCanvas",
      class {
        getContext() {
          return null;
        }
      },
    );
    const image = bitmap();
    send(1, image);
    await vi.waitFor(() =>
      expect(responses().some((r) => r.type === "error")).toBe(true),
    );
    expect(image.close).toHaveBeenCalledOnce();
    expect(mocks.pipeline).not.toHaveBeenCalled();
  });

  it("cancellation prevents queued inference and stale results", async () => {
    let finish!: (value: typeof output) => void;
    const pipe = makePipe(
      vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            finish = resolve;
          }),
      ),
    );
    mocks.pipeline.mockResolvedValue(pipe);
    send(1, bitmap());
    await vi.waitFor(() => expect(pipe).toHaveBeenCalledOnce());
    const queued = bitmap();
    send(2, queued);
    worker.onmessage!({ data: { type: "cancel", requestId: 3 } });
    finish(output);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(queued.close).toHaveBeenCalledOnce();
    expect(pipe).toHaveBeenCalledOnce();
    expect(responses().filter((r) => r.type === "success")).toHaveLength(0);
  });
});
