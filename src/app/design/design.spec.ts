import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";

import { Design } from "./design";

describe("Design", () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Design],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it("should create the design page", () => {
    const fixture = TestBed.createComponent(Design);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it("should render the hero title", async () => {
    const fixture = TestBed.createComponent(Design);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector("h1")?.textContent).toContain(
      "DevTool Terminal",
    );
  });

  it("should render all 8 spec sections", async () => {
    const fixture = TestBed.createComponent(Design);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    const sectionIds = Array.from(
      compiled.querySelectorAll("section.section"),
    ).map((el) => el.id);

    expect(sectionIds).toEqual([
      "colors",
      "typography",
      "components",
      "layout-chassis",
      "tiles",
      "command",
      "forms",
      "responsive",
    ]);
  });

  it("should render the Solarized Light syntax swatches with DESIGN.md hex values", async () => {
    const fixture = TestBed.createComponent(Design);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).toContain("Solarized Light Syntax");
    expect(compiled.textContent).toContain("#FDF6E3");
    expect(compiled.textContent).not.toContain("#002B36");
  });

  it("should toggle the segmented control demo state", async () => {
    const fixture = TestBed.createComponent(Design);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    const buttons = compiled.querySelectorAll<HTMLButtonElement>(
      ".segmented-control button",
    );
    expect(buttons[0]?.getAttribute("aria-pressed")).toBe("true");

    buttons[1]?.click();
    await fixture.whenStable();

    expect(buttons[1]?.getAttribute("aria-pressed")).toBe("true");
    expect(buttons[0]?.getAttribute("aria-pressed")).toBe("false");
  });
});
