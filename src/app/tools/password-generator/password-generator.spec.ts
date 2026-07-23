import { TestBed, ComponentFixture } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { PasswordGenerator } from "./password-generator";
import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

describe("PasswordGenerator 元件", () => {
  let fixture: ComponentFixture<PasswordGenerator>;
  let component: PasswordGenerator;
  let element: HTMLElement;
  let mockClipboardWriteText: Mock;

  beforeEach(async () => {
    // 設置 clipboard mock
    mockClipboardWriteText = vi.fn();
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: mockClipboardWriteText,
      },
      configurable: true,
      writable: true,
    });

    await TestBed.configureTestingModule({
      imports: [PasswordGenerator],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(PasswordGenerator);
    component = fixture.componentInstance;
    element = fixture.nativeElement;
    fixture.detectChanges();
  });

  it("應正確建立元件", () => {
    expect(component).toBeTruthy();
  });

  it("初始狀態下應已預設生成一組密碼", () => {
    const input = element.querySelector('input[aria-label="產生的密碼"]') as HTMLInputElement;
    expect(input.value).toBeTruthy();
    expect(input.value.length).toBe(16);
    expect(input.type).toBe("password"); // 預設應隱藏密碼
  });

  it("點選「顯示密碼」後應切換輸入框 type，再點選應復原", () => {
    const toggleBtn = element.querySelector('[data-testid="btn-toggle-visibility"]') as HTMLButtonElement;
    const input = element.querySelector('input[aria-label="產生的密碼"]') as HTMLInputElement;

    expect(input.type).toBe("password");
    
    toggleBtn.click();
    fixture.detectChanges();
    expect(input.type).toBe("text");
    expect(toggleBtn.textContent?.trim()).toBe("[ 隱藏密碼 ]");

    toggleBtn.click();
    fixture.detectChanges();
    expect(input.type).toBe("password");
    expect(toggleBtn.textContent?.trim()).toBe("[ 顯示密碼 ]");
  });

  it("當未勾選任何規則時，產生密碼應提示錯誤訊息", () => {
    // 取消勾選所有規則
    component["useUppercase"].set(false);
    component["useLowercase"].set(false);
    component["useNumbers"].set(false);
    component["useSymbols"].set(false);
    fixture.detectChanges();

    const generateBtn = element.querySelector("button.dt-button--primary") as HTMLButtonElement;
    generateBtn.click();
    fixture.detectChanges();

    const alertEl = element.querySelector('[data-testid="alert-message"]') as HTMLElement;
    expect(alertEl).toBeTruthy();
    expect(alertEl.textContent).toContain("請至少選擇一種字元類型！");
  });

  it("當點選複製按鈕時，應呼叫 clipboard.writeText 並顯示成功提示", async () => {
    mockClipboardWriteText.mockResolvedValue(undefined);

    // 取得複製按鈕
    const copyBtn = element.querySelector("button.dt-button--secondary") as HTMLButtonElement;
    copyBtn.click();
    fixture.detectChanges();

    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(mockClipboardWriteText).toHaveBeenCalledWith(component["password"]());
    
    // 檢查是否有成功複製的提示
    const alertEl = element.querySelector('[data-testid="alert-message"]') as HTMLElement;
    expect(alertEl).toBeTruthy();
    expect(alertEl.textContent).toContain("密碼已成功複製到剪貼簿！");
  });

  it("當點選隨機產生時，長度與規則應發生隨機更新", () => {
    const originalLen = component["length"]();
    
    // 取得隨機產生按鈕。在此範本中，我們有三個按鈕：
    // dt-button--primary (依設定產生), dt-button--ghost (隨機產生), dt-button--secondary (複製密碼)
    // 尋找包含「隨機產生」文字的按鈕
    const btns = element.querySelectorAll("button");
    let randomBtn: HTMLButtonElement | null = null;
    btns.forEach(btn => {
      if (btn.textContent?.includes("隨機產生")) {
        randomBtn = btn;
      }
    });

    expect(randomBtn).toBeTruthy();
    randomBtn!.click();
    fixture.detectChanges();

    // 密碼長度可能隨機變更，或者規則被重新指派
    const newPass = component["password"]();
    expect(newPass).toBeTruthy();
    expect(newPass.length).toBe(component["length"]());
  });
});
