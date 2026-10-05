import { Component, DestroyRef, computed, inject, signal } from "@angular/core";
import {
  checkPasswordRules,
  generatePassword,
  generateRandomOptions,
  type PasswordOptions,
  type PasswordStrengthEstimate,
} from "./password-generator-logic";
import { ToolPanel } from "../../shared/ui/tool-panel/tool-panel";
import { ToolHeader } from "../../shared/ui/tool-header/tool-header";
import { ToolBreadcrumb } from "../../shared/ui/tool-breadcrumb/tool-breadcrumb";
import { ToolSlider } from "../../shared/ui/tool-slider/tool-slider";
import { ToolAlert } from "../../shared/ui/tool-alert/tool-alert";
import {
  ToolRadioGroup,
  RadioOption,
} from "../../shared/ui/tool-radio-group/tool-radio-group";

@Component({
  selector: "app-password-generator",
  imports: [
    ToolPanel,
    ToolHeader,
    ToolBreadcrumb,
    ToolSlider,
    ToolAlert,
    ToolRadioGroup,
  ],
  templateUrl: "./password-generator.html",
  styleUrl: "./password-generator.css",
  host: {
    class: "d:block font-family:var(--font-mono) color:var(--ink)",
  },
})
export class PasswordGenerator {
  private readonly destroyRef = inject(DestroyRef);
  private successTimer: ReturnType<typeof setTimeout> | undefined;
  private copyRevision = 0;

  // 使用者設定選項
  protected readonly length = signal(16);
  protected readonly useUppercase = signal(true);
  protected readonly useLowercase = signal(true);
  protected readonly useNumbers = signal(true);
  protected readonly useSymbols = signal(true);
  protected readonly excludeAmbiguous = signal(false);
  protected readonly uniqueOnly = signal(false);
  protected readonly firstCharRule =
    signal<PasswordOptions["firstCharRule"]>("any");

  // 首字規則下拉 Radio Group 的選項
  protected readonly firstCharOptions: RadioOption[] = [
    { value: "any", label: "不限首字" },
    { value: "letter", label: "首字為字母" },
    { value: "upper", label: "首字為大寫" },
  ];

  // 產生的密碼
  protected readonly password = signal("");
  protected readonly showPassword = signal(false);
  protected readonly alertMessage = signal("");
  protected readonly successMessage = signal("");
  protected readonly strengthEstimate = signal<PasswordStrengthEstimate>({
    entropyBits: 0,
    poolSize: 0,
    strength: "weak",
  });

  // 實時分析產生的密碼所符合的規則
  protected readonly ruleMatches = computed(() => {
    return checkPasswordRules(this.password());
  });

  // 強度指示條的文字呈現
  protected readonly strengthBar = computed(() => {
    if (!this.password()) return "";
    switch (this.strengthEstimate().strength) {
      case "very-strong":
        return "[============] 極強 (VERY STRONG)";
      case "strong":
        return "[==========..] 強 (STRONG)";
      case "medium":
        return "[######......] 中 (MEDIUM)";
      default:
        return "[##..........] 弱 (WEAK)";
    }
  });

  constructor() {
    this.destroyRef.onDestroy(() => this.clearSuccessTimer());
    this.generate(); // 初始載入時即產生一個密碼
  }

  protected generate(): void {
    const opts: PasswordOptions = {
      length: this.length(),
      useUppercase: this.useUppercase(),
      useLowercase: this.useLowercase(),
      useNumbers: this.useNumbers(),
      useSymbols: this.useSymbols(),
      excludeAmbiguous: this.excludeAmbiguous(),
      uniqueOnly: this.uniqueOnly(),
      firstCharRule: this.firstCharRule(),
    };

    this.applyGeneration(opts);
  }

  protected generateRandomly(): void {
    const randOpts = generateRandomOptions();

    // 更新 UI 控制元件的狀態，讓使用者看到當前隨機選擇的設定
    this.length.set(randOpts.length);
    this.useUppercase.set(randOpts.useUppercase);
    this.useLowercase.set(randOpts.useLowercase);
    this.useNumbers.set(randOpts.useNumbers);
    this.useSymbols.set(randOpts.useSymbols);
    this.excludeAmbiguous.set(randOpts.excludeAmbiguous);
    this.uniqueOnly.set(randOpts.uniqueOnly);
    this.firstCharRule.set(randOpts.firstCharRule);

    this.applyGeneration(randOpts);
  }

  protected toggleShowPassword(): void {
    this.showPassword.update((v) => !v);
  }

  protected async copyToClipboard(): Promise<void> {
    const password = this.password();
    if (!password) return;
    const revision = ++this.copyRevision;
    this.alertMessage.set("");
    this.successMessage.set("");
    this.clearSuccessTimer();
    try {
      await navigator.clipboard.writeText(password);
      if (this.destroyRef.destroyed || revision !== this.copyRevision) return;
      this.successMessage.set("密碼已成功複製到剪貼簿！");
      this.successTimer = setTimeout(() => {
        this.successMessage.set("");
        this.successTimer = undefined;
      }, 3000);
    } catch {
      if (this.destroyRef.destroyed || revision !== this.copyRevision) return;
      this.alertMessage.set("複製失敗，請手動選取複製。");
    }
  }

  private applyGeneration(options: PasswordOptions): void {
    this.copyRevision += 1;
    this.alertMessage.set("");
    this.successMessage.set("");
    this.clearSuccessTimer();

    const result = generatePassword(options);
    if (!result.success) {
      this.password.set("");
      this.strengthEstimate.set({
        entropyBits: 0,
        poolSize: 0,
        strength: "weak",
      });
      this.alertMessage.set(this.getGenerationError(result.code));
      return;
    }

    this.password.set(result.password);
    this.strengthEstimate.set({
      entropyBits: result.entropyBits,
      poolSize: result.poolSize,
      strength: result.strength,
    });
  }

  private getGenerationError(code: string): string {
    switch (code) {
      case "invalid-length":
        return "密碼長度必須介於 4 至 64。";
      case "no-character-pool":
        return "請至少選擇一種字元類型！";
      case "first-char-unavailable":
        return "目前字元設定無法符合首字規則。";
      case "unique-length-exceeded":
        return "不重複模式下，密碼長度不可超過目前字元集總量。";
      case "unique-character-unavailable":
        return "目前設定無法產生不重複密碼。";
      default:
        return "密碼設定無效，請檢查選項。";
    }
  }

  private clearSuccessTimer(): void {
    if (this.successTimer !== undefined) {
      clearTimeout(this.successTimer);
      this.successTimer = undefined;
    }
  }
}
