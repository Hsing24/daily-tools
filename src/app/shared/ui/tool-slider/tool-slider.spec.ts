import { ComponentFixture, TestBed } from "@angular/core/testing";
import { Component, signal } from "@angular/core";
import { ToolSlider } from "./tool-slider";

@Component({
  imports: [ToolSlider],
  template: `
    <app-tool-slider
      [min]="5"
      [max]="100"
      [(value)]="value"
      [ticks]="ticks"
      label="Test Slider"
    />
  `,
})
class TestHostComponent {
  value = signal(50);
  ticks = [5, 25, 50, 75, 100];
}

describe("ToolSlider", () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let hostComponent: TestHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent, ToolSlider],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    hostComponent = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    const sliderEl = fixture.nativeElement.querySelector("app-tool-slider");
    expect(sliderEl).toBeTruthy();
  });

  it("should render all ticks", () => {
    const ticks = fixture.nativeElement.querySelectorAll(".slider-tick");
    expect(ticks.length).toBe(5);
    expect(ticks[0].textContent?.trim()).toBe("5");
    expect(ticks[4].textContent?.trim()).toBe("100");
  });

  it("should highlight ticks below or equal to value", () => {
    const activeTicks = fixture.nativeElement.querySelectorAll(".slider-tick.is-active");
    // Value is 50, so 5, 25, 50 should be active
    expect(activeTicks.length).toBe(3);
    expect(activeTicks[0].textContent?.trim()).toBe("5");
    expect(activeTicks[1].textContent?.trim()).toBe("25");
    expect(activeTicks[2].textContent?.trim()).toBe("50");
  });

  it("should change value when tick is clicked", () => {
    const ticks = fixture.nativeElement.querySelectorAll(".slider-tick");
    ticks[3].click(); // click 75
    fixture.detectChanges();

    expect(hostComponent.value()).toBe(75);

    const activeTicks = fixture.nativeElement.querySelectorAll(".slider-tick.is-active");
    // Value is 75, so 5, 25, 50, 75 should be active
    expect(activeTicks.length).toBe(4);
  });
});
