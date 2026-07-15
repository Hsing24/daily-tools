import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { Layout } from "./layout";

describe("Layout", () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Layout],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it("should create the layout", () => {
    const fixture = TestBed.createComponent(Layout);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it("should render a fixed header without a sidebar", async () => {
    const fixture = TestBed.createComponent(Layout);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector("#tool-sidebar")).toBeNull();
    expect(compiled.querySelector(".hamburger-btn")).toBeNull();
    expect(compiled.querySelector("header.prompt-bar")).toBeTruthy();
  });

  it("should have a brand link pointing to the root path", async () => {
    const fixture = TestBed.createComponent(Layout);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const brandLink = compiled.querySelector(".prompt-brand") as HTMLAnchorElement;

    expect(brandLink).toBeTruthy();
    expect(brandLink.tagName.toLowerCase()).toBe("a");
    expect(brandLink.getAttribute("routerLink")).toBe("/");
  });

  it("should open command palette when cmd-k-btn is clicked", async () => {
    const fixture = TestBed.createComponent(Layout);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const btn = compiled.querySelector("#cmd-k-btn") as HTMLButtonElement;

    expect(compiled.querySelector("app-command-palette")).toBeNull();

    btn.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(compiled.querySelector("app-command-palette")).toBeTruthy();
  });

  it("should open and close command palette via shortcut keys and escape key", async () => {
    const fixture = TestBed.createComponent(Layout);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector("app-command-palette")).toBeNull();

    // 模擬在 INPUT 上按下 `/`，不應該觸發命令面板
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();
    const inputEvent = new KeyboardEvent("keydown", { key: "/" });
    input.dispatchEvent(inputEvent);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(compiled.querySelector("app-command-palette")).toBeNull();
    document.body.removeChild(input);

    // 模擬普通狀態下按下 `/` 快捷鍵
    document.body.focus(); // 移出輸入框
    const event = new KeyboardEvent("keydown", {
      key: "/",
    });
    document.dispatchEvent(event);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(compiled.querySelector("app-command-palette")).toBeTruthy();

    // 模擬 Esc 鍵
    const escEvent = new KeyboardEvent("keydown", { key: "Escape" });
    document.dispatchEvent(escEvent);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(compiled.querySelector("app-command-palette")).toBeNull();
  });
});
