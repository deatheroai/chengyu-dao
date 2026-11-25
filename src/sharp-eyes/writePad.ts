import HanziWriter from "hanzi-writer";
import { keepClipRefsRelative } from "../reading/clipRefs";

/**
 * The 火眼金睛 writing pad. After fixing a character she teaches 团团
 * how to write it: a new character goes watch → trace → write alone by
 * itself; one she has written before goes straight to writing alone
 * (watch and trace stay one tap away). Also runs the 默写: write alone
 * with no outline, or tap 看答案. Stroke data comes from jsDelivr, as
 * on the story builder's pad.
 */

const STROKE_DATA_URL = "https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1/";

type Writer = ReturnType<typeof HanziWriter.create>;

export interface PadEls {
  pad: HTMLElement;
  /** Where 团团 talks. */
  say: (text: string) => void;
}

function padSize(): number {
  return Math.max(200, Math.min(260, window.innerWidth - 80));
}

export function createWritePad(els: PadEls) {
  let writer: Writer | null = null;
  let char = "";
  let run = 0;

  function load(c: string): Writer {
    char = c;
    run++;
    els.pad.replaceChildren();
    if (!els.pad.dataset.clipFix) {
      els.pad.dataset.clipFix = "1";
      keepClipRefsRelative(els.pad);
    }
    const size = padSize();
    const padding = Math.round(size * 0.08);
    els.pad.style.width = els.pad.style.height = `${size}px`;
    els.pad.dataset.char = c;
    els.pad.dataset.size = String(size);
    els.pad.dataset.padding = String(padding);
    els.pad.dataset.phase = "";
    writer = HanziWriter.create(els.pad, c, {
      width: size,
      height: size,
      padding,
      showOutline: true,
      showCharacter: false,
      strokeColor: "#d2342a",
      outlineColor: "#eadfd2",
      drawingColor: "#2b2b2b",
      highlightColor: "#f4a340",
      drawingWidth: 22,
      strokeAnimationSpeed: 1,
      delayBetweenStrokes: 250,
      charDataLoader: (ch, onLoad, onError) => {
        fetch(`${STROKE_DATA_URL}${encodeURIComponent(ch)}.json`)
          .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
          .then(onLoad)
          .catch((err) => {
            els.say("哎呀，我找不到这个字的笔顺……我们先跳过它吧。");
            onError(err);
          });
      },
    });
    return writer;
  }

  /** Shows the stroke order, then calls `then`. */
  function watch(then?: () => void, line = `我看着呢，「${char}」是这样写的……`): void {
    if (!writer) return;
    const my = ++run;
    writer.cancelQuiz();
    writer.showOutline();
    writer.hideCharacter({ duration: 0 });
    els.pad.dataset.phase = "watch";
    els.say(line);
    void writer.animateCharacter({
      onComplete: () => {
        if (my === run) then?.();
      },
    });
  }

  /** A quiz: traced over the outline, or alone without it. */
  function quiz(traced: boolean, done: (mistakes: number) => void): void {
    if (!writer) return;
    const my = ++run;
    writer.cancelQuiz();
    writer.hideCharacter({ duration: 0 });
    if (traced) writer.showOutline();
    else writer.hideOutline();
    els.pad.dataset.phase = traced ? "trace" : "free";
    void writer.quiz({
      showHintAfterMisses: traced ? 2 : 3,
      onMistake: () => {
        if (my === run) els.say("咦？这一笔好像不对，再试试？");
      },
      onCorrectStroke: () => {
        if (my === run) els.say("嗯嗯！");
      },
      onComplete: ({ totalMistakes }) => {
        if (my !== run) return;
        writer?.showOutline();
        els.pad.dataset.phase = "done";
        done(totalMistakes);
      },
    });
  }

  return {
    /**
     * Teaching 团团 the fixed character. `guided` (a new character) runs
     * watch → trace → write alone by itself. `onWritten` gets the number
     * of wrong strokes in the write-alone try.
     */
    teach(c: string, guided: boolean, onWritten: (mistakes: number) => void): void {
      load(c);
      const alone = () => {
        els.say(`现在不看提示，写一个「${c}」给我看！`);
        quiz(false, onWritten);
      };
      if (guided) {
        watch(() => {
          els.say(`跟着灰色的字描一描「${c}」，我跟着学。`);
          quiz(true, () => setTimeout(alone, 500));
        });
      } else alone();
    },
    /** Help while writing alone: watch the strokes, then write again. */
    showStrokes(onWritten: (mistakes: number) => void): void {
      watch(() => {
        els.say(`看清楚了吗？再写一个「${char}」给我看！`);
        quiz(false, onWritten);
      });
    },
    /** Help while writing alone: trace it, then write again. */
    trace(onWritten: (mistakes: number) => void): void {
      els.say("跟着灰色的字描一描。");
      quiz(true, () => {
        els.say(`好！现在不看提示写一个「${char}」。`);
        quiz(false, onWritten);
      });
    },
    /** Another write-alone try. */
    again(onWritten: (mistakes: number) => void): void {
      els.say(`再写一个「${char}」给我看！`);
      quiz(false, onWritten);
    },
    /** 默写: write `c` from memory, no outline. */
    dictate(c: string, onWritten: (mistakes: number) => void): void {
      load(c);
      quiz(false, onWritten);
    },
    /** 看答案 in 默写: shows the character's strokes. */
    reveal(): void {
      watch(undefined, `是「${char}」，这样写的。记住了吗？`);
    },
    stop(): void {
      run++;
      writer?.cancelQuiz();
    },
  };
}
