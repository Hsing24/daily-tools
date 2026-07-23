import { Component, signal, computed } from "@angular/core";
import { generatePassword, checkPasswordRules, generateRandomOptions, PasswordOptions } from "./password-generator-logic";
import { ToolPanel } from "../../shared/ui/tool-panel/tool-panel";
import { ToolHeader } from "../../shared/ui/tool-header/tool-header";
import { ToolBreadcrumb } from "../../shared/ui/tool-breadcrumb/tool-breadcrumb";
import { ToolSlider } from "../../shared/ui/tool-slider/tool-slider";
import { ToolAlert } from "../../shared/ui/tool-alert/tool-alert";
import { ToolRadioGroup, RadioOption } from "../../shared/ui/tool-radio-group/tool-radio-group";

@Component({
  selector: "app-password-generator",
  imports: [
    ToolPanel,
    ToolHeader,
    ToolBreadcrumb,
    ToolSlider,
    ToolAlert,
    ToolRadioGroup
  ],
  templateUrl: "./password-generator.html",
  styleUrl: "./password-generator.css",
  host: {
    class: "d:block font-family:var(--font-mono) color:var(--ink)",
  },
})
export class PasswordGenerator {
  // 使用者設定選項
  protected readonly length = signal(16);
  protected readonly useUppercase = signal(true);
  protected readonly useLowercase = signal(true);
  protected readonly useNumbers = signal(true);
  protected readonly useSymbols = signal(true);
  protected readonly excludeAmbiguous = signal(false);
  protected readonly uniqueOnly = signal(false);
  protected readonly firstCharRule = signal<string>('any');

  // 首字規則下拉 Radio Group 的選項
  protected readonly firstCharOptions: RadioOption[] = [
    { value: "any", label: "不限首字" },
    { value: "letter", label: "首字為字母" },
    { value: "upper", label: "首字為大寫" }
  ];

  // 產生的密碼
  protected readonly password = signal("");
  protected readonly showPassword = signal(false);
  protected readonly alertMessage = signal("");
  protected readonly successMessage = signal("");

  // 實時分析產生的密碼所符合的規則
  protected readonly ruleMatches = computed(() => {
    return checkPasswordRules(this.password());
  });

  // 強度指示條的文字呈現
  protected readonly strengthBar = computed(() => {
    const match = this.ruleMatches();
    if (!this.password()) return "";
    switch (match.strength) {
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
    this.generate(); // 初始載入時即產生一個密碼
  }

  protected generate(): void {
    this.alertMessage.set("");
    this.successMessage.set("");
    
    const opts: PasswordOptions = {
      length: this.length(),
      useUppercase: this.useUppercase(),
      useLowercase: this.useLowercase(),
      useNumbers: this.useNumbers(),
      useSymbols: this.useSymbols(),
      excludeAmbiguous: this.excludeAmbiguous(),
      uniqueOnly: this.uniqueOnly(),
      firstCharRule: this.firstCharRule() as 'any' | 'letter' | 'upper'
    };

    if (!opts.useUppercase && !opts.useLowercase && !opts.useNumbers && !opts.useSymbols) {
      this.alertMessage.set("請至少選擇一種字元類型！");
      return;
    }

    // 當「不重複字元」被勾選時，長度不得大於啟用的字元池大小
    let availableCount = 0;
    const UPPER_LEN = opts.excludeAmbiguous ? 23 : 26; // 排除 I,O,L
    const LOWER_LEN = opts.excludeAmbiguous ? 23 : 26; // 排除 i,l,o
    const DIGITS_LEN = opts.excludeAmbiguous ? 8 : 10;  // 排除 0,1
    const SYMBOLS_LEN = 29; // 符號不含易混淆

    if (opts.useUppercase) availableCount += UPPER_LEN;
    if (opts.useLowercase) availableCount += LOWER_LEN;
    if (opts.useNumbers) availableCount += DIGITS_LEN;
    if (opts.useSymbols) availableCount += SYMBOLS_LEN;

    if (opts.uniqueOnly && opts.length > availableCount) {
      this.alertMessage.set(`警告：當前字元集總量為 ${availableCount}。已自動將長度調整為最大不重複值。`);
      this.length.set(availableCount);
      opts.length = availableCount;
    }

    const pass = generatePassword(opts);
    this.password.set(pass);
  }

  protected generateRandomly(): void {
    this.alertMessage.set("");
    this.successMessage.set("");
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

    const pass = generatePassword(randOpts);
    this.password.set(pass);
  }

  protected toggleShowPassword(): void {
    this.showPassword.update(v => !v);
  }

  protected async copyToClipboard(): Promise<void> {
    if (!this.password()) return;
    this.alertMessage.set("");
    this.successMessage.set("");
    try {
      await navigator.clipboard.writeText(this.password());
      this.successMessage.set("密碼已成功複製到剪貼簿！");
      setTimeout(() => {
        if (this.successMessage() === "密碼已成功複製到剪貼簿！") {
          this.successMessage.set("");
        }
      }, 3000);
    } catch (err) {
      this.alertMessage.set("複製失敗，請手動選取複製。");
    }
  }
}
