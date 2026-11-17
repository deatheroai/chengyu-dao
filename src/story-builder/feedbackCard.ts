import { renderRubyText } from "../shared/rubyText";
import { finishSentence } from "./expansion";
import { isRewrite, type StoryFeedback } from "./feedback";
import { charPinyin } from "./pinyin";

/**
 * The 好词卡 (good-words card) after a story: two words the child used
 * well and one sentence to make richer, which the child rewrites
 * themselves. No pinyin until the child taps a word; then that word
 * shows it (separate from the page's 拼音 toggle).
 */

export interface FeedbackCardOptions {
  feedback: StoryFeedback;
  speakButton: (text: string) => HTMLButtonElement;
  /** Called with the child's rewrite, already checked and finished. */
  onRewrite: (sentence: string) => void;
}

const isHan = (c: string) => /\p{Script=Han}/u.test(c);

/** Splits text into words (Intl.Segmenter where the browser has it,
 * otherwise one character at a time). */
function words(text: string): string[] {
  const Segmenter = (Intl as unknown as { Segmenter?: typeof Intl.Segmenter }).Segmenter;
  if (Segmenter) return Array.from(new Segmenter("zh", { granularity: "word" }).segment(text), (s) => s.segment);
  return Array.from(text);
}

/** One tappable word with its pinyin, hidden until tapped. */
function tapWord(word: string, pinyin: string[]): HTMLElement {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "tapword";
  b.setAttribute("aria-pressed", "false");
  renderRubyText(b, word, pinyin);
  b.addEventListener("click", () => {
    const on = b.classList.toggle("show");
    b.setAttribute("aria-pressed", String(on));
  });
  return b;
}

/** Text where each Chinese word can be tapped for its pinyin. Pinyin
 * is worked out for the whole text so words like 了 read in context. */
export function tapText(text: string, cls = ""): HTMLElement {
  const span = document.createElement("span");
  span.className = `tap-text ${cls}`.trim();
  const pinyin = charPinyin(text);
  let at = 0;
  for (const w of words(text)) {
    const len = Array.from(w).length;
    span.append(Array.from(w).some(isHan) ? tapWord(w, pinyin.slice(at, at + len)) : w);
    at += len;
  }
  return span;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, ...children: (Node | string)[]): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  e.className = cls;
  e.append(...children);
  return e;
}

/** Builds the card. */
export function feedbackCard({ feedback, speakButton, onRewrite }: FeedbackCardOptions): HTMLElement {
  const card = el("section", "fb-card");
  card.dataset.source = feedback.source;
  card.append(el("h3", "fb-title", "📝 团团的好词卡"), el("p", "hint", "不认识的字？点一点，看拼音。"));

  const list = el("ul", "fb-list");
  for (const star of feedback.stars) {
    const li = el("li", "fb-item fb-star", el("span", "fb-icon", "⭐"));
    const body = el("div", "fb-body", el("span", "fb-quote", tapText(star.quote)), tapText(star.why, "fb-why"));
    li.append(body, speakButton(`${star.quote}。${star.why}`));
    list.append(li);
  }

  const wish = feedback.wish;
  if (wish) {
    const li = el("li", "fb-item fb-wish", el("span", "fb-icon", "🌱"));
    const body = el("div", "fb-body");
    const done = () => {
      body.replaceChildren(
        el("span", "fb-label", "你改好了："),
        tapText(wish.rewritten ?? "", "fb-sentence"),
        el("p", "fb-done", "⭐ 句子变得更生动了！"),
      );
      li.classList.add("done");
      li.querySelector(".speak-btn")?.replaceWith(speakButton(wish.rewritten ?? ""));
    };
    if (wish.rewritten) {
      done();
    } else {
      const tryBtn = el("button", "btn btn-primary fb-try", "✏️ 试一试");
      tryBtn.type = "button";
      body.append(el("span", "fb-label", "我的句子："), tapText(wish.sentence, "fb-sentence"), tapText(wish.tip, "fb-tip"), tryBtn);

      const rewrite = el("div", "fb-rewrite");
      rewrite.hidden = true;
      const chips = el("p", "hint-words", ...wish.words.map((w) => el("span", "hint-word", tapText(w))));
      const input = el("textarea", "fb-input");
      input.rows = 2;
      input.value = wish.sentence;
      input.setAttribute("aria-label", "改一改你的句子");
      const note = el("p", "partner-note");
      note.hidden = true;
      const save = el("button", "btn btn-primary fb-save", "改好了 ✓");
      save.type = "button";
      rewrite.append(el("p", "fb-label", "💡 可以用这些词："), chips, input, note, el("div", "actions", save));
      body.append(rewrite);

      tryBtn.addEventListener("click", () => {
        tryBtn.hidden = true;
        rewrite.hidden = false;
        input.focus();
      });
      save.addEventListener("click", () => {
        const text = input.value.trim();
        if (!isRewrite(wish.sentence, text)) {
          note.textContent = "🐼 换一个词试试，比如上面的💡词！";
          note.hidden = false;
          return;
        }
        wish.rewritten = finishSentence(text);
        onRewrite(wish.rewritten);
        done();
      });
    }
    li.append(body, speakButton(wish.rewritten ?? `${wish.sentence}${wish.tip}`));
    list.append(li);
  }

  if (!list.children.length) list.append(el("li", "fb-item", el("span", "fb-icon", "🐼"), tapText("你写完了一个故事，真棒！", "fb-body")));
  card.append(list);
  return card;
}
