import { marked } from "marked";
import DOMPurify from "dompurify";
import TurndownService from "turndown";

export interface TextConversionResult {
  /** Markdown 格式輸出 */
  readonly markdown: string;
  /** HTML 內容片段輸出 */
  readonly html: string;
}

const ALLOWED_URI_PATTERN = /^(?:https?:|mailto:|tel:)/i;
const MARKDOWN_OPTIONS = {
  async: false,
  breaks: true,
  gfm: true,
  headerIds: false,
  mangle: false,
} as const;

function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_ATTR: ["href", "title", "start", "checked", "disabled"],
    ALLOWED_TAGS: [
      "a",
      "blockquote",
      "br",
      "code",
      "del",
      "em",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "li",
      "ol",
      "p",
      "pre",
      "strong",
      "ul",
    ],
    ALLOW_DATA_ATTR: false,
    FORBID_ATTR: ["style", "class", "id", "target"],
    FORBID_TAGS: ["form", "iframe", "img", "input", "script", "style", "svg"],
    ALLOWED_URI_REGEXP: ALLOWED_URI_PATTERN,
  });
}

function normalizeMarkdown(markdown: string): string {
  return markdown
    .replace(/\r\n?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function createTurndown(): TurndownService {
  const service = new TurndownService({
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
    emDelimiter: "*",
    headingStyle: "atx",
  });

  service.addRule("safeLinks", {
    filter: "a",
    replacement(content, node) {
      const anchor = node as HTMLAnchorElement;
      const href = anchor.getAttribute("href") ?? "";
      if (!ALLOWED_URI_PATTERN.test(href)) return content;
      const title = anchor.getAttribute("title");
      const titlePart = title ? ` \"${title.replace(/\"/g, '\\\"')}\"` : "";
      return `[${content}](${href}${titlePart})`;
    },
  });

  return service;
}

export function convertHtmlToMarkdown(html: string): string {
  if (!html) return "";

  const cleanHtml = sanitizeHtml(html);
  const markdown = createTurndown().turndown(cleanHtml);
  return normalizeMarkdown(markdown);
}

export function convertMarkdownToHtml(markdown: string): string {
  if (!markdown) return "";

  const normalized = normalizeMarkdown(markdown);
  const html = marked.parse(normalized, MARKDOWN_OPTIONS);
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
