import { TestBed, ComponentFixture } from "@angular/core/testing";
import { provideRouter, Router } from "@angular/router";
import { CommandPalette } from "./command-palette";
import { By } from "@angular/platform-browser";
import { ElementRef } from "@angular/core";

describe("CommandPalette", () => {
  let component: CommandPalette;
  let fixture: ComponentFixture<CommandPalette>;
  let router: Router;

  const mockToolGroups = [
    {
      name: "Group A",
      tools: [
        { label: "工具 A", route: "tool-a", available: true },
        { label: "工具 B", route: "tool-b", available: true },
        { label: "工具 C", route: "tool-c", available: false }, // 關閉的工具不應被搜尋到
      ],
    },
    {
      name: "Group B",
      tools: [
        { label: "Tool D", route: "tool-d", available: true },
      ],
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommandPalette],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(CommandPalette);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);

    // 設定 required input
    fixture.componentRef.setInput("toolGroups", mockToolGroups);
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("should focus input element after view init", async () => {
    await fixture.whenStable();
    const inputEl = fixture.debugElement.query(By.css("input")).nativeElement as HTMLInputElement;
    expect(document.activeElement).toBe(inputEl);
  });

  it("should filter tools based on input query", async () => {
    component["query"].set("工具");
    fixture.detectChanges();
    await fixture.whenStable();

    const items = fixture.debugElement.queryAll(By.css(".cmd-k-list-item"));
    expect(items.length).toBe(2);
    expect(items[0].nativeElement.textContent).toContain("工具 A");
    expect(items[1].nativeElement.textContent).toContain("工具 B");
  });

  it("should show all available tools when query is empty", async () => {
    component["query"].set("");
    fixture.detectChanges();
    await fixture.whenStable();

    const items = fixture.debugElement.queryAll(By.css(".cmd-k-list-item"));
    expect(items.length).toBe(3);
    expect(items[0].nativeElement.textContent).toContain("工具 A");
    expect(items[1].nativeElement.textContent).toContain("工具 B");
    expect(items[2].nativeElement.textContent).toContain("Tool D");
  });

  it("should navigate and close when clicking an item", async () => {
    const navigateSpy = vi.spyOn(router, "navigate");
    const closeSpy = vi.spyOn(component.close, "emit");

    component["query"].set("Tool D");
    fixture.detectChanges();
    await fixture.whenStable();

    const item = fixture.debugElement.query(By.css(".cmd-k-list-item"));
    item.nativeElement.click();

    expect(navigateSpy).toHaveBeenCalledWith(["tool-d"]);
    expect(closeSpy).toHaveBeenCalled();
  });

  it("should emit close event when clicking overlay", async () => {
    const closeSpy = vi.spyOn(component.close, "emit");
    const overlay = fixture.debugElement.query(By.css(".cmd-k-overlay"));
    overlay.nativeElement.click();

    expect(closeSpy).toHaveBeenCalled();
  });

  it("should emit close event when pressing Escape", async () => {
    const closeSpy = vi.spyOn(component.close, "emit");
    const event = new KeyboardEvent("keydown", { key: "Escape" });
    component["onEscape"](event);

    expect(closeSpy).toHaveBeenCalled();
  });

  it("should navigate to first item when pressing Enter in input", async () => {
    const navigateSpy = vi.spyOn(router, "navigate");
    const closeSpy = vi.spyOn(component.close, "emit");

    component["query"].set("工具");
    fixture.detectChanges();
    await fixture.whenStable();

    const event = new KeyboardEvent("keydown", { key: "Enter" });
    component["onInputEnter"](event);

    expect(navigateSpy).toHaveBeenCalledWith(["tool-a"]);
    expect(closeSpy).toHaveBeenCalled();
  });

  it("should focus first result when pressing ArrowDown or Tab in input", async () => {
    component["query"].set("工具");
    fixture.detectChanges();
    await fixture.whenStable();

    const event = new KeyboardEvent("keydown", { key: "ArrowDown" });
    component["onInputArrowDown"](event);

    // 由於 focusButton 使用了 queueMicrotask，我們用 await 處理
    await new Promise<void>((resolve) => queueMicrotask(() => resolve()));
    fixture.detectChanges();

    const firstButton = fixture.debugElement.queryAll(By.css(".cmd-k-list-item"))[0].nativeElement;
    expect(document.activeElement).toBe(firstButton);
    expect(component["focusedIndex"]()).toBe(0);
  });

  it("should match tools by category name even when the label does not match", async () => {
    component["query"].set("Group B");
    fixture.detectChanges();
    await fixture.whenStable();

    const items = fixture.debugElement.queryAll(By.css(".cmd-k-list-item"));
    expect(items.length).toBe(1);
    expect(items[0].nativeElement.textContent).toContain("Tool D");
  });

  it("should not match unavailable tools even by category name", async () => {
    component["query"].set("Group A");
    fixture.detectChanges();
    await fixture.whenStable();

    const items = fixture.debugElement.queryAll(By.css(".cmd-k-list-item"));
    expect(items.length).toBe(2);
    expect(items[0].nativeElement.textContent).toContain("工具 A");
    expect(items[1].nativeElement.textContent).toContain("工具 B");
  });
});
