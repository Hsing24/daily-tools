import {
  Component,
  ElementRef,
  HostListener,
  signal,
  viewChild,
  inject,
} from "@angular/core";
import { RouterLink, RouterLinkActive, RouterOutlet, Router, NavigationEnd } from "@angular/router";
import { filter } from "rxjs/operators";
import { CommandPalette } from "./command-palette";

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
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommandPalette],
  templateUrl: "./layout.html",
  styleUrl: "./layout.css",
})
export class Layout {
  protected readonly sidebarOpen = signal(false);
  protected readonly isPaletteOpen = signal(false);

  private readonly hamburger =
    viewChild<ElementRef<HTMLButtonElement>>("hamburger");
  private readonly sidebar = viewChild<ElementRef<HTMLElement>>("sidebar");
  private readonly cmdKBtn =
    viewChild<ElementRef<HTMLButtonElement>>("cmdKBtn");

  protected readonly toolGroups: readonly ToolGroup[] = [
    {
      name: "文字工具",
      tools: [
        { label: "字數統計", route: "word-count", available: true },
        {
          label: "文字轉 Markdown/HTML",
          route: "text-markdown-html",
          available: true,
        },
      ],
    },
    {
      name: "系統",
      tools: [{ label: "設計系統", route: "design", available: true }],
    },
  ];

  private readonly router = inject(Router);
  protected readonly currentPath = signal("~");
  protected readonly currentTheme = signal<"default" | "solarized">("default");

  constructor() {
    const initialUrl = this.router.url;
    this.setPathFromUrl(initialUrl);

    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event) => {
      this.setPathFromUrl(event.urlAfterRedirects || event.url);
    });
  }

  private setPathFromUrl(url: string): void {
    if (url === "/" || url === "") {
      this.currentPath.set("~");
    } else {
      const cleanUrl = url.split("?")[0];
      this.currentPath.set(`~${cleanUrl}`);
    }
  }

  protected setTheme(theme: "default" | "solarized"): void {
    this.currentTheme.set(theme);
    if (theme === "solarized") {
      document.documentElement.setAttribute("data-theme", "solarized");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  }

  protected openPalette(): void {
    this.isPaletteOpen.set(true);
  }

  protected closePalette(): void {
    this.isPaletteOpen.set(false);
    // 將焦點還給啟動按鈕
    this.cmdKBtn()?.nativeElement.focus();
  }

  @HostListener("document:keydown", ["$event"])
  protected onDocumentKeyDown(event: KeyboardEvent): void {
    // 檢查目前焦點是否在輸入元件上，避免干擾正常打字
    const activeEl = document.activeElement;
    if (
      activeEl &&
      (activeEl.tagName === "INPUT" ||
        activeEl.tagName === "TEXTAREA" ||
        activeEl.hasAttribute("contenteditable"))
    ) {
      return;
    }

    if (event.key === "/") {
      event.preventDefault();
      this.isPaletteOpen() ? this.closePalette() : this.openPalette();
    }
  }

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
    if (this.isPaletteOpen()) {
      this.closePalette();
    } else {
      this.closeSidebar();
    }
  }
}
