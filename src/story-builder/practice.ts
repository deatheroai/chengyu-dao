import HanziWriter from "hanzi-writer";
import { keepClipRefsRelative } from "../reading/clipRefs";

/**
 * Handwriting practice for a few characters the child picked from their
 * own story: watch the stroke order, trace, then write alone. Stroke
 * data for any character comes from hanzi-writer-data on jsDelivr
 * (pinned to the version the reading page bundles from), since the
 * child's characters aren't known in advance.
 */

const STROKE_DATA_URL = "https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1/";

type Writer = ReturnType<typeof HanziWriter.create>;

export interface PracticeEls {
  tabs: HTMLElement;
  pad: HTMLElement;
  feedback: HTMLElement;
  animate: HTMLButtonElement;
  trace: HTMLButtonElement;
  free: HTMLButtonElement;
}

function padSize(): number {
  return Math.max(200, Math.min(280, window.innerWidth - 80));
}

export function createPractice(els: PracticeEls) {
  let chars: string[] = [];
  let index = 0;
  let writer: Writer | null = null;
  let run = 0;

  /** A fresh writer per character: Safari doesn't repaint clip paths on setCharacter(). */
  function load(i: number): void {
    index = i;
    run++;
    const char = chars[i];
    for (const [j, tab] of [...els.tabs.children].entries()) tab.setAttribute("aria-selected", String(j === i));
    els.pad.replaceChildren();
    if (!els.pad.dataset.clipFix) {
      els.pad.dataset.clipFix = "1";
      keepClipRefsRelative(els.pad);
    }
    const size = padSize();
    els.pad.style.width = els.pad.style.height = `${size}px`;
    els.pad.dataset.char = char;
    els.feedback.textContent = "先看看笔顺吧！";
    writer = HanziWriter.create(els.pad, char, {
      width: size,
      height: size,
      padding: Math.round(size * 0.08),
      showOutline: true,
      showCharacter: false,
      strokeColor: "#2b2b2b",
      outlineColor: "#dfe6ee",
      drawingColor: "#3b82c4",
      highlightColor: "#f4a340",
      drawingWidth: 22,
      strokeAnimationSpeed: 1,
      delayBetweenStrokes: 250,
      charDataLoader: (c, onLoad, onError) => {
        fetch(`${STROKE_DATA_URL}${encodeURIComponent(c)}.json`)
          .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
          .then(onLoad)
          .catch((err) => {
            els.feedback.textContent = "这个字的笔顺暂时找不到，换一个字吧。";
            onError(err);
          });
      },
    });
  }

  function animate(): void {
    if (!writer) return;
    const my = ++run;
    writer.cancelQuiz();
    writer.showOutline();
    writer.hideCharacter({ duration: 0 });
    els.feedback.textContent = "看清楚笔顺哦。";
    void writer.animateCharacter({
      onComplete: () => {
        if (my === run) els.feedback.textContent = "现在描一描吧！";
      },
    });
  }

  function quiz(withOutline: boolean): void {
    if (!writer) return;
    const my = ++run;
    writer.cancelQuiz();
    if (withOutline) writer.showOutline();
    else writer.hideOutline();
    els.feedback.textContent = withOutline ? "沿着灰色的字描。" : "不看提示，自己写一写！";
    void writer.quiz({
      showHintAfterMisses: withOutline ? 2 : 3,
      onMistake: () => {
        if (my === run) els.feedback.textContent = "这一笔不对，再试试。";
      },
      onCorrectStroke: () => {
        if (my === run) els.feedback.textContent = "很好！";
      },
      onComplete: ({ totalMistakes }) => {
        if (my !== run) return;
        writer?.showOutline();
        if (withOutline) {
          els.feedback.textContent = "描完了！试试自己写？";
        } else if (totalMistakes === 0) {
          els.feedback.textContent = index < chars.length - 1 ? "一笔都没错！⭐ 练下一个字吧。" : "一笔都没错！⭐ 太棒了！";
        } else {
          els.feedback.textContent = `写完了，错了 ${totalMistakes} 笔。再写一次吧！`;
        }
      },
    });
  }

  els.animate.addEventListener("click", animate);
  els.trace.addEventListener("click", () => quiz(true));
  els.free.addEventListener("click", () => quiz(false));

  return {
    /** Shows tabs for `list` and loads the first character. */
    start(list: string[]): void {
      chars = list;
      els.tabs.replaceChildren(
        ...list.map((c, i) => {
          const b = document.createElement("button");
          b.type = "button";
          b.className = "char-tab";
          b.textContent = c;
          b.setAttribute("role", "tab");
          b.addEventListener("click", () => load(i));
          return b;
        }),
      );
      load(0);
    },
    stop(): void {
      run++;
      writer?.cancelQuiz();
    },
  };
}
