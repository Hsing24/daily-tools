import { ComponentFixture, TestBed } from "@angular/core/testing";
import { ToastContainer } from "./toast-container";
import { ToastService } from "../../services/toast.service";

describe("ToastContainer", () => {
  let fixture: ComponentFixture<ToastContainer>;
  let toastService: ToastService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ToastContainer],
      providers: [ToastService],
    }).compileComponents();

    toastService = TestBed.inject(ToastService);
    fixture = TestBed.createComponent(ToastContainer);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => {
    toastService.clear();
  });

  it("預設無任何訊息時不應渲染容器", () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector(".toast-container")).toBeNull();
  });

  it("發送訊息時應正確渲染 Toast 項目與內容", async () => {
    toastService.success("已成功複製內容！");
    fixture.detectChanges();
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    const items = el.querySelectorAll("[data-testid='toast-item']");
    expect(items.length).toBe(1);
    expect(items[0].textContent).toContain("已成功複製內容！");
    expect(items[0].getAttribute("data-variant")).toBe("success");
  });

  it("發送多則訊息時應全部渲染並向上疊加", async () => {
    toastService.info("通知 1");
    toastService.warning("警告 2");
    fixture.detectChanges();
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    const items = el.querySelectorAll("[data-testid='toast-item']");
    expect(items.length).toBe(2);
    expect(items[0].textContent).toContain("通知 1");
    expect(items[1].textContent).toContain("警告 2");
  });

  it("點擊關閉按鈕時應觸發退場動畫並消除該 Toast", async () => {
    vi.useFakeTimers();
    try {
      toastService.error("連線逾時");
      fixture.detectChanges();
      await fixture.whenStable();

      const el = fixture.nativeElement as HTMLElement;
      const closeBtn = el.querySelector("[data-testid='btn-close-toast']") as HTMLButtonElement;
      expect(closeBtn).toBeTruthy();

      closeBtn.click();
      fixture.detectChanges();

      // 應已標記退場動畫 class
      expect(el.querySelector(".toast-item--exiting")).toBeTruthy();

      // 動畫 250ms 結束後完全清除
      vi.advanceTimersByTime(250);
      fixture.detectChanges();

      expect(el.querySelector("[data-testid='toast-item']")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("計時約 3 秒後應自動消失", async () => {
    vi.useFakeTimers();
    try {
      toastService.show("即將消失", "info", 3000);
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector("[data-testid='toast-item']")).toBeTruthy();

      vi.advanceTimersByTime(3000);
      fixture.detectChanges();

      expect(el.querySelector("[data-testid='toast-item']")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("當多則訊息中第一則消失時，應先標記退場動畫，隨後第二則留在畫面上", async () => {
    vi.useFakeTimers();
    try {
      toastService.show("第一則訊息", "info", 3000);
      vi.advanceTimersByTime(1000);
      toastService.show("第二則訊息", "success", 3000);
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      let items = el.querySelectorAll("[data-testid='toast-item']");
      expect(items.length).toBe(2);

      // 經過 1750ms（第一則累計 2750ms，觸發退場動畫）
      vi.advanceTimersByTime(1750);
      fixture.detectChanges();

      items = el.querySelectorAll("[data-testid='toast-item']");
      expect(items.length).toBe(2);
      expect(items[0].classList.contains("toast-item--exiting")).toBe(true);
      expect(items[1].classList.contains("toast-item--exiting")).toBe(false);

      // 再經過 250ms（第一則累計 3000ms，第一則完全消失，第二則留下）
      vi.advanceTimersByTime(250);
      fixture.detectChanges();

      items = el.querySelectorAll("[data-testid='toast-item']");
      expect(items.length).toBe(1);
      expect(items[0].textContent).toContain("第二則訊息");
    } finally {
      vi.useRealTimers();
    }
  });
});
