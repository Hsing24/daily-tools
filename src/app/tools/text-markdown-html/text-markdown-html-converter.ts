import { marked, Renderer, type Token, type Tokens } from "marked";
import DOMPurify from "dompurify";
import TurndownService from "turndown";
import { tables } from "turndown-plugin-gfm";

export interface TextConversionResult {
  /** Markdown 格式輸出 */
  readonly markdown: string;
  /** HTML 內容片段輸出 */
  readonly html: string;
}

// Allow relative destinations, while rejecting executable/unknown schemes.
const ALLOWED_URI_PATTERN =
  /^(?:(?:https?|mailto|tel):|(?![a-z][a-z\d+.-]*:))/i;
const renderer = new Renderer();
const renderCode = renderer.code.bind(renderer);
renderer.code = (token) =>
  renderCode({
    ...token,
    // Marked's fenced lexer removes the last line ending; its default
    // renderer then removes another one, losing a trailing blank line.
    text: token.codeBlockStyle === "indented" ? token.text : `${token.text}\n`,
  });
// Preserve task state as text without allowing interactive form elements.
renderer.checkbox = ({ checked }) => (checked ? "[x] " : "[ ] ");
const MARKDOWN_OPTIONS = {
  async: false,
  breaks: true,
  gfm: true,
  renderer,
} as const;

function isSafeDestination(destination: string, image = false): boolean {
  let decoded = destination;
  if (destination.includes("&")) {
    const decoder = document.createElement("textarea");
    decoder.innerHTML = destination;
    decoded = decoder.value;
  }
  const source = decoded.replace(/[\u0000-\u0020\u007f-\u009f]/g, "");
  const scheme = source.match(/^[a-z][a-z\d+.-]*:/i)?.[0].toLowerCase();
  return (
    !scheme ||
    scheme === "http:" ||
    scheme === "https:" ||
    (!image && (scheme === "mailto:" || scheme === "tel:"))
  );
}

