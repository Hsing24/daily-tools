import { describe, it, expect } from "vitest";
import { generatePassword, checkPasswordRules, generateRandomOptions } from "./password-generator-logic";

describe("PasswordGenerator Logic", () => {
  describe("generatePassword", () => {
    it("應該在長度小於 4 時回傳空字串", () => {
      const result = generatePassword({
        length: 3,
        useUppercase: true,
        useLowercase: true,
        useNumbers: true,
        useSymbols: true,
        excludeAmbiguous: false,
        uniqueOnly: false,
        firstCharRule: 'any',
      });
      expect(result).toBe("");
    });

    it("應該在沒有選擇任何字元類型時回傳空字串", () => {
      const result = generatePassword({
        length: 16,
        useUppercase: false,
        useLowercase: false,
        useNumbers: false,
        useSymbols: false,
        excludeAmbiguous: false,
        uniqueOnly: false,
        firstCharRule: 'any',
      });
      expect(result).toBe("");
    });

    it("應該產生正確長度的密碼", () => {
      const len = 20;
      const result = generatePassword({
        length: len,
        useUppercase: true,
        useLowercase: true,
        useNumbers: true,
        useSymbols: true,
        excludeAmbiguous: false,
        uniqueOnly: false,
        firstCharRule: 'any',
      });
      expect(result.length).toBe(len);
    });

    it("應該符合所勾選的強制規則", () => {
      const result = generatePassword({
        length: 10,
        useUppercase: true,
        useLowercase: true,
        useNumbers: true,
        useSymbols: true,
        excludeAmbiguous: false,
        uniqueOnly: false,
        firstCharRule: 'any',
      });

      expect(/[A-Z]/.test(result)).toBe(true);
      expect(/[a-z]/.test(result)).toBe(true);
      expect(/[0-9]/.test(result)).toBe(true);
      expect(/[!@#$%^&*()_+\-=\[\]{}|;':",./<>?]/.test(result)).toBe(true);
    });

    it("應該在排除易混淆字元啟用時，不包含任何易混淆字元", () => {
      const result = generatePassword({
        length: 50,
        useUppercase: true,
        useLowercase: true,
        useNumbers: true,
        useSymbols: true,
        excludeAmbiguous: true,
        uniqueOnly: false,
        firstCharRule: 'any',
      });

      const ambiguousChars = ["i", "l", "1", "I", "o", "0", "O", "L"];
      for (const char of ambiguousChars) {
        expect(result.includes(char)).toBe(false);
      }
    });

    it("應該在啟用避免重複字元時產生不重複字元密碼", () => {
      const result = generatePassword({
        length: 25,
        useUppercase: true,
        useLowercase: true,
        useNumbers: true,
        useSymbols: true,
        excludeAmbiguous: false,
        uniqueOnly: true,
        firstCharRule: 'any',
      });

      const charSet = new Set(result);
      expect(charSet.size).toBe(result.length);
    });

    it("應該符合首字大寫規則", () => {
      const result = generatePassword({
        length: 12,
        useUppercase: true,
        useLowercase: true,
        useNumbers: true,
        useSymbols: true,
        excludeAmbiguous: false,
        uniqueOnly: false,
        firstCharRule: 'upper',
      });

      expect(/[A-Z]/.test(result[0])).toBe(true);
    });

    it("應該符合首字為字母規則", () => {
      const result = generatePassword({
        length: 12,
        useUppercase: true,
        useLowercase: true,
        useNumbers: true,
        useSymbols: true,
        excludeAmbiguous: false,
        uniqueOnly: false,
        firstCharRule: 'letter',
      });

      expect(/[a-zA-Z]/.test(result[0])).toBe(true);
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
      const weak1 = checkPasswordRules("abc");
      expect(weak1.strength).toBe("weak");

      // 中等密碼
      const medium = checkPasswordRules("Abc23456"); // 長度 8，大寫+小寫+數字 = 3 分 + 長度>=8無重複 + 首字字母 = 5 分
      expect(medium.strength).toBe("medium");

      // 強密碼
      const strong = checkPasswordRules("Abc2!xyz9876"); // 長度 12
      expect(strong.strength).toBe("strong");

      // 極強密碼
      const veryStrong = checkPasswordRules("AbcDef234!@#xyz98"); // 長度 17
      expect(veryStrong.strength).toBe("very-strong");
    });
  });

  describe("generateRandomOptions", () => {
    it("應該產生合理且非空的選項", () => {
      const opts = generateRandomOptions();
      expect(opts.length).toBeGreaterThanOrEqual(12);
      expect(opts.length).toBeLessThanOrEqual(28);
      
      const hasAtLeastOne = opts.useUppercase || opts.useLowercase || opts.useNumbers || opts.useSymbols;
      expect(hasAtLeastOne).toBe(true);
      expect(opts.firstCharRule).toBeTruthy();
    });
  });
});
