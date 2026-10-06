import { ComponentFixture, TestBed } from "@angular/core/testing";
import { ToolAlert } from "./tool-alert";
import { ToastService } from "../../services/toast.service";

describe("ToolAlert", () => {
  let fixture: ComponentFixture<ToolAlert>;
  let component: ToolAlert;
  let toastService: ToastService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ToolAlert],
      providers: [ToastService],
    }).compileComponents();

    toastService = TestBed.inject(ToastService);
    fixture = TestBed.createComponent(ToolAlert);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    toastService.clear();
  });

  it("應能正常建立元件", () => {
    expect(component).toBeTruthy();
  });

  it("傳入訊息時應觸發 ToastService 發送通知", async () => {
    fixture.componentRef.setInput("message", "測試警告訊息");
    fixture.componentRef.setInput("variant", "warning");
    fixture.detectChanges();
    await fixture.whenStable();

    const toasts = toastService.toasts();
    expect(toasts.length).toBe(1);
    expect(toasts[0].message).toBe("測試警告訊息");
    expect(toasts[0].variant).toBe("warning");
  });

  it("當 inline 為 true 時應渲染行內提示", async () => {
    fixture.componentRef.setInput("message", "行內展示訊息");
    fixture.componentRef.setInput("inline", true);
    fixture.detectChanges();
    await fixture.whenStable();

    const alertEl = fixture.nativeElement.querySelector("[data-testid='alert-message']");
    expect(alertEl).toBeTruthy();
    expect(alertEl.classList.contains("d:none")).toBe(false);
  });
});