const sanitizer = DOMPurify(window);
sanitizer.addHook("uponSanitizeAttribute", (node, data) => {
  if (data.attrName === "class") {
    const language = data.attrValue.match(
      /(?:^|\s)(language-[a-z\d_+.#-]+)(?=\s|$)/i,
    );
    if (node.nodeName === "CODE" && language) data.attrValue = language[1];
    else data.keepAttr = false;
  }
  if (
    node.nodeName === "IMG" &&
    data.attrName === "src" &&
    !isSafeDestination(data.attrValue, true)
  ) {
    data.keepAttr = false;
  }
});

function sanitizeHtml(html: string): string {
  return sanitizer.sanitize(html, {
    ALLOWED_ATTR: [
      "href",
      "src",
      "alt",
      "title",
      "start",
      "align",
      "colspan",
      "rowspan",
      "class",
    ],
    ALLOWED_TAGS: [
      "a",
      "b",
      "blockquote",
      "br",
      "code",
      "caption",
      "del",
      "em",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "li",
      "img",
      "i",
      "ol",
      "p",
      "pre",
      "strong",
      "table",
      "thead",
      "tbody",
      "tfoot",
      "tr",
      "th",
      "td",
      "ul",
    ],
    ALLOW_DATA_ATTR: false,
    FORBID_ATTR: ["style", "id", "target"],
    FORBID_TAGS: ["form", "iframe", "input", "script", "style", "svg"],
    ALLOWED_URI_REGEXP: ALLOWED_URI_PATTERN,
  });
}

function normalizeMarkdown(markdown: string): string {
  const normalized = markdown.replace(/\r\n?/g, "\n");
  if (!normalized.trim()) return "";
  // Only normalize block separators. Global trimming/collapsing corrupts
  // indented and fenced code, and the spaces used by Markdown hard breaks.
  const tokens = marked.lexer(normalized, MARKDOWN_OPTIONS);
  let start = 0;
  let end = tokens.length;
  while (tokens[start]?.type === "space") start += 1;
  while (end > start && tokens[end - 1].type === "space") end -= 1;
  const htmlCache = new Map<string, boolean>();
  const normalizeToken = (token: Token): string => {
    let needsSanitizing = false;
    marked.walkTokens([token], (child) => {
      if (
        child.type === "link" ||
        child.type === "image" ||
        child.type === "def"
      ) {
        const destination = (child as Tokens.Link | Tokens.Image | Tokens.Def)
          .href;
        if (!isSafeDestination(destination, child.type === "image"))
          needsSanitizing = true;
      } else if (child.type === "html") {
        // A standalone closing tag cannot carry a URL or executable content.
        // DOMPurify and fragment parsing repair </p> differently.
        if (/^<\/[a-z][a-z\d]*\s*>$/i.test(child.raw.trim())) return;
        let changed = htmlCache.get(child.raw);
        if (changed === undefined) {
          const original = document.createElement("div");
          original.innerHTML = child.raw;
          changed =
            sanitizeHtml(child.raw).trim() !== original.innerHTML.trim();
          htmlCache.set(child.raw, changed);
        }
        if (changed) needsSanitizing = true;
      }
    });
    if (needsSanitizing) {
      const clean = convertHtmlToMarkdown(
        marked.parser([token], MARKDOWN_OPTIONS),
      );
      return clean + (token.raw.match(/\n+$/)?.[0] ?? "");
    }
    return token.type === "space"
      ? token.raw.replace(/\n{3,}/g, "\n\n")
      : token.raw;
  };
  const result = tokens.slice(start, end).map(normalizeToken).join("");
  return result.trim() ? result : "";
}

function fencedCodeBlock(node: HTMLElement): string {
  const code = node.textContent ?? "";
  const language =
    node.querySelector("code")?.className.replace(/^language-/, "") ?? "";
  let fenceLength = 3;
  for (const match of code.matchAll(/`{3,}/g)) {
    fenceLength = Math.max(fenceLength, match[0].length + 1);
  }
  const fence = "`".repeat(fenceLength);
  return `\n\n${fence}${language}\n${code}${code.endsWith("\n") ? "" : "\n"}${fence}\n\n`;
}

function codeHtml(node: HTMLElement): string {
  // Numeric entities keep Markdown from interpreting literal newlines as
  // paragraph boundaries or punctuation as inline markup inside raw <code>.
  if (node.nodeName === "CODE") {
    const empty = node.cloneNode(false) as HTMLElement;
    const text = (node.textContent ?? "").replace(
      /[^\p{L}\p{N} \t]/gu,
      (character) => `&#${character.codePointAt(0)};`,
    );
    return empty.outerHTML.replace("</code>", `${text}</code>`);
  }
  return node.outerHTML.replace(/\r/g, "&#13;").replace(/\n/g, "&#10;");
}

function inlineCode(node: HTMLElement): string {
  const code = node.textContent ?? "";
  if (!code || /[\r\n]/.test(code)) return codeHtml(node);
  let delimiterLength = 1;
  for (const match of code.matchAll(/`+/g)) {
    delimiterLength = Math.max(delimiterLength, match[0].length + 1);
  }
  const delimiter = "`".repeat(delimiterLength);
  // CommonMark trims one padding space at each end unless the span is all
  // spaces. Backticks at either edge also need padding to separate the fence.
  const padding = /^`|`$|^ .*[^ ].* $/.test(code) ? " " : "";
  return `${delimiter}${padding}${code}${padding}${delimiter}`;
}

function needsHtmlTable(table: HTMLTableElement): boolean {
  const columns = table.rows[0]?.cells.length ?? 0;
  return (
    !!table.querySelector(
      "[colspan],[rowspan],caption,td p,th p,pre,ul,ol,blockquote,h1,h2,h3,h4,h5,h6,table",
    ) ||
    Array.from(table.rows).some(
      (row, index) =>
        row.cells.length !== columns ||
        (index > 0 && !!row.querySelector("th")),
    ) ||
    (table.tHead?.rows.length ?? 0) > 1
  );
}

function createTurndown(): TurndownService {
  const service = new TurndownService({
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
    emDelimiter: "*",
    headingStyle: "atx",
    preformattedCode: true,
    blankReplacement: (_content, node) => {
      if (node.nodeName === "PRE") return fencedCodeBlock(node);
      if (node.nodeName === "CODE") return inlineCode(node);
      const isBlock = (node as HTMLElement & { isBlock: boolean }).isBlock;
      // Turndown marks containers of whitespace-only code as blank too.
      if (node.querySelector("code,pre")) {
        const html = codeHtml(node);
        return isBlock ? `\n\n${html}\n\n` : html;
      }
      return isBlock ? "\n\n" : "";
    },
  });

  service.use(tables);
  const listItemRule = service.rules.array.find(
    (rule) => rule.filter === "li",
  )!;
  service.addRule("textTaskListItem", {
    filter(node) {
      if (node.nodeName !== "LI") return false;
      let first = Array.from(node.childNodes).find((child) =>
        child.textContent?.trim(),
      );
      if (first?.nodeName === "P") first = first.firstChild ?? undefined;
      return (
        first?.nodeType === Node.TEXT_NODE &&
        /^\s*\[[xX ]\](?:\s|$)/.test(first.textContent ?? "")
      );
    },
    replacement(content, node, options) {
      // Only the leading plain-text marker in a list item is unescaped.
      // Inline code and bracket text in paragraphs keep their normal escaping.
      return listItemRule.replacement!(
        content.replace(/^\n*\\\[([xX ])\\\]\s+/, "[$1] "),
        node,
        options,
      );
    },
  });
  service.addRule("preformattedBlock", {
    filter: "pre",
    replacement: (_content, node) => fencedCodeBlock(node as HTMLElement),
  });
  service.addRule("inlineCodeContent", {
    filter: "code",
    replacement: (_content, node) => inlineCode(node),
  });
  service.addRule("strikethrough", {
    filter: "del",
    replacement: (content) => `~~${content}~~`,
  });
  service.addRule("tableCellContent", {
    filter: ["th", "td"],
    replacement(content, node) {
      const cell = node as HTMLTableCellElement;
      const prefix = cell.cellIndex === 0 ? "| " : " ";
      return `${prefix}${content.replace(/\|/g, "\\|").replace(/\n/g, "<br>")} |`;
    },
  });
  service.addRule("structuredTables", {
    filter: (node) =>
      node.nodeName === "TABLE" && needsHtmlTable(node as HTMLTableElement),
    replacement: (_content, node) =>
      `\n\n${(node as HTMLElement).outerHTML}\n\n`,
  });

  return service;
}

export function convertHtmlToMarkdown(html: string): string {
  if (!html) return "";

  const cleanHtml = sanitizeHtml(html);
  const container = document.createElement("div");
  container.innerHTML = cleanHtml;
  // The GFM plugin expects table structure without whitespace text nodes
  // and cannot inspect empty tables. Keep cell content untouched.
  for (const table of container.querySelectorAll("table")) {
    if (!table.rows.length) table.remove();
  }
  for (const structure of container.querySelectorAll(
    "table,thead,tbody,tfoot,tr",
  )) {
    for (const child of Array.from(structure.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE && !child.textContent?.trim())
        child.remove();
    }
  }
  const markdown = createTurndown().turndown(container);
  return normalizeMarkdown(markdown);
}

export function convertMarkdownToHtml(markdown: string): string {
  if (!markdown) return "";

  const html = marked.parse(markdown, MARKDOWN_OPTIONS);
  if (typeof html !== "string") {
    throw new Error("Markdown conversion unexpectedly became asynchronous");
  }
  return sanitizeHtml(html).trim();
}

export function convertTextToMarkdownAndHtml(
  text: string,
): TextConversionResult {
  const markdown = normalizeMarkdown(text ?? "");
  if (!markdown) return { markdown: "", html: "" };

  return {
    markdown,
    html: convertMarkdownToHtml(markdown),
  };
}
