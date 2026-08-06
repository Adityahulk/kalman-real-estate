// Repaginates the letter "paper" so agreement pages fill to the bottom instead of leaving a
// sparse, half-empty sheet per clause group. The agreement sections (tagged data-reflow="agreement"
// in the template) are treated as ONE continuous stream of block elements, re-packed into full A4
// pages — pulling content up to fill gaps and pushing overflow down. Generic templates (no reflow
// group) fall back to legacy push-only overflow.
//
// The logic lives as a PLAIN-JS SOURCE STRING (`reflowPagesBrowserSource`) so it can also be used by
// layout diagnostics without transpiler helpers. The editor compiles it once via `new Function`.

export type ReflowOptions = {
  // Full fixed page height in px (including padding and border).
  pageHeight?: number;
};

export const reflowPagesBrowserSource = `(function (rootOrSelector, opts) {
  var root = typeof rootOrSelector === "string" ? document.querySelector(rootOrSelector) : rootOrSelector;
  if (!root) return;
  var PAGE_HEIGHT = (opts && opts.pageHeight) || 1216;
  var PAGE_SELECTOR = "section[data-ambey-page], section[data-letter-page]";
  function pageLimit(page) {
    // The printable boundary ends before the sheet's bottom padding. scrollHeight is unsuitable
    // here: headless Chromium includes that padding after overflowing content while the interactive
    // browser may clamp it, producing different page counts for the same DOM.
    var style = page.ownerDocument && page.ownerDocument.defaultView
      ? page.ownerDocument.defaultView.getComputedStyle(page)
      : null;
    var paddingBottom = style ? (parseFloat(style.paddingBottom) || 0) : 0;
    return Math.min(PAGE_HEIGHT, page.clientHeight || PAGE_HEIGHT) - paddingBottom;
  }
  function blockBottom(page, block) {
    return block.getBoundingClientRect().bottom - page.getBoundingClientRect().top;
  }
  function isOutOfFlow(page, block) {
    var view = page.ownerDocument && page.ownerDocument.defaultView;
    var position = view ? view.getComputedStyle(block).position : "static";
    return position === "absolute" || position === "fixed";
  }
  function pageFits(page) {
    var kids = contentKids(page);
    var limit = pageLimit(page);
    for (var i = 0; i < kids.length; i++) {
      if (!isOutOfFlow(page, kids[i]) && blockBottom(page, kids[i]) > limit + 1) return false;
    }
    return true;
  }
  function isControl(el) { return el.hasAttribute("data-editor-page-controls"); }
  function contentKids(page) {
    return Array.prototype.slice.call(page.children).filter(function (el) { return !isControl(el); });
  }
  function createAfter(page) {
    var next = page.cloneNode(false); // copies class + data-reflow, no children
    next.removeAttribute("style");
    if (page.parentElement) page.parentElement.insertBefore(next, page.nextSibling);
    return next;
  }
  // A short paragraph that introduces the block after it (e.g. "DETAILS OF PRICING:") must not be
  // orphaned at the bottom of a page when its table moves down — drag the caption along with it.
  function isCaptionP(el) {
    if (!el || el.tagName !== "P") return false;
    var t = String(el.textContent || "").trim();
    return t.length <= 120 || /:$/.test(t);
  }
  function splitWords(text, wordCount) {
    var words = String(text || "").trim().split(/\\s+/).filter(Boolean);
    return { head: words.slice(0, wordCount).join(" "), tail: words.slice(wordCount).join(" "), count: words.length };
  }
  function textRemainderElement(className, text) {
    var p = document.createElement("p");
    p.className = className;
    p.textContent = text;
    return p;
  }
  // Break a clause/subclause body so its head fills the rest of the current page and the tail flows
  // to the next one — the same way Word splits a paragraph across a page boundary. Only plain-text
  // body paragraphs are split (their text carries no inline formatting), so nothing is lost.
  function splitBlockToFit(page, block) {
    var target = null;
    var remainderClass = "";
    if (block.classList && block.classList.contains("clause-block")) { target = block.querySelector(".clause-body"); remainderClass = "clause-continuation"; }
    else if (block.classList && block.classList.contains("subclause-item")) { target = block.querySelector(".subclause-text"); remainderClass = "subclause-continuation"; }
    else if (block.classList && block.classList.contains("clause-continuation")) { target = block; remainderClass = "clause-continuation"; }
    else if (block.classList && block.classList.contains("subclause-continuation")) { target = block; remainderClass = "subclause-continuation"; }
    if (!target) return null;
    var fullText = String(target.textContent || "").trim();
    var all = splitWords(fullText, 0);
    if (all.count < 12) return null;

    var low = 1, high = all.count, best = 0;
    while (low <= high) {
      var mid = Math.floor((low + high) / 2);
      target.textContent = splitWords(fullText, mid).head;
      if (pageFits(page)) { best = mid; low = mid + 1; } else { high = mid - 1; }
    }
    if (best < 6 || best >= all.count) { target.textContent = fullText; return null; }
    var finalParts = splitWords(fullText, best);
    target.textContent = finalParts.head;
    return textRemainderElement(remainderClass, finalParts.tail);
  }

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
    // Older drafts placed as many as three full-size supporting scans in one section. Normalize
    // those attachment-only sheets before measuring overflow. Each scan gets one A4 page, while the
    // heading remains with the first image. New drafts are emitted in this shape from the server.
    for (var ap = 0; ap < pg0.length; ap++) {
      var attachmentPage = pg0[ap];
      var attachmentKids = contentKids(attachmentPage);
      var attachmentBlocks = attachmentKids.filter(function (el) {
        return el.classList && el.classList.contains("attachment-block");
      });
      var onlyAttachmentsAndHeading = attachmentKids.every(function (el) {
        return (el.classList && el.classList.contains("attachment-block")) || /^H[1-3]$/.test(el.tagName);
      });
      if (!onlyAttachmentsAndHeading || attachmentBlocks.length <= 1) continue;
      attachmentPage.classList.add("supporting-document-page");
      var attachmentCursor = attachmentPage;
      for (var ab = 1; ab < attachmentBlocks.length; ab++) {
        var attachmentNext = createAfter(attachmentCursor);
        attachmentNext.classList.add("supporting-document-page");
        attachmentNext.appendChild(attachmentBlocks[ab]);
        attachmentCursor = attachmentNext;
      }
    }
    pg0 = Array.prototype.slice.call(root.querySelectorAll(PAGE_SELECTOR));
    for (var i = 0; i < pg0.length; i++) {
      var page = pg0[i];
      if (pageFits(page)) continue;
      var children = Array.prototype.slice.call(page.children).filter(function (el) { return !isControl(el); });
      var splitIndex = -1;
      var pageTop = page.getBoundingClientRect().top;
      for (var j = children.length - 1; j >= 0; j--) {
        // offsetTop changes its coordinate space depending on the nearest positioned ancestor. On
        // later stacked sheets, subtracting page.offsetTop could make an overflowing child look as
        // if it ended above the page. Rectangles keep both values in the same viewport coordinate
        // system and work identically in Set Your Letters, Edit Draft, and headless Chromium.
        var bottom = children[j].getBoundingClientRect().bottom - pageTop;
        if (bottom <= pageLimit(page)) { splitIndex = j + 1; break; }
      }
      if (splitIndex <= 0 || splitIndex >= children.length) continue;
      var overflow = children.slice(splitIndex);
      // Joint-allotment substitutions can make the flex page exceed the threshold by a rounding
      // pixel even though the reserved bottom whitespace visibly fits the short sign-off. Keep
      // that single sign-off on its intended first page instead of creating a nearly blank sheet.
      if (overflow.length === 1 && overflow[0].classList && overflow[0].classList.contains("first-page-signoff")) {
        overflow[0].style.position = "absolute";
        overflow[0].style.right = "72px";
        overflow[0].style.bottom = "60px";
        overflow[0].style.margin = "0";
        continue;
      }
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
    var rawStream = [];
    for (var a = 0; a < agreementSections.length; a++) {
      var kids = Array.prototype.slice.call(agreementSections[a].children);
      for (var b = 0; b < kids.length; b++) { if (!isControl(kids[b])) rawStream.push(kids[b]); }
    }
    // Undo any earlier split: fold each continuation paragraph back into the clause/subclause body it
    // came from, so re-pagination always starts from whole clauses. Without this, a continuation that
    // now fits on the same page as its head stays a separate paragraph and shows a blank-line gap.
    var stream = [];
    for (var q = 0; q < rawStream.length; q++) {
      var blk = rawStream[q];
      var isCont = blk.classList && (blk.classList.contains("clause-continuation") || blk.classList.contains("subclause-continuation"));
      if (isCont && stream.length) {
        var prevBlk = stream[stream.length - 1];
        var foldTarget =
          prevBlk.querySelector && prevBlk.querySelector(".clause-body") ? prevBlk.querySelector(".clause-body")
          : prevBlk.querySelector && prevBlk.querySelector(".subclause-text") ? prevBlk.querySelector(".subclause-text")
          : (prevBlk.classList && (prevBlk.classList.contains("clause-continuation") || prevBlk.classList.contains("subclause-continuation"))) ? prevBlk
          : null;
        if (foldTarget) {
          foldTarget.textContent = (String(foldTarget.textContent || "") + " " + String(blk.textContent || "")).replace(/\\s+/g, " ").trim();
          if (blk.parentElement) blk.parentElement.removeChild(blk);
          continue;
        }
      }
      stream.push(blk);
    }
    for (var c = 1; c < agreementSections.length; c++) agreementSections[c].remove();
    while (first.firstChild) first.removeChild(first.firstChild);
    var current = first;
    for (var s = 0; s < stream.length; s++) {
      var block = stream[s];
      // The signed joint-allotment reference dedicates its final sheet to execution/signatures.
      // Preserve that legal-document boundary instead of packing the closing block beneath the
      // last agreement clause merely because a shorter heading freed a few lines.
      var isClosingBlock = block.classList && block.classList.contains("closing-block")
        || block.querySelector && block.querySelector(".closing-intro");
      if (isClosingBlock && contentKids(current).length) {
        current = createAfter(current);
      }
      current.appendChild(block);
      var kids = contentKids(current);
      if (!pageFits(current) && kids.length > 1) {
        // First try to split the overflowing block so its head fills this page to the bottom.
        var remainder = splitBlockToFit(current, block);
        if (remainder) {
          stream.splice(s + 1, 0, remainder);
          current = createAfter(current);
        } else {
          // Can't split (table, short block, heading): move it to a fresh page. If it is a table,
          // carry its caption paragraph along so the heading stays with the table.
          var move = [block];
          var prev = kids[kids.length - 2];
          if (block.tagName === "TABLE" && kids.length > 2 && isCaptionP(prev)) move.unshift(prev);
          var next = createAfter(current);
          for (var mi = 0; mi < move.length; mi++) next.appendChild(move[mi]);
          current = next;
          // A lone block taller than a page still needs splitting so following content can flow.
          if (!pageFits(current)) {
            var rem2 = splitBlockToFit(current, block);
            if (rem2) stream.splice(s + 1, 0, rem2);
          }
        }
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
  if (typeof window === "undefined") return;
  if (!compiled) {
    // eslint-disable-next-line no-new-func
    compiled = new Function("return " + reflowPagesBrowserSource)() as ReflowFn;
  }
  compiled(root, opts);
}
