/**
 * Renders `hanzi` into `container` with pinyin shown directly over each
 * character (HTML `<ruby>`/`<rt>`) instead of as a separate line below
 * the whole phrase — per your 2026-08-28 "very hard for the child to
 * learn if the pinyin is on a separate paragraph" feedback. `charPinyin`
 * must have one entry per `Array.from(hanzi)` character (empty string
 * for punctuation, which gets no ruby annotation and is appended as a
 * plain text node instead — see idioms/types.ts's charPinyin comment
 * for where this data comes from). Built via DOM APIs (`createElement`/
 * `textContent`), not an `innerHTML` string, so there's no escaping to
 * get wrong even though every character here is trusted authored
 * content, not user input.
 */
export function renderRubyText(container: HTMLElement, hanzi: string, charPinyin: string[]): void {
  container.replaceChildren();
  const chars = Array.from(hanzi);
  chars.forEach((char, i) => {
    const pinyin = charPinyin[i];
    if (pinyin) {
      const ruby = document.createElement("ruby");
      ruby.append(char);
      const rt = document.createElement("rt");
      rt.textContent = pinyin;
      ruby.append(rt);
      container.append(ruby);
    } else {
      container.append(char);
    }
  });
}
