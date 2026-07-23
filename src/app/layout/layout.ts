import {
  Component,
  ElementRef,
  HostListener,
  signal,
  viewChild,
  inject,
} from "@angular/core";
import { RouterLink, RouterOutlet, Router, NavigationEnd } from "@angular/router";
import { filter } from "rxjs/operators";
import { CommandPalette } from "./command-palette";

interface ToolItem {
  readonly label: string;
  readonly route?: string;
  readonly available: boolean;
  readonly keywords?: readonly string[];
}

interface ToolGroup {
  readonly name: string;
  readonly tools: readonly ToolItem[];
}

@Component({
  selector: "app-layout",
  imports: [RouterOutlet, RouterLink, CommandPalette],
  templateUrl: "./layout.html",
  styleUrl: "./layout.css",
  host: {
    class: "d:block min-h:100vh bg:canvas",
  },
})
export class Layout {
  protected readonly isPaletteOpen = signal(false);

  private readonly cmdKBtn =
    viewChild<ElementRef<HTMLButtonElement>>("cmdKBtn");

  protected readonly toolGroups: readonly ToolGroup[] = [
    {
      name: "文字工具",
      tools: [
        {
          label: "字數統計",
          route: "word-count",
          available: true,
          keywords: ["word-count", "word", "count"],
        },
        {
          label: "文字轉 Markdown/HTML",
          route: "text-markdown-html",
          available: true,
          keywords: ["text-markdown-html", "text", "markdown", "html"],
        },
        {
          label: "文字差異比對",
          route: "diff-checker",
          available: true,
          keywords: ["diff-checker", "diff", "checker"],
        },
      ],
    },
    {
      name: "格式化 / 轉換",
      tools: [
        {
          label: "圖片轉檔",
          route: "image-converter",
          available: true,
          keywords: ["image-converter", "image", "converter"],
        },
        {
          label: "SVG 描圖",
          route: "svg-draw",
          available: true,
          keywords: ["svg-draw", "svg", "draw"],
        },
        {
          label: "圖片 ASCII 轉換器",
          route: "image-to-ascii",
          available: true,
          keywords: ["image-to-ascii", "image", "ascii"],
        },
      ],
    },
    {
      name: "資料與解析",
      tools: [
        {
          label: "密碼產生器",
          route: "password-generator",
          available: true,
          keywords: ["password-generator", "password", "generator"],
        },
      ],
    },
    {
      name: "系統",
      tools: [
        {
          label: "設計系統",
          route: "design",
          available: true,
          keywords: ["design", "system"],
        },
      ],
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

  @HostListener("document:keydown.escape")
  protected onEscape(): void {
    if (this.isPaletteOpen()) {
      this.closePalette();
    }
  }
}
