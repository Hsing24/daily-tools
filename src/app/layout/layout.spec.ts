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

  it("should render the active tool group in the sidebar", async () => {
    const fixture = TestBed.createComponent(Layout);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelectorAll(".nav-label").length).toBe(1);
  });

  it("should keep the sidebar closed by default", async () => {
    const fixture = TestBed.createComponent(Layout);
    await fixture.whenStable();
    const sidebar = fixture.nativeElement.querySelector(
      "#tool-sidebar",
    ) as HTMLElement;

    expect(sidebar.classList.contains("is-open")).toBe(false);
  });

  it("should open the sidebar when the menu button is clicked", async () => {
    const fixture = TestBed.createComponent(Layout);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const button = compiled.querySelector(".hamburger-btn") as HTMLButtonElement;

    button.click();
    await fixture.whenStable();

    const sidebar = compiled.querySelector("#tool-sidebar") as HTMLElement;
    expect(sidebar.classList.contains("is-open")).toBe(true);
    expect(button.getAttribute("aria-expanded")).toBe("true");
  });

  it("should close the sidebar when toggled twice", async () => {
    const fixture = TestBed.createComponent(Layout);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const button = compiled.querySelector(".hamburger-btn") as HTMLButtonElement;

    button.click();
    await fixture.whenStable();
    button.click();
    await fixture.whenStable();

    const sidebar = compiled.querySelector("#tool-sidebar") as HTMLElement;
    expect(sidebar.classList.contains("is-open")).toBe(false);
    expect(button.getAttribute("aria-expanded")).toBe("false");
  });
});
