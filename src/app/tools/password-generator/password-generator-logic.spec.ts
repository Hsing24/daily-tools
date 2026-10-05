import { describe, it, expect, vi } from "vitest";
import {
  checkPasswordRules,
  estimatePasswordStrength,
  generatePassword,
  generateRandomOptions,
  secureRandomInt,
  type PasswordOptions,
  type RandomSource,
} from "./password-generator-logic";

const baseOptions: PasswordOptions = {
  length: 16,
  useUppercase: true,
  useLowercase: true,
  useNumbers: true,
  useSymbols: true,
  excludeAmbiguous: false,
  uniqueOnly: false,
  firstCharRule: "any",
};

function sequenceRandom(...values: number[]): RandomSource {
  let index = 0;
  return {
    getRandomValues: vi.fn((array: Uint32Array) => {
      array[0] = values[index % values.length] ?? 0;
      index += 1;
      return array;
    }),
  };
}

describe("PasswordGenerator Logic", () => {
  describe("generatePassword", () => {
    const numberOnly: PasswordOptions = {
      ...baseOptions,
      length: 4,
      useUppercase: false,
      useLowercase: false,
      useSymbols: false,
    };

    it("單一字元池的熵等於實際可選排列數", () => {
      const repeated = generatePassword(numberOnly);
      const unique = generatePassword({ ...numberOnly, uniqueOnly: true });
      expect(repeated.success && repeated.entropyBits).toBeCloseTo(
        Math.log2(10 ** 4),
      );
      expect(unique.success && unique.entropyBits).toBeCloseTo(
        Math.log2(10 * 9 * 8 * 7),
      );
    });

    it("熵包含強制字元類型與首字限制", () => {
      const options = { ...numberOnly, useUppercase: true };
      const any = generatePassword(options);
      const upper = generatePassword({ ...options, firstCharRule: "upper" });
      const unique = generatePassword({
        ...options,
        firstCharRule: "upper",
        uniqueOnly: true,
      });
      expect(any.success && any.entropyBits).toBeCloseTo(
        Math.log2(36 ** 4 - 26 ** 4 - 10 ** 4),
      );
      expect(upper.success && upper.entropyBits).toBeCloseTo(
        Math.log2(26 * (36 ** 3 - 26 ** 3)),
      );
      expect(unique.success && unique.entropyBits).toBeCloseTo(
        Math.log2(26 * (35 * 34 * 33 - 25 * 24 * 23)),
      );
    });

    it("四種字元的最短密碼只計入每類各一個的排列", () => {
      const result = generatePassword({ ...baseOptions, length: 4 });
      const symbols = "!@#$%^&*()_+-=[]{}|;':\",./<>?".length;
      expect(result.success && result.entropyBits).toBeCloseTo(
        Math.log2(24 * 26 * 26 * 10 * symbols),
      );
    });

    it("以批次 Web Crypto 取得亂數，避免每字元呼叫一次", () => {
      const random: RandomSource = {
        getRandomValues: vi.fn((array) => {
          array.fill(0);
          return array;
        }),
      };
      const result = generatePassword({ ...numberOnly, length: 64 }, random);
      expect(result.success && result.password).toBe("0".repeat(64));
      expect(random.getRandomValues).toHaveBeenCalledTimes(1);
    });

    it("拒絕缺少類型的完整候選，不插入偏差的強制字元", () => {
      const random: RandomSource = {
        getRandomValues: vi.fn((array) => {
          array.fill(0);
          array.set([0, 0, 0, 0, 0, 26, 26, 26]);
          return array;
        }),
      };
      const result = generatePassword(
        {
          ...numberOnly,
          useUppercase: true,
          useLowercase: true,
          useNumbers: false,
        },
        random,
      );
      expect(result.success && result.password).toBe("Aaaa");
    });

    it("長度不合法時回傳具名錯誤", () => {
      const result = generatePassword({ ...baseOptions, length: 3 });
      expect(result).toEqual({ success: false, code: "invalid-length" });
    });

    it("沒有選擇字元類型時回傳具名錯誤", () => {
      const result = generatePassword({
        ...baseOptions,
        useUppercase: false,
        useLowercase: false,
        useNumbers: false,
        useSymbols: false,
      });
      expect(result).toEqual({ success: false, code: "no-character-pool" });
    });

    it("應該產生正確長度的密碼", () => {
      const len = 20;
      const result = generatePassword({ ...baseOptions, length: len });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.password.length).toBe(len);
        expect(result.effectiveLength).toBe(len);
      }
    });

    it("應該符合所勾選的強制規則", () => {
      const result = generatePassword({ ...baseOptions, length: 10 });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(/[A-Z]/.test(result.password)).toBe(true);
        expect(/[a-z]/.test(result.password)).toBe(true);
        expect(/[0-9]/.test(result.password)).toBe(true);
        expect(/[!@#$%^&*()_+\-=\[\]{}|;':",./<>?]/.test(result.password)).toBe(
          true,
        );
      }
    });

    it("應該在排除易混淆字元啟用時，不包含任何易混淆字元", () => {
      const result = generatePassword({
        ...baseOptions,
        length: 50,
        excludeAmbiguous: true,
      });

      const ambiguousChars = ["i", "l", "1", "I", "o", "0", "O", "L"];
      expect(result.success).toBe(true);
      if (result.success) {
        for (const char of ambiguousChars) {
          expect(result.password.includes(char)).toBe(false);
        }
      }
    });

    it("應該在啟用避免重複字元時產生不重複字元密碼", () => {
      const result = generatePassword({
        ...baseOptions,
        length: 25,
        uniqueOnly: true,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        const charSet = new Set(result.password);
        expect(charSet.size).toBe(result.password.length);
      }
    });

    it("應該符合首字大寫規則", () => {
      const result = generatePassword({
        ...baseOptions,
        length: 12,
        firstCharRule: "upper",
      });

      expect(result.success).toBe(true);
      if (result.success)
        expect(/[A-Z]/.test(result.password[0] ?? "")).toBe(true);
    });

    it("應該符合首字為字母規則", () => {
      const result = generatePassword({
        ...baseOptions,
        length: 12,
        firstCharRule: "letter",
      });

      expect(result.success).toBe(true);
      if (result.success)
        expect(/[a-zA-Z]/.test(result.password[0] ?? "")).toBe(true);
    });

    it("首字規則不可使用未啟用字元池", () => {
      const result = generatePassword({
        ...baseOptions,
        useUppercase: false,
        useLowercase: false,
        firstCharRule: "upper",
      });

      expect(result).toEqual({
        success: false,
        code: "first-char-unavailable",
      });
    });

    it("不重複長度超過字元池時不得靜默縮短", () => {
      const result = generatePassword({
        ...baseOptions,
        length: 65,
        uniqueOnly: true,
      });

      expect(result).toEqual({ success: false, code: "invalid-length" });

      const singlePool = generatePassword({
        ...baseOptions,
        length: 20,
        useUppercase: false,
        useLowercase: false,
        useNumbers: true,
        useSymbols: false,
        uniqueOnly: true,
      });
      expect(singlePool).toEqual({
        success: false,
        code: "unique-length-exceeded",
      });
    });
  });

  describe("secureRandomInt", () => {
    it("應拒絕會造成 modulo bias 的高位值", () => {
      const random = sequenceRandom(0xffffffff, 12);

      expect(secureRandomInt(10, random)).toBe(2);
      expect(random.getRandomValues).toHaveBeenCalledTimes(2);
    });
  });

  describe("checkPasswordRules", () => {
    it("應該能正確檢測密碼規則符合度", () => {
      const match1 = checkPasswordRules("Abc!");
      expect(match1.hasUppercase).toBe(true);
      expect(match1.hasLowercase).toBe(true);
      expect(match1.hasNumbers).toBe(false);
      expect(match1.hasSymbols).toBe(true);
      expect(match1.hasNoAmbiguous).toBe(true);
      expect(match1.isFirstUpper).toBe(true);
      expect(match1.isFirstLetter).toBe(true);
    });

    it("應該能檢測出含有易混淆字元", () => {
      const match = checkPasswordRules("Abc1l!"); // 含有 '1' 和 'l'
      expect(match.hasNoAmbiguous).toBe(false);
    });

    it("應該正確判定密碼強度", () => {
      // 弱密碼
      expect(estimatePasswordStrength("abc").strength).toBe("weak");

      // 中等密碼
      expect(estimatePasswordStrength("Abc23456").strength).toBe("medium");

      // 強密碼
      expect(estimatePasswordStrength("Abc2!xyz9876").strength).toBe("strong");

      // 極強密碼
      expect(estimatePasswordStrength("AbcDef234!@#xyz98").strength).toBe(
        "very-strong",
      );
    });
  });

  describe("generateRandomOptions", () => {
    it("應該產生合理且非空的選項", () => {
      const opts = generateRandomOptions();
      expect(opts.length).toBeGreaterThanOrEqual(12);
      expect(opts.length).toBeLessThanOrEqual(28);

      const hasAtLeastOne =
        opts.useUppercase ||
        opts.useLowercase ||
        opts.useNumbers ||
        opts.useSymbols;
      expect(hasAtLeastOne).toBe(true);
      expect(opts.firstCharRule).toBeTruthy();
    });
  });
});
