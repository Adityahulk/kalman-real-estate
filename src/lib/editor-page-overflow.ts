const PAGE_CONTENT_HEIGHT = 1110;
const PAGE_SELECTOR = "section[data-ambey-page], section[data-letter-page]";

export function autoOverflowPages(root: HTMLElement) {
  const pages = [...root.querySelectorAll<HTMLElement>(PAGE_SELECTOR)];
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    if (page.scrollHeight <= PAGE_CONTENT_HEIGHT) continue;
    const children = [...page.children].filter(
      (el) => !el.hasAttribute("data-editor-page-controls"),
    ) as HTMLElement[];
    let splitIndex = -1;
    for (let j = children.length - 1; j >= 0; j--) {
      const child = children[j];
      const childBottom = child.offsetTop + child.offsetHeight - page.offsetTop;
      if (childBottom <= PAGE_CONTENT_HEIGHT) {
        splitIndex = j + 1;
        break;
      }
    }
    if (splitIndex <= 0 || splitIndex >= children.length) continue;
    const overflow = children.slice(splitIndex);
    if (!overflow.length) continue;
    let nextPage = pages[i + 1];
    if (!nextPage) {
      nextPage = document.createElement("section");
      const attr = page.hasAttribute("data-ambey-page") ? "data-ambey-page" : "data-letter-page";
      nextPage.setAttribute(attr, "0");
      if (page.className) nextPage.className = page.className;
      page.parentElement?.insertBefore(nextPage, page.nextSibling);
      pages.splice(i + 1, 0, nextPage);
    }
    const firstChild = nextPage.firstChild;
    for (const el of overflow) {
      nextPage.insertBefore(el, firstChild);
    }
    renumberPages(root);
  }
}

function renumberPages(root: HTMLElement) {
  const pages = [...root.querySelectorAll<HTMLElement>(PAGE_SELECTOR)];
  pages.forEach((page, index) => {
    if (page.hasAttribute("data-ambey-page")) page.setAttribute("data-ambey-page", String(index + 1));
    else page.setAttribute("data-letter-page", String(index + 1));
  });
}
