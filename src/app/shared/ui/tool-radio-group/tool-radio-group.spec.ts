import { ComponentFixture, TestBed } from "@angular/core/testing";
import { Component, signal } from "@angular/core";
import { ToolRadioGroup, RadioOption } from "./tool-radio-group";

@Component({
  imports: [ToolRadioGroup],
  template: `
    <app-tool-radio-group
      [options]="testOptions"
      [(value)]="selectedValue"
      name="test-group"
    />
  `,
})
class TestHostComponent {
  testOptions: RadioOption[] = [
    { value: "opt1", label: "Option 1" },
    { value: "opt2", label: "Option 2" },
  ];
  selectedValue = signal("opt1");
}

describe("ToolRadioGroup", () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let hostComponent: TestHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent, ToolRadioGroup],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    hostComponent = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    const radioGroupEl = fixture.nativeElement.querySelector("app-tool-radio-group");
    expect(radioGroupEl).toBeTruthy();
  });

  it("should render all options with correct labels", () => {
    const labels = fixture.nativeElement.querySelectorAll(".radio-label-text");
    expect(labels.length).toBe(2);
    expect(labels[0].textContent?.trim()).toBe("Option 1");
    expect(labels[1].textContent?.trim()).toBe("Option 2");
  });

  it("should set active class on the checked option", () => {
    const options = fixture.nativeElement.querySelectorAll(".radio-option");
    expect(options[0].classList.contains("is-active")).toBe(true);
    expect(options[1].classList.contains("is-active")).toBe(false);
  });

  it("should change value when another option is clicked", async () => {
    const inputs = fixture.nativeElement.querySelectorAll(".radio-input");
    inputs[1].click();
    fixture.detectChanges();

    expect(hostComponent.selectedValue()).toBe("opt2");
    
    const options = fixture.nativeElement.querySelectorAll(".radio-option");
    expect(options[0].classList.contains("is-active")).toBe(false);
    expect(options[1].classList.contains("is-active")).toBe(true);
  });
});
