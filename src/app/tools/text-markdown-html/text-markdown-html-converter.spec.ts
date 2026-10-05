import {
  convertTextToMarkdownAndHtml,
  convertHtmlToMarkdown,
  convertMarkdownToHtml,
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
    const result = convertTextToMarkdownAndHtml(
      "# 標題\n\n這是**粗體**與*斜體*還有[連結](https://google.com)",
    );
    expect(result.markdown).toBe(
      "# 標題\n\n這是**粗體**與*斜體*還有[連結](https://google.com)",
    );
    expect(result.html).toBe(
      '<h1>標題</h1>\n<p>這是<strong>粗體</strong>與<em>斜體</em>還有<a href="https://google.com">連結</a></p>',
    );
  });

  it("應該保護危險連結與 HTML", () => {
    const result = convertMarkdownToHtml(
      '[安全](https://example.com "示例") [危險](javascript:alert(1))\n\n<script>alert(1)</script> <b>粗體</b>',
    );

    expect(result).toContain(
      '<a href="https://example.com" title="示例">安全</a>',
    );
    expect(result).not.toContain("javascript:");
    expect(result).not.toContain("<script");
    expect(result).not.toContain("<b>");
  });

  it("應支援巢狀清單、有序清單、程式碼區塊與括號 URL", () => {
    const result = convertMarkdownToHtml(
      "1. 第一項\n2. 第二項\n   - 巢狀項目\n\n```ts\nconst value = `code`\n```\n\n[文件](https://example.com/a_(b))",
    );

    expect(result).toContain("<ol>");
    expect(result).toContain("<li>巢狀項目</li>");
    expect(result).toContain("<pre><code>");
    expect(result).toContain('href="https://example.com/a_(b)"');
  });

  it("應該正確將 HTML 富文本轉換成 Markdown (convertHtmlToMarkdown)", () => {
    const htmlInput =
      '<h1>Conventional Commits</h1><p>Please visit <a href="https://example.com">our site</a> and <strong>be bold</strong>.</p>';
    const result = convertHtmlToMarkdown(htmlInput);
    expect(result).toBe(
      "# Conventional Commits\n\nPlease visit [our site](https://example.com) and **be bold**.",
    );
  });

  it("HTML 轉 Markdown 應保留有序清單與程式碼區塊，並移除危險連結", () => {
    const result = convertHtmlToMarkdown(
      '<ol><li>第一項</li><li>第二項</li></ol><pre><code>const x = `code`;</code></pre><a href="javascript:alert(1)">危險</a>',
    );

    expect(result).toContain("1.  第一項");
    expect(result).toContain("2.  第二項");
    expect(result).toContain("```\nconst x = `code`;\n```");
    expect(result).not.toContain("javascript:");
  });

  it("大量文字轉換應完整保留 50,000 字元段落 (SC-001, T027)", () => {
    const baseSegment =
      "這是測試段落中的第一行文字。\n這是同一段落的第二行，含有一些 *特殊字元* 和 <p>HTML 標籤</p>。\n\n";
    const repeatCount = Math.ceil(50000 / baseSegment.length);
    const largeInput = baseSegment.repeat(repeatCount);

    const result = convertTextToMarkdownAndHtml(largeInput);

    expect(result.markdown).toBeTruthy();
    expect(result.html).toBeTruthy();
    const output = document.createElement("div");
    output.innerHTML = result.html;
    expect(
      output.textContent?.match(/這是測試段落中的第一行文字。/g),
    ).toHaveLength(repeatCount);
    expect(output.textContent?.match(/HTML 標籤/g)).toHaveLength(repeatCount);
    expect(result.markdown.match(/這是測試段落中的第一行文字。/g)).toHaveLength(
      repeatCount,
    );
  });

  it("應保留 fenced code 與 indented code 的空白行及縮排", () => {
    for (const markdown of ["```\na\n\n\nb\n```", "    a\n\n\n    b"]) {
      const result = convertTextToMarkdownAndHtml(markdown);
      expect(result.markdown).toBe(markdown);
      const output = document.createElement("div");
      output.innerHTML = result.html;
      expect(output.querySelector("code")?.textContent).toBe("a\n\n\nb\n");
    }
  });

  it("富文本 code block 的空白行與 Markdown hard break 空白應保留", () => {
    expect(convertHtmlToMarkdown("<pre><code>a\n\n\nb</code></pre>")).toBe(
      "```\na\n\n\nb\n```",
    );
    expect(convertTextToMarkdownAndHtml("a  \nb").markdown).toBe("a  \nb");
  });

  it("表格、圖片與相對連結應能雙向轉換", () => {
    const html =
      '<table>\n<thead>\n<tr><th align="right">標題</th><th>內容</th></tr>\n</thead><tbody><tr><td>1</td><td>值</td></tr></tbody></table><p><a href="../guide?q=1#part">文件</a><img src="./photo.png" alt="測試圖"></p>';
    const markdown = convertHtmlToMarkdown(html);
    expect(markdown).toContain("| --: | --- |");
    expect(markdown).toContain("[文件](../guide?q=1#part)");
    expect(markdown).toContain("![測試圖](./photo.png)");
    const output = document.createElement("div");
    output.innerHTML = convertMarkdownToHtml(markdown);
    expect(output.querySelectorAll("table th")).toHaveLength(2);
    expect(output.querySelector("a")?.getAttribute("href")).toBe(
      "../guide?q=1#part",
    );
    expect(output.querySelector("img")?.getAttribute("src")).toBe(
      "./photo.png",
    );
  });

  it("表格 cell 的管線字元、空表格與合併 cell 應保留有效內容", () => {
    expect(convertHtmlToMarkdown("<table></table>")).toBe("");
    const markdown = convertHtmlToMarkdown(
      "<table><tr><th>欄位</th></tr><tr><td>a|b</td></tr></table>",
    );
    const output = document.createElement("div");
    output.innerHTML = convertMarkdownToHtml(markdown);
    expect(output.querySelector("td")?.textContent).toBe("a|b");
    const merged = convertHtmlToMarkdown(
      '<table><tr><th colspan="2">合併</th></tr><tr><td>a</td><td>b</td></tr></table>',
    );
    expect(merged).toContain('colspan="2"');
  });

  it("HTML 連結的括號、空白與 title 應維持正確目的地", () => {
    const markdown = convertHtmlToMarkdown(
      '<a href="https://example.com/a)b c" title="引號 &quot;測試&quot;">文件</a>',
    );
    const output = document.createElement("div");
    output.innerHTML = convertMarkdownToHtml(markdown);
    expect(output.querySelector("a")?.getAttribute("href")).toBe(
      "https://example.com/a)b%20c",
    );
    expect(output.querySelector("a")?.getAttribute("title")).toBe(
      '引號 "測試"',
    );
  });

  it("保留圖片與 relative URLs 後仍應拒絕危險 scheme 與事件屬性", () => {
    const html = convertMarkdownToHtml(
      '<img src="data:text/html;base64,PHNjcmlwdD4=" onerror="alert(1)"><img src="javascript:alert(1)"><a href="java&#x09;script:alert(1)">危險</a><a href="vbscript:evil">危險</a><a href="unknown1:evil">未知</a>',
    );
    expect(html).not.toMatch(
      /(?:src|href)="(?:data:|javascript:|vbscript:|unknown1:)/i,
    );
    expect(html).not.toContain("onerror");
  });

  it("Markdown 匯出應移除危險 URL 與 HTML，保留 code span 內的原始範例", () => {
    const result = convertTextToMarkdownAndHtml(
      "[危險](javascript:alert(1)) [安全](./guide)\n\n<script>alert(1)</script>\n\n`[範例](javascript:alert(1))`\n\n![危險](data:text/html,evil)",
    );
    expect(result.markdown).toContain("[安全](./guide)");
    expect(result.markdown).not.toContain("[危險](javascript:");
    expect(result.markdown).not.toContain("<script>");
    expect(result.markdown).not.toContain("data:text/html");
    expect(result.markdown).toContain("`[範例](javascript:alert(1))`");
    expect(
      convertTextToMarkdownAndHtml("[危險](java&#x73;cript:alert(1))").markdown,
    ).toBe("危險");
  });

  it("清理危險 HTML block 後應保留相鄰段落的分隔", () => {
    const result = convertTextToMarkdownAndHtml(
      'before\n\n<p onclick="evil()">inside</p>\n\nafter',
    );
    expect(result.markdown).toBe("before\n\ninside\n\nafter");
    expect(
      convertTextToMarkdownAndHtml("<script>alert(1)</script>\n\n"),
    ).toEqual({ markdown: "", html: "" });
  });
});
