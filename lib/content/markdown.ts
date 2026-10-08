import DOMPurify from "isomorphic-dompurify";

/**
 * Guides / CMS markdown (§8.7). Small, dependency-free renderer with a deliberately limited syntax:
 *  ## h2 · ### h3 · #### h4 (a single # is demoted to h2 — the page owns the h1), paragraphs,
 *  **bold**, *italic* / _italic_, `code`, ``` fenced code ```, [links](https://…), ![images](https://…),
 *  - / * / 1. lists, > quotes, --- rules, line breaks (two trailing spaces).
 * Raw HTML is ESCAPED, only http(s)/mailto/same-site links survive, and the result goes through
 * DOMPurify with a strict allowlist as defence in depth.
 *
 * Custom tags are parsed BEFORE any HTML is produced and become structured blocks (rendered as React):
 *  <VendorCard slug="…" />  <Map vendors="a,b,c" />  <PriceTable vendor="…" />
 *  <Callout type="info|tip|warning">markdown…</Callout>
 */

export type ContentBlock =
  | { type: "markdown"; text: string }
  | { type: "vendor-card"; slug: string }
  | { type: "map"; slugs: string[] }
  | { type: "price-table"; vendor: string }
  | { type: "callout"; variant: "info" | "tip" | "warning"; text: string };

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function attr(attrs: string, name: string): string | null {
  const m = new RegExp(`${name}\\s*=\\s*"([^"]*)"`).exec(attrs);
  return m ? m[1].trim() : null;
}

