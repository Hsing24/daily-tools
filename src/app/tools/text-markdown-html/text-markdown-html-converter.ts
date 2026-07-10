export interface TextConversionResult {
  /** Markdown 格式輸出 */
  readonly markdown: string;
  /** HTML 內容片段輸出 */
  readonly html: string;
}

export function convertHtmlToMarkdown(html: string): string {
  if (!html) return "";
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  let markdown = walkNode(doc.body);

  // 清理多餘的連續空行
  markdown = markdown
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return markdown;
}

function walkNode(node: Node): string {
  if (node.nodeType === 3) {
    return node.nodeValue || "";
  }

  if (node.nodeType !== 1) {
    return "";
  }

  const element = node as HTMLElement;
  const tagName = element.tagName.toUpperCase();

  let childrenContent = "";
  element.childNodes.forEach((child) => {
    childrenContent += walkNode(child);
  });

  switch (tagName) {
    case "H1":
      return `\n\n# ${childrenContent}\n\n`;
    case "H2":
      return `\n\n## ${childrenContent}\n\n`;
    case "H3":
      return `\n\n### ${childrenContent}\n\n`;
    case "H4":
      return `\n\n#### ${childrenContent}\n\n`;
    case "H5":
      return `\n\n##### ${childrenContent}\n\n`;
    case "H6":
      return `\n\n###### ${childrenContent}\n\n`;
    case "P":
      return `\n\n${childrenContent}\n\n`;
    case "BR":
      return "\n";
    case "STRONG":
    case "B":
      return `**${childrenContent}**`;
    case "EM":
    case "I":
      return `*${childrenContent}*`;
    case "CODE":
      return `\`${childrenContent}\``;
    case "A": {
      const href = element.getAttribute("href") || "";
      return `[${childrenContent}](${href})`;
    }
    case "LI":
      return `\n- ${childrenContent}`;
    case "UL":
    case "OL":
      return `\n${childrenContent}\n`;
    default:
      return childrenContent;
  }
}

export function convertMarkdownToHtml(markdown: string): string {
  if (!markdown) return "";

  // 1. 正規化換行
  let html = markdown.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();

  // 2. 基本 HTML 轉義以防腳本注入
  html = html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // 3. 轉換 headings
  html = html.replace(/^# (.*?)$/gm, "<h1>$1</h1>");
  html = html.replace(/^## (.*?)$/gm, "<h2>$1</h2>");
  html = html.replace(/^### (.*?)$/gm, "<h3>$1</h3>");
  html = html.replace(/^#### (.*?)$/gm, "<h4>$1</h4>");
  html = html.replace(/^##### (.*?)$/gm, "<h5>$1</h5>");
  html = html.replace(/^###### (.*?)$/gm, "<h6>$1</h6>");

  // 4. 轉換清單項目 (以 - 開頭)
  html = html.replace(/^- (.*?)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>.*?<\/li>\n?)+/g, (match) => {
    return `<ul>\n${match}</ul>\n`;
  });

  // 5. 轉換粗體與斜體與程式碼
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");
  html = html.replace(/`(.*?)`/g, "<code>$1</code>");

  // 6. 轉換連結 [text](url)
  html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');

  // 7. 切分段落
  const paragraphs = html.split(/\n{2,}/);
  const resultParagraphs = paragraphs.map((p) => {
    const trimmed = p.trim();
    if (!trimmed) return "";
    if (
      trimmed.startsWith("<h") ||
      trimmed.startsWith("<ul") ||
      trimmed.startsWith("<ol") ||
      trimmed.startsWith("<li")
    ) {
      return trimmed;
    }
    // 段落內單個換行轉成 <br>
    const lines = trimmed.split("\n");
    return `<p>${lines.join("<br>")}</p>`;
  });

  return resultParagraphs.filter((p) => p !== "").join("\n");
}

export function convertTextToMarkdownAndHtml(text: string): TextConversionResult {
  if (text === null || text === undefined || text === "") {
    return { markdown: "", html: "" };
  }

  // 1. 正規化換行
  let normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // 2. 修剪外圍空白
  normalized = normalized.trim();
  if (normalized === "") {
    return { markdown: "", html: "" };
  }

  const paragraphs = normalized.split(/\n{2,}/);
  const markdown = paragraphs.join("\n\n");
  const html = convertMarkdownToHtml(markdown);

  return { markdown, html };
}
