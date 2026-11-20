import HanziWriter from "hanzi-writer";
import { keepClipRefsRelative } from "../reading/clipRefs";

/**
 * 教团团写字: handwriting practice framed as teaching 团团 a few
 * characters from the child's own story. The child shows him the stroke
 * order, traces it, then writes it alone; a clean write means 团团 has
 * learned it, and the pad moves on to the next character. Stroke
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

export interface PracticeHooks {
  /** The child wrote `char` alone with no wrong strokes: 团团 learned it. */
  onLearned?: (char: string) => void;
  /** Every character in this round has been taught. */
  onAllLearned?: () => void;
}

/** Pause before moving on to the next character after one is learned. */
const NEXT_CHAR_DELAY_MS = 1800;

function padSize(): number {
  return Math.max(200, Math.min(280, window.innerWidth - 80));
}

export function createPractice(els: PracticeEls, hooks: PracticeHooks = {}) {
  let chars: string[] = [];
  let learned = new Set<string>();
  let index = 0;
  let nextTimer: ReturnType<typeof setTimeout> | undefined;
  let writer: Writer | null = null;
  let run = 0;

  /** A fresh writer per character: Safari doesn't repaint clip paths on setCharacter(). */
  function load(i: number): void {
    index = i;
    run++;
    clearTimeout(nextTimer);
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
    els.pad.dataset.size = String(size);
    els.pad.dataset.padding = String(Math.round(size * 0.08));
    els.feedback.textContent = learned.has(char) ? `我学会「${char}」啦！还想再写一遍吗？` : `「${char}」怎么写呀？先写给我看看笔顺吧！`;
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
            els.feedback.textContent = "哎呀，我找不到这个字的笔顺，教我下一个字吧。";
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
    els.feedback.textContent = "我在认真看……";
    void writer.animateCharacter({
      onComplete: () => {
        if (my === run) els.feedback.textContent = "原来是这样写的！你再描一遍，我跟着学。";
      },
    });
  }

  function quiz(withOutline: boolean): void {
    if (!writer) return;
    const my = ++run;
    writer.cancelQuiz();
    if (withOutline) writer.showOutline();
    else writer.hideOutline();
    els.feedback.textContent = withOutline ? "沿着灰色的字描，我看着呢。" : "不看提示写给我看！我在旁边学。";
    void writer.quiz({
      showHintAfterMisses: withOutline ? 2 : 3,
      onMistake: () => {
        if (my === run) els.feedback.textContent = "咦？这一笔好像不对，再试试？";
      },
      onCorrectStroke: () => {
        if (my === run) els.feedback.textContent = "嗯嗯！";
      },
      onComplete: ({ totalMistakes }) => {
        if (my !== run) return;
        writer?.showOutline();
        if (withOutline) {
          els.feedback.textContent = "我好像懂了！你不看提示写一遍给我看？";
        } else if (totalMistakes === 0) {
          teach(chars[index]);
        } else {
          els.feedback.textContent = `错了 ${totalMistakes} 笔，我有点糊涂了……再写一次给我看？`;
        }
      },
    });
  }

  /** 团团 learns `char`, then the pad moves on to the next one he doesn't know. */
  function teach(char: string): void {
    const first = !learned.has(char);
    learned.add(char);
    els.tabs.children[index]?.classList.add("learned");
    if (first) hooks.onLearned?.(char);
    const next = chars.findIndex((c) => !learned.has(c));
    if (next < 0) {
      els.feedback.textContent = `我学会「${char}」啦！你教的字我全都会写了，你是最棒的小老师！🎓`;
      if (first) hooks.onAllLearned?.();
      return;
    }
    els.feedback.textContent = `我学会「${char}」啦！谢谢你！⭐ 下一个……`;
    const my = run;
    nextTimer = setTimeout(() => {
      if (my === run) load(next);
    }, NEXT_CHAR_DELAY_MS);
  }

  els.animate.addEventListener("click", animate);
  els.trace.addEventListener("click", () => quiz(true));
  els.free.addEventListener("click", () => quiz(false));

  return {
    /** Shows tabs for `list` and loads the first character. */
    start(list: string[]): void {
      chars = list;
      learned = new Set();
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
      clearTimeout(nextTimer);
      writer?.cancelQuiz();
    },
  };
}