/** Split a document into markdown and custom-tag blocks. Unknown / malformed tags stay as text (escaped later). */
export function parseBlocks(md: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  const re = /^[ \t]*<(VendorCard|Map|PriceTable)\b([^>]*)\/>[ \t]*$|^[ \t]*<Callout\b([^>]*)>([\s\S]*?)<\/Callout>[ \t]*$/gm;
  let last = 0;
  let m: RegExpExecArray | null;
  const pushText = (text: string) => {
    if (text.trim()) blocks.push({ type: "markdown", text });
  };
  while ((m = re.exec(md))) {
    let block: ContentBlock | null = null;
    if (m[1] === "VendorCard") {
      const slug = attr(m[2], "slug");
      if (slug && SLUG.test(slug)) block = { type: "vendor-card", slug };
    } else if (m[1] === "Map") {
      const slugs = (attr(m[2], "vendors") ?? "").split(",").map((s) => s.trim()).filter((s) => SLUG.test(s)).slice(0, 25);
      if (slugs.length) block = { type: "map", slugs };
    } else if (m[1] === "PriceTable") {
      const vendor = attr(m[2], "vendor");
      if (vendor && SLUG.test(vendor)) block = { type: "price-table", vendor };
    } else if (m[4] !== undefined) {
      const t = attr(m[3] ?? "", "type");
      block = { type: "callout", variant: t === "tip" || t === "warning" ? t : "info", text: m[4].trim() };
    }
    if (block) {
      pushText(md.slice(last, m.index));
      blocks.push(block);
      last = m.index + m[0].length;
    }
  }
  pushText(md.slice(last));
  return blocks;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** Allowed link targets: http(s), mailto, same-site paths and in-page anchors. */
export function safeHref(url: string): string | null {
  const u = url.trim();
  if (/^\/(?!\/)/.test(u) || u.startsWith("#")) return u;
  if (/^mailto:[^\s@]+@[^\s@]+$/i.test(u)) return u;
  try {
    const parsed = new URL(u);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function inline(text: string): string {
  // `text` is already HTML-escaped. Code spans first so their contents aren't formatted.
  const codes: string[] = [];
  let out = text.replace(/`([^`]+)`/g, (_, c: string) => {
    codes.push(`<code>${c}</code>`);
    return `\u0000${codes.length - 1}\u0000`;
  });
  out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt: string, src: string) => {
    const href = safeHref(src.replace(/&amp;/g, "&"));
    return href && !href.startsWith("mailto:") ? `<img src="${escapeHtml(href)}" alt="${alt}" loading="lazy">` : alt;
  });
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label: string, url: string) => {
    const href = safeHref(url.replace(/&amp;/g, "&"));
    if (!href) return label;
    const external = /^https?:/.test(href);
    return `<a href="${escapeHtml(href)}"${external ? ' rel="nofollow noopener noreferrer" target="_blank"' : ""}>${label}</a>`;
  });
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(^|[^*\w])\*([^*\s][^*]*)\*(?!\w)/g, "$1<em>$2</em>");
  out = out.replace(/(^|[^_\w])_([^_\s][^_]*)_(?!\w)/g, "$1<em>$2</em>");
  return out.replace(/\u0000(\d+)\u0000/g, (_, i: string) => codes[Number(i)]);
}

export function markdownToHtml(md: string): string {
  const lines = escapeHtml(md.replace(/\r\n?/g, "\n")).split("\n");
  const html: string[] = [];
  let para: string[] = [];
  let list: { tag: "ul" | "ol"; items: string[] } | null = null;
  let quote: string[] = [];

  const flushPara = () => {
    if (para.length) html.push(`<p>${inline(para.join("\n")).replace(/ {2,}\n/g, "<br>").replace(/\n/g, " ")}</p>`);
    para = [];
  };
  const flushList = () => {
    if (list) html.push(`<${list.tag}>${list.items.map((i) => `<li>${inline(i)}</li>`).join("")}</${list.tag}>`);
    list = null;
  };
  const flushQuote = () => {
    if (quote.length) html.push(`<blockquote><p>${inline(quote.join(" "))}</p></blockquote>`);
    quote = [];
  };
  const flushAll = () => {
    flushPara();
    flushList();
    flushQuote();
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^```/.test(line.trim())) {
      flushAll();
      const code: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i].trim())) code.push(lines[i++]);
      html.push(`<pre><code>${code.join("\n")}</code></pre>`);
      continue;
    }
    const heading = /^(#{1,4})\s+(.+?)\s*#*$/.exec(line);
    if (heading) {
      flushAll();
      const level = Math.max(2, heading[1].length);
      html.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      continue;
    }
    if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) {
      flushAll();
      html.push("<hr>");
      continue;
    }
    const q = /^&gt;\s?(.*)$/.exec(line);
    if (q) {
      flushPara();
      flushList();
      quote.push(q[1]);
      continue;
    }
    const ul = /^\s*[-*+]\s+(.+)$/.exec(line);
    const ol = /^\s*\d+[.)]\s+(.+)$/.exec(line);
    if (ul || ol) {
      flushPara();
      flushQuote();
      const tag = ul ? "ul" : "ol";
      if (!list || list.tag !== tag) {
        flushList();
        list = { tag, items: [] };
      }
      list.items.push((ul ?? ol)![1]);
      continue;
    }
    if (!line.trim()) {
      flushAll();
      continue;
    }
    flushList();
    flushQuote();
    para.push(line);
  }
  flushAll();
  return sanitizeHtml(html.join("\n"));
}

let hooked = false;
function ensureHooks(): void {
  if (hooked) return;
  hooked = true;
  // External links open in a new tab without referrer/opener and carry nofollow (user content).
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (node.tagName === "A") {
      const href = node.getAttribute("href") ?? "";
      if (/^https?:/i.test(href)) {
        node.setAttribute("rel", "nofollow noopener noreferrer");
        node.setAttribute("target", "_blank");
      } else {
        node.removeAttribute("target");
        node.removeAttribute("rel");
      }
    }
  });
}

/** Defence in depth: strict allowlist, no event handlers, no styles, no scripts, safe URLs only. */
export function sanitizeHtml(html: string): string {
  ensureHooks();
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["h2", "h3", "h4", "p", "br", "strong", "em", "code", "pre", "blockquote", "ul", "ol", "li", "a", "img", "hr"],
    ALLOWED_ATTR: ["href", "src", "alt", "loading"],
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|\/(?!\/)|#)/i,
  });
}

/** Plain-text excerpt from markdown (meta descriptions, cards). */
export function markdownToText(md: string, max = 200): string {
  const text = md
    .replace(/<\/?[A-Za-z][^>]*>/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`~-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}
