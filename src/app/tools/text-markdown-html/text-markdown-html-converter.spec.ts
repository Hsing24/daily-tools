import {
  convertTextToMarkdownAndHtml,
  convertHtmlToMarkdown,
} from "./text-markdown-html-converter";

describe("convertTextToMarkdownAndHtml", () => {
  it("應該正確處理空字串", () => {
    const result = convertTextToMarkdownAndHtml("");
    expect(result.markdown).toBe("");
    expect(result.html).toBe("");
  });

  it("應該正確處理僅空白或換行", () => {
    const result = convertTextToMarkdownAndHtml("   \n\n  ");
    expect(result.markdown).toBe("");
    expect(result.html).toBe("");
  });

  it("應該正確處理單一段落", () => {
    const result = convertTextToMarkdownAndHtml("hello");
    expect(result.markdown).toBe("hello");
    expect(result.html).toBe("<p>hello</p>");
  });

  it("應該正確處理多個段落", () => {
    const result = convertTextToMarkdownAndHtml("第一段\n\n第二段");
    expect(result.markdown).toBe("第一段\n\n第二段");
    expect(result.html).toBe("<p>第一段</p>\n<p>第二段</p>");
  });

  it("應該正確處理段落內換行", () => {
    const result = convertTextToMarkdownAndHtml("line1\nline2");
    expect(result.markdown).toBe("line1\nline2");
    expect(result.html).toBe("<p>line1<br>line2</p>");
  });

  it("應該移除前後多餘的空行", () => {
    const result = convertTextToMarkdownAndHtml("\n\n\nhello\n\n\n");
    expect(result.markdown).toBe("hello");
    expect(result.html).toBe("<p>hello</p>");
  });

  it("應該合併連續的多個空行", () => {
    const result = convertTextToMarkdownAndHtml("第一段\n\n\n\n第二段");
    expect(result.markdown).toBe("第一段\n\n第二段");
    expect(result.html).toBe("<p>第一段</p>\n<p>第二段</p>");
  });

  it("應該將 Markdown 語法轉換為 HTML，且 Markdown 欄位保持原樣不跳脫", () => {
    const result = convertTextToMarkdownAndHtml("# 標題\n\n這是**粗體**與*斜體*還有[連結](https://google.com)");
    expect(result.markdown).toBe("# 標題\n\n這是**粗體**與*斜體*還有[連結](https://google.com)");
    expect(result.html).toBe(
      "<h1>標題</h1>\n<p>這是<strong>粗體</strong>與<em>斜體</em>還有<a href=\"https://google.com\">連結</a></p>"
    );
  });

  it("應該正確將 HTML 富文本轉換成 Markdown (convertHtmlToMarkdown)", () => {
    const htmlInput = "<h1>Conventional Commits</h1><p>Please visit <a href=\"https://example.com\">our site</a> and <strong>be bold</strong>.</p>";
    const result = convertHtmlToMarkdown(htmlInput);
    expect(result).toBe("# Conventional Commits\n\nPlease visit [our site](https://example.com) and **be bold**.");
  });

  it("效能驗收：應在 1 秒內完成 50,000 字元的大量文字轉換 (SC-001, T027)", () => {
    const baseSegment = "這是測試段落中的第一行文字。\n這是同一段落的第二行，含有一些 *特殊字元* 和 <p>HTML 標籤</p>。\n\n";
    const repeatCount = Math.ceil(50000 / baseSegment.length);
    const largeInput = baseSegment.repeat(repeatCount);

    const start = performance.now();
    const result = convertTextToMarkdownAndHtml(largeInput);
    const end = performance.now();
    const duration = end - start;

    expect(result.markdown).toBeTruthy();
    expect(result.html).toBeTruthy();
    expect(duration).toBeLessThan(1000);
  });
});
