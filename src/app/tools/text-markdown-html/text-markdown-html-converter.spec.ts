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
    expect(result).toContain("<b>粗體</b>");
  });

  it("應支援巢狀清單、有序清單、程式碼區塊與括號 URL", () => {
    const result = convertMarkdownToHtml(
      "1. 第一項\n2. 第二項\n   - 巢狀項目\n\n```ts\nconst value = `code`\n```\n\n[文件](https://example.com/a_(b))",
    );

    expect(result).toContain("<ol>");
    expect(result).toContain("<li>巢狀項目</li>");
    expect(result).toContain('<pre><code class="language-ts">');
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

  it("富文本 b / i 應保留粗體與斜體語意", () => {
    const markdown = convertHtmlToMarkdown(
      '<p><b onclick="evil()">粗體</b>與<i>斜體</i></p>',
    );
    expect(markdown).toBe("**粗體**與*斜體*");
    expect(convertMarkdownToHtml(markdown)).toBe(
      "<p><strong>粗體</strong>與<em>斜體</em></p>",
    );
  });

  it("只保留 code 的安全 language class，雙向轉換保留語言", () => {
    for (const language of ["c++", "c#", "f#", "js"]) {
      const markdown = convertHtmlToMarkdown(
        `<pre class="layout"><code class="hidden language-${language} other" onclick="evil()">code\n</code></pre>`,
      );
      expect(markdown).toBe(`\`\`\`${language}\ncode\n\`\`\``);
      expect(convertMarkdownToHtml(markdown)).toBe(
        `<pre><code class="language-${language}">code\n</code></pre>`,
      );
    }
    const html = convertMarkdownToHtml(
      '<p class="language-js">字</p><code class="hidden">a</code>',
    );
    expect(html).not.toContain("class=");
  });

  it("HTML pre 應成為 code block 並保留空白行、縮排與內嵌 fence", () => {
    for (const code of [
      "one\n  two\n\nthree\n",
      "\n\nconst x = 1;\n\n",
      "\n \t\n",
      "  ```\nconst x = '<tag>';\n  ```\n",
    ]) {
      const pre = document.createElement("pre");
      pre.textContent = code;
      // A leading newline immediately after <pre> is consumed by HTML parsing.
      const codeElement = document.createElement("code");
      codeElement.textContent = code;
      const html = `<pre>${codeElement.outerHTML}</pre>`;
      for (const input of [
        html,
        ...(code.startsWith("\n") ? [] : [pre.outerHTML]),
      ]) {
        const output = document.createElement("div");
        output.innerHTML = convertMarkdownToHtml(convertHtmlToMarkdown(input));
        expect(output.querySelector("pre code")?.textContent).toBe(code);
      }
    }
  });

  it("fenced code 的末端空白行不應被 renderer 吃掉", () => {
    const output = document.createElement("div");
    output.innerHTML = convertMarkdownToHtml("```\na\n\n\n```");
    expect(output.querySelector("code")?.textContent).toBe("a\n\n\n");
  });

  it("GFM 無法表達的 table 結構應保留 sanitized HTML", () => {
    for (const html of [
      "<table><tr><th>h</th></tr><tr><td><pre><code>a\nb\n</code></pre></td></tr></table>",
      "<table><tr><th>h</th></tr><tr><td><ul><li>one</li><li>two</li></ul></td></tr></table>",
      "<table><tr><th>h</th></tr><tr><td>a</td><td>b</td></tr></table>",
      "<table><caption>說明</caption><tr><th>h</th></tr><tr><td>值</td></tr></table>",
      "<table><tr><th>h</th></tr><tr><th>row</th></tr></table>",
    ]) {
      const expected = document.createElement("div");
      expected.innerHTML = html;
      const markdown = convertHtmlToMarkdown(html);
      expect(markdown).toContain("<table>");
      const output = document.createElement("div");
      output.innerHTML = convertMarkdownToHtml(markdown);
      expect(output.innerHTML).toBe(expected.innerHTML);
    }
  });

  it("task list 的勾選狀態應以靜態文字雙向保留，包含巢狀與多段落", () => {
    for (const source of [
      "- [x] done\n- [ ] todo",
      "- [x] parent\n  - [ ] child",
      "- [x] first paragraph\n\n  second paragraph",
      "3. [ ] ordered task\n4. [x] done",
    ]) {
      const html = convertMarkdownToHtml(source);
      expect(html).not.toContain("<input");
      expect(html).toMatch(/\[[x ]\]/);
      const markdown = convertHtmlToMarkdown(html);
      expect(markdown).not.toContain("\\[");
      expect(convertMarkdownToHtml(markdown)).toBe(html);
    }
  });

  it("一般文字與 code 的 task 範例不應當成真正 task，input 仍禁止", () => {
    const html =
      '<p>[x] literal paragraph</p><ul><li><code>[x] literal code</code></li><li>before [ ] after</li></ul><input type="checkbox" checked>';
    const markdown = convertHtmlToMarkdown(html);
    expect(markdown).toContain("\\[x\\] literal paragraph");
    expect(markdown).toContain("`[x] literal code`");
    expect(markdown).toContain("before \\[ \\] after");
    expect(convertMarkdownToHtml(markdown)).not.toContain("<input");
    const code = "```md\n- [x] literal task\n```";
    expect(convertTextToMarkdownAndHtml(code).markdown).toBe(code);
    expect(convertMarkdownToHtml(code)).toContain(
      "- [x] literal task\n</code>",
    );
  });

  it("inline code 應完整保留多空白、兩端空白、純空白與 backtick", () => {
    for (const text of [
      "a  b",
      " a ",
      "  a  ",
      " a",
      "a ",
      " ",
      "  ",
      "\t",
      "`a`",
      "a`b``c",
      " `` a ` ",
      "",
    ]) {
      const code = document.createElement("code");
      code.textContent = text;
      for (const html of [
        `<p>before ${code.outerHTML} after</p>`,
        `<p>${code.outerHTML}</p>`,
        `<ul><li>${code.outerHTML}</li></ul>`,
      ]) {
        const markdown = convertHtmlToMarkdown(html);
        const output = document.createElement("div");
        output.innerHTML = convertMarkdownToHtml(markdown);
        expect(output.querySelector("code")?.textContent).toBe(text);
      }
    }
  });

  it("inline code 換行無法由 code span 保真時保留安全 HTML", () => {
    for (const text of [
      "a\nb",
      "a\n\nb",
      "\n \n",
      "<tag>\n**literal**",
      "https://example.com\n[a](./path) &amp; `raw` ~~text~~",
    ]) {
      const code = document.createElement("code");
      code.textContent = text;
      code.setAttribute("onclick", "evil()");
      const markdown = convertHtmlToMarkdown(
        `<p>before ${code.outerHTML} after</p>`,
      );
      expect(markdown).toContain("<code>");
      expect(markdown).not.toContain("onclick");
      const output = document.createElement("div");
      output.innerHTML = convertMarkdownToHtml(markdown);
      expect(output.querySelector("code")?.textContent).toBe(text);
      expect(output.querySelectorAll("p")).toHaveLength(1);
    }
  });
});
