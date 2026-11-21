/**
 * Text with pinyin over each character, for the story builder and the
 * sentence grower. Like shared/rubyText's renderRubyText, but
 * punctuation gets its own column too (a <span class="py-punct">), so it
 * sits on the same line as the characters instead of floating above
 * them, and it is glued to its neighbour so a line never starts with
 * ，。！？ or ends with “「. Layout is in style.css (ruby, .py-punct, .py-glue).
 */

/** Punctuation that must not start a line. */
const CLOSING = /[，。！？、；：”’）」』》…—,.!?;:)\]]/u;
/** Punctuation that must not end a line. */
const OPENING = /[“‘（「『《(\[]/u;

function wrapInGlue(container: HTMLElement, node: Element): HTMLElement {
  if (node.classList.contains("py-glue")) return node as HTMLElement;
  const glue = document.createElement("span");
  glue.className = "py-glue";
  container.insertBefore(glue, node);
  glue.append(node);
  return glue;
}

/**
 * Renders `text` into `container`; `pinyin` has one entry per
 * `Array.from(text)` character ("" for anything without pinyin).
 */
export function renderPinyin(container: HTMLElement, text: string, pinyin: string[]): void {
  container.replaceChildren();
  /** The top-level node holding the last character placed. */
  let last: Element | null = null;
  /** An opening mark waiting for the character after it. */
  let opening: HTMLElement | null = null;
  Array.from(text).forEach((ch, i) => {
    const py = pinyin[i];
    if (!py && /\s/u.test(ch)) {
      container.append(ch);
      last = null;
      opening = null;
      return;
    }
    let el: HTMLElement;
    if (py) {
      el = document.createElement("ruby");
      el.append(ch);
      const rt = document.createElement("rt");
      rt.textContent = py;
      el.append(rt);
    } else {
      el = document.createElement("span");
      el.className = "py-punct";
      el.textContent = ch;
    }

    if (opening) {
      opening.append(el);
      last = opening;
      if (!(!py && OPENING.test(ch))) opening = null;
    } else if (!py && CLOSING.test(ch) && last) {
      const glue = wrapInGlue(container, last);
      glue.append(el);
      last = glue;
    } else if (!py && OPENING.test(ch)) {
      const glue = document.createElement("span");
      glue.className = "py-glue";
      glue.append(el);
      container.append(glue);
      opening = glue;
      last = glue;
    } else {
      container.append(el);
      last = el;
    }
  });
}
