// Sanitizes HTML pasted from Word / Google Docs / other rich sources before it
// is inserted into a contentEditable letter editor. Keeps useful structural and
// inline formatting, strips Office/Docs cruft (mso-* styles, class/lang attrs,
// <o:p>, comments, scripts), and unwraps any disallowed tag while preserving its
// text so nothing is silently dropped.

const ALLOWED_TAGS = new Set([
  "p", "br", "div", "span",
  "b", "strong", "i", "em", "u", "s", "sub", "sup",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li",
  "table", "thead", "tbody", "tr", "td", "th",
  "a", "blockquote", "img",
]);

// Tags whose entire subtree should be removed (text included).
const DROP_TAGS = new Set(["script", "style", "meta", "link", "title", "head", "o:p", "xml"]);

const ALLOWED_ATTRS = new Set(["href", "colspan", "rowspan", "src", "alt"]);

function cleanElement(el: Element) {
  const tag = el.tagName.toLowerCase();
  // Drop images whose source isn't a safe data:/http(s): URL (blocks javascript:, file:, etc.).
  if (tag === "img") {
    const src = el.getAttribute("src") ?? "";
    if (!/^(data:image\/|https?:)/i.test(src)) {
      el.remove();
      return;
    }
  }
  // Remove disallowed attributes (drops inline style, class, lang, mso-*, etc.).
  for (const attr of [...el.attributes]) {
    if (!ALLOWED_ATTRS.has(attr.name.toLowerCase())) {
      el.removeAttribute(attr.name);
    }
  }
  // Force anchors to open safely.
  if (tag === "a" && el.getAttribute("href")) {
    el.setAttribute("rel", "noopener noreferrer");
    el.setAttribute("target", "_blank");
  }
}

function walk(node: Node, doc: Document) {
  const children = [...node.childNodes];
  for (const child of children) {
    if (child.nodeType === Node.COMMENT_NODE) {
      child.parentNode?.removeChild(child);
      continue;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) continue;

    const el = child as Element;
    const tag = el.tagName.toLowerCase();

    if (DROP_TAGS.has(tag)) {
      el.parentNode?.removeChild(el);
      continue;
    }

    // Recurse first so children are processed even if we unwrap this node.
    walk(el, doc);

    if (ALLOWED_TAGS.has(tag)) {
      cleanElement(el);
    } else {
      // Unwrap: replace the element with its (already-cleaned) children.
      const parent = el.parentNode;
      if (parent) {
        while (el.firstChild) parent.insertBefore(el.firstChild, el);
        parent.removeChild(el);
      }
    }
  }
}

export function sanitizePastedHtml(html: string): string {
  if (!html) return "";
  const doc = new DOMParser().parseFromString(html, "text/html");
  walk(doc.body, doc);
  return doc.body.innerHTML.trim();
}
