import {
  Component,
  ElementRef,
  HostListener,
  signal,
  viewChild,
} from "@angular/core";
import { RouterLink, RouterLinkActive, RouterOutlet } from "@angular/router";

interface ToolItem {
  readonly label: string;
  readonly route?: string;
  readonly available: boolean;
}

interface ToolGroup {
  readonly name: string;
  readonly tools: readonly ToolItem[];
}

@Component({
  selector: "app-layout",
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: "./layout.html",
  styleUrl: "./layout.css",
})
export class Layout {
  protected readonly sidebarOpen = signal(false);

  private readonly hamburger =
    viewChild<ElementRef<HTMLButtonElement>>("hamburger");
  private readonly sidebar = viewChild<ElementRef<HTMLElement>>("sidebar");

  protected readonly toolGroups: readonly ToolGroup[] = [
    {
      name: "文字工具",
      tools: [{ label: "字數統計", route: "word-count", available: true }],
    },
  ];

  protected toggleSidebar(): void {
    this.sidebarOpen() ? this.closeSidebar() : this.openSidebar();
  }

  protected openSidebar(): void {
    this.sidebarOpen.set(true);
    // Move focus into the drawer for keyboard / screen-reader users.
    queueMicrotask(() => {
      const firstLink =
        this.sidebar()?.nativeElement.querySelector<HTMLElement>(
          'a, [tabindex="0"]',
        );
      firstLink?.focus();
    });
  }

  protected closeSidebar(): void {
    if (!this.sidebarOpen()) {
      return;
    }
    this.sidebarOpen.set(false);
    // Return focus to the trigger when closing the off-canvas drawer.
    this.hamburger()?.nativeElement.focus();
  }

  @HostListener("document:keydown.escape")
  protected onEscape(): void {
    this.closeSidebar();
  }
}
