// Repaginates the letter "paper" so agreement pages fill to the bottom instead of leaving a
// sparse, half-empty sheet per clause group. The agreement sections (tagged data-reflow="agreement"
// in the template) are treated as ONE continuous stream of block elements, re-packed into full A4
// pages — pulling content up to fill gaps and pushing overflow down. Generic templates (no reflow
// group) fall back to legacy push-only overflow.
//
// The logic lives as a PLAIN-JS SOURCE STRING (`reflowPagesBrowserSource`) so the Puppeteer PDF
// renderer can inject it verbatim with no transpiler helpers (esbuild/SWC inject `__name`, which is
// undefined inside the page). The editor compiles it once via `new Function`. Both sides therefore
// run byte-for-byte identical pagination, so the draft and the generated PDF break at the same spots.

export type ReflowOptions = {
  // Full page height in px (section min-height incl. padding). Overflow = section.scrollHeight > this.
  pageHeight?: number;
};

export const reflowPagesBrowserSource = `(function (rootOrSelector, opts) {
  var root = typeof rootOrSelector === "string" ? document.querySelector(rootOrSelector) : rootOrSelector;
  if (!root) return;
  var PAGE_HEIGHT = (opts && opts.pageHeight) || 1216;
  var PAGE_SELECTOR = "section[data-ambey-page], section[data-letter-page]";
  function isControl(el) { return el.hasAttribute("data-editor-page-controls"); }

  // Save caret so moving nodes around doesn't drop the cursor (nodes are moved, not cloned).
  var saved = null;
  try {
    var d0 = root.ownerDocument;
    var s0 = d0 ? d0.getSelection() : null;
    if (s0 && s0.rangeCount && s0.anchorNode && root.contains(s0.anchorNode)) {
      var r0 = s0.getRangeAt(0);
      saved = { sc: r0.startContainer, so: r0.startOffset, ec: r0.endContainer, eo: r0.endOffset };
    }
  } catch (e) { saved = null; }

  var agreementSections = Array.prototype.slice.call(root.querySelectorAll('section[data-reflow="agreement"]'));
  if (!agreementSections.length) {
    // No reflow group: legacy push-only overflow so an overgrown section still splits.
    var pg0 = Array.prototype.slice.call(root.querySelectorAll(PAGE_SELECTOR));
    for (var i = 0; i < pg0.length; i++) {
      var page = pg0[i];
      if (page.scrollHeight <= PAGE_HEIGHT) continue;
      var children = Array.prototype.slice.call(page.children).filter(function (el) { return !isControl(el); });
      var splitIndex = -1;
      for (var j = children.length - 1; j >= 0; j--) {
        var bottom = children[j].offsetTop + children[j].offsetHeight - page.offsetTop;
        if (bottom <= PAGE_HEIGHT) { splitIndex = j + 1; break; }
      }
      if (splitIndex <= 0 || splitIndex >= children.length) continue;
      var overflow = children.slice(splitIndex);
      var nextPage = pg0[i + 1];
      if (!nextPage) {
        nextPage = page.cloneNode(false);
        nextPage.removeAttribute("style");
        if (page.parentElement) page.parentElement.insertBefore(nextPage, page.nextSibling);
        pg0.splice(i + 1, 0, nextPage);
      }
      var fc = nextPage.firstChild;
      for (var k = 0; k < overflow.length; k++) nextPage.insertBefore(overflow[k], fc);
    }
  } else {
    // Collect the agreement group's blocks into one ordered stream, then greedily fill pages.
    var first = agreementSections[0];
    var stream = [];
    for (var a = 0; a < agreementSections.length; a++) {
      var kids = Array.prototype.slice.call(agreementSections[a].children);
      for (var b = 0; b < kids.length; b++) { if (!isControl(kids[b])) stream.push(kids[b]); }
    }
    for (var c = 1; c < agreementSections.length; c++) agreementSections[c].remove();
    while (first.firstChild) first.removeChild(first.firstChild);
    var current = first;
    for (var s = 0; s < stream.length; s++) {
      var block = stream[s];
      current.appendChild(block);
      var count = Array.prototype.slice.call(current.children).filter(function (el) { return !isControl(el); }).length;
      if (current.scrollHeight > PAGE_HEIGHT && count > 1) {
        var next = current.cloneNode(false); // copies class + data-reflow, no children
        next.removeAttribute("style");
        if (current.parentElement) current.parentElement.insertBefore(next, current.nextSibling);
        next.appendChild(block);
        current = next;
      }
    }
  }

  // Renumber all pages sequentially (discrete pages 1..N then agreement pages).
  var pages = Array.prototype.slice.call(root.querySelectorAll(PAGE_SELECTOR));
  for (var p = 0; p < pages.length; p++) {
    if (pages[p].hasAttribute("data-ambey-page")) pages[p].setAttribute("data-ambey-page", String(p + 1));
    else pages[p].setAttribute("data-letter-page", String(p + 1));
  }

  // Restore caret (best-effort; nodes were moved, not recreated, so endpoints stay valid).
  if (saved) {
    try {
      var d1 = root.ownerDocument;
      var s1 = d1 ? d1.getSelection() : null;
      if (d1 && s1) {
        var range = d1.createRange();
        range.setStart(saved.sc, saved.so);
        range.setEnd(saved.ec, saved.eo);
        s1.removeAllRanges();
        s1.addRange(range);
      }
    } catch (e2) { /* best effort */ }
  }
})`;

type ReflowFn = (root: HTMLElement | string, opts?: ReflowOptions) => void;
let compiled: ReflowFn | null = null;

export function reflowPages(root: HTMLElement | string, opts?: ReflowOptions): void {
  if (typeof window === "undefined") return; // editor-only; PDF path uses reflowPagesBrowserSource
  if (!compiled) {
    // eslint-disable-next-line no-new-func
    compiled = new Function("return " + reflowPagesBrowserSource)() as ReflowFn;
  }
  compiled(root, opts);
}
