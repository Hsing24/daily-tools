import {
  ALL_SYMBOLS,
  SYMBOL_CATEGORIES,
  filterSymbols,
  matchesQuery,
  toCodePoint,
  toHtmlEntity,
  type SymbolItem,
} from "./emoji-n-symbols-core";

describe("emoji-n-symbols-core", () => {
  describe("靜態資料集驗證", () => {
    it("總符號數量應大於或等於 200", () => {
      expect(ALL_SYMBOLS.length).toBeGreaterThanOrEqual(200);
    });

    it("應涵蓋規格要求的 12 個分類", () => {
      const requiredCategories = [
        "表情/笑臉",
        "手勢/人物",
        "動物/自然",
        "食物",
        "物件/符號 emoji",
        "箭頭",
        "數學符號",
        "貨幣",
        "標點/排版",
        "框線/方塊字元",
        "希臘字母",
        "上下標",
      ];
      for (const cat of requiredCategories) {
        expect((SYMBOL_CATEGORIES as readonly string[]).includes(cat)).toBe(true);
      }
    });

    it("每個分類的符號數量應至少有 12 項", () => {
      for (const cat of SYMBOL_CATEGORIES) {
        const count = ALL_SYMBOLS.filter((s) => s.category === cat).length;
        expect(count).toBeGreaterThanOrEqual(12);
      }
    });

    it("每個符號項目屬性皆完整且無空值", () => {
      for (const item of ALL_SYMBOLS) {
        expect(item.char).toBeTruthy();
        expect(item.name.trim()).toBeTruthy();
        expect(item.category).toBeTruthy();
        expect(Array.isArray(item.keywords)).toBe(true);
      }
    });

    it("字元不可重複（元件以 char 作為 track key）", () => {
      const chars = ALL_SYMBOLS.map((s) => s.char);
      expect(new Set(chars).size).toBe(chars.length);
    });

    it("每個符號的 category 都屬於 SYMBOL_CATEGORIES", () => {
      const known = SYMBOL_CATEGORIES as readonly string[];
      for (const item of ALL_SYMBOLS) {
        expect(known.includes(item.category)).toBe(true);
      }
    });
  });

  describe("toCodePoint", () => {
    it("應正確將箭頭符號轉換為 U+2192", () => {
      expect(toCodePoint("→")).toBe("U+2192");
    });

    it("應正確將高位表情符號轉換為 U+1F600", () => {
      expect(toCodePoint("😀")).toBe("U+1F600");
    });

    it("空字串應回傳空字串", () => {
      expect(toCodePoint("")).toBe("");
    });

    it("多碼位組合字元應以空白分隔", () => {
      const cp = toCodePoint("✌️");
      expect(cp).toContain("U+270C");
      expect(cp).toContain("U+FE0F");
    });
    it("ZWJ 序列應以空白分隔每個碼位", () => {
      expect(toCodePoint("🧑‍💻")).toBe("U+1F9D1 U+200D U+1F4BB");
    });
  });

  describe("toHtmlEntity", () => {
    it("多碼位字元應串接各碼位的 entity", () => {
      expect(toHtmlEntity("✌️")).toBe("&#x270C;&#xFE0F;");
      expect(toHtmlEntity("🧑‍💻")).toBe("&#x1F9D1;&#x200D;&#x1F4BB;");
    });
    it("應正確轉換十六進位 HTML entity", () => {
      expect(toHtmlEntity("→")).toBe("&#x2192;");
      expect(toHtmlEntity("😀")).toBe("&#x1F600;");
    });

    it("空字串應回傳空字串", () => {
      expect(toHtmlEntity("")).toBe("");
    });
  });

  describe("matchesQuery & filterSymbols", () => {
    const mockList: readonly SymbolItem[] = [
      { char: "→", name: "向右箭頭", keywords: ["right", "arrow"], category: "箭頭" },
      { char: "←", name: "向左箭頭", keywords: ["left", "arrow"], category: "箭頭" },
      { char: "😀", name: "露齒笑臉", keywords: ["happy", "smile"], category: "表情/笑臉" },
      { char: "∑", name: "加總級數總和", keywords: ["sum", "sigma"], category: "數學符號" },
    ];

    it("空字串查詢應符合所有項目", () => {
      const result = filterSymbols(mockList, "", "全部");
      expect(result.length).toBe(mockList.length);
    });

    it("依字元本身比對", () => {
      const result = filterSymbols(mockList, "→", "全部");
      expect(result.length).toBe(1);
      expect(result[0].char).toBe("→");
    });

    it("依繁體中文名稱比對", () => {
      const result = filterSymbols(mockList, "笑臉", "全部");
      expect(result.length).toBe(1);
      expect(result[0].char).toBe("😀");
    });

    it("依關鍵字比對（不分大小寫）", () => {
      const result = filterSymbols(mockList, "HAPPY", "全部");
      expect(result.length).toBe(1);
      expect(result[0].char).toBe("😀");
    });

    it("依 Unicode 碼位 U+2192 比對", () => {
      const result = filterSymbols(mockList, "U+2192", "全部");
      expect(result.length).toBe(1);
      expect(result[0].char).toBe("→");
    });

    it("依小寫 u+2192 比對", () => {
      const result = filterSymbols(mockList, "u+2192", "全部");
      expect(result.length).toBe(1);
      expect(result[0].char).toBe("→");
    });

    it("依純十六進位 2192 比對", () => {
      const result = filterSymbols(mockList, "2192", "全部");
      expect(result.length).toBe(1);
      expect(result[0].char).toBe("→");
    });

    it("依分類過濾", () => {
      const result = filterSymbols(mockList, "", "箭頭");
      expect(result.length).toBe(2);
      expect(result.every((r) => r.category === "箭頭")).toBe(true);
    });

    it("組合查詢：同時指定關鍵字與分類", () => {
      const result = filterSymbols(mockList, "right", "箭頭");
      expect(result.length).toBe(1);
      expect(result[0].char).toBe("→");

      const notFound = filterSymbols(mockList, "right", "數學符號");
      expect(notFound.length).toBe(0);
    });

    it("未找到任何項目時應回傳空陣列", () => {
      const result = filterSymbols(mockList, "xyz9999", "全部");
      expect(result).toEqual([]);
    });

    it("可使用全域 ALL_SYMBOLS 作為預設資料來源", () => {
      const result = filterSymbols("2192");
      expect(result.some((r) => r.char === "→")).toBe(true);
    });

    it("單一「u」或「+」不應因碼位前綴而命中整張表", () => {
      expect(filterSymbols("u").length).toBeLessThan(ALL_SYMBOLS.length);
      expect(filterSymbols("+").length).toBeLessThan(ALL_SYMBOLS.length);
    });

    it("過短的純十六進位字串不做碼位比對", () => {
      const hexOnly = (q: string) =>
        filterSymbols(q).filter(
          (s) =>
            !s.char.toLowerCase().includes(q) &&
            !s.name.toLowerCase().includes(q) &&
            !s.keywords.some((k) => k.toLowerCase().includes(q))
        );
      expect(hexOnly("ab")).toEqual([]);
      expect(hexOnly("bee")).toEqual([]);
    });

    it("U+ 前綴支援前綴比對與省略前導零", () => {
      expect(filterSymbols("U+219").some((r) => r.char === "→")).toBe(true);
      expect(filterSymbols("U+B2").some((r) => r.char === "²")).toBe(true);
      expect(filterSymbols("1f60").some((r) => r.char === "😀")).toBe(true);
    });
  });
});
