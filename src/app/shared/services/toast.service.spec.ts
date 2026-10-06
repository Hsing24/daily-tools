import { TestBed } from "@angular/core/testing";
import { ToastService } from "./toast.service";

describe("ToastService", () => {
  let service: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ToastService],
    });
    service = TestBed.inject(ToastService);
  });

  afterEach(() => {
    service.clear();
  });

  it("應能正常建立服務且預設無任何訊息", () => {
    expect(service).toBeTruthy();
    expect(service.toasts().length).toBe(0);
  });

  it("呼叫 show 應正確加入 Toast 並觸發 signal 更新", () => {
    const id = service.show("測試訊息", "success");
    expect(id).toBeTruthy();
    expect(service.toasts().length).toBe(1);
    expect(service.toasts()[0].message).toBe("測試訊息");
    expect(service.toasts()[0].variant).toBe("success");
  });

  it("連續發送多則訊息時應往後疊加", () => {
    service.info("訊息一");
    service.warning("訊息二");
    service.error("訊息三");

    const toasts = service.toasts();
    expect(toasts.length).toBe(3);
    expect(toasts[0].message).toBe("訊息一");
    expect(toasts[1].message).toBe("訊息二");
    expect(toasts[2].message).toBe("訊息三");
  });

  it("約 3 秒後應依序自動消失", () => {
    vi.useFakeTimers();
    try {
      service.show("訊息一", "info", 3000);
      vi.advanceTimersByTime(1000);
      service.show("訊息二", "success", 3000);

      expect(service.toasts().length).toBe(2);

      // 經過 2000ms（距離訊息一發出已滿 3000ms），訊息一應消失，訊息二仍在
      vi.advanceTimersByTime(2000);
      expect(service.toasts().length).toBe(1);
      expect(service.toasts()[0].message).toBe("訊息二");

      // 再經過 1000ms（距離訊息二發出已滿 3000ms），訊息二亦應消失
      vi.advanceTimersByTime(1000);
      expect(service.toasts().length).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("手動呼叫 dismiss 應依指定 ID 立即清除", () => {
    const id1 = service.success("訊息一");
    const id2 = service.error("訊息二");

    expect(service.toasts().length).toBe(2);
    service.dismiss(id1);

    expect(service.toasts().length).toBe(1);
    expect(service.toasts()[0].id).toBe(id2);
  });

  it("空白或無效訊息不應被加入", () => {
    const id1 = service.show("");
    const id2 = service.show("   ");

    expect(id1).toBe("");
    expect(id2).toBe("");
    expect(service.toasts().length).toBe(0);
  });

  it("呼叫 clear 應清除所有正在等待的訊息", () => {
    service.show("訊息一");
    service.show("訊息二");
    expect(service.toasts().length).toBe(2);

    service.clear();
    expect(service.toasts().length).toBe(0);
  });

  it("短時間內發送相同內容訊息應防重複且刷新計時器", () => {
    vi.useFakeTimers();
    try {
      const id1 = service.success("相同訊息", 3000);
      expect(service.toasts().length).toBe(1);

      vi.advanceTimersByTime(2000);
      // 2 秒後再次送出相同訊息
      const id2 = service.success("相同訊息", 3000);
      expect(id2).toBe(id1);
      // 長度仍應為 1，不產生兩筆通知
      expect(service.toasts().length).toBe(1);

      // 再經過 1500ms（距離第一次已滿 3500ms，但距離第二次僅 1500ms），訊息應仍在
      vi.advanceTimersByTime(1500);
      expect(service.toasts().length).toBe(1);

      // 再經過 1500ms（距離第二次滿 3000ms），訊息自動消失
      vi.advanceTimersByTime(1500);
      expect(service.toasts().length).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("呼叫 startExit 應先標記 isExiting 並於動畫時間後移除", () => {
    vi.useFakeTimers();
    try {
      const id = service.show("退場測試", "info", 5000);
      expect(service.toasts().length).toBe(1);
      expect(service.toasts()[0].isExiting).toBe(false);

      service.startExit(id, 250);
      expect(service.toasts().length).toBe(1);
      expect(service.toasts()[0].isExiting).toBe(true);

      vi.advanceTimersByTime(250);
      expect(service.toasts().length).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
