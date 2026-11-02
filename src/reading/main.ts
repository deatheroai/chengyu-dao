import HanziWriter from "hanzi-writer";
import { getStory, type TargetCharacter } from "./stories";
import { segmentStory, blankSentence } from "./storyText";
import { gradeAttempt, summarize, shuffled, type TestResult } from "./memoryTest";
import { storyStrokeData } from "./storyStrokeData";
import { keepClipRefsRelative } from "./clipRefs";

type Step = "read" | "practise" | "test";

const story = getStory();
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

// ---------- shared writer setup ----------

function padSize(): number {
  // Big enough to write in, but never wider than a phone screen.
  return Math.max(200, Math.min(300, window.innerWidth - 80));
}

/**
 * Always builds a fresh writer (and a fresh <svg>) rather than reusing
 * one via setCharacter(): Safari doesn't repaint the stroke clip paths
 * hanzi-writer swaps in on setCharacter(), leaving the new character's
 * outline drawn as thick unclipped blobs.
 */
function createWriter(el: HTMLElement, char: string, showOutline: boolean) {
  el.replaceChildren();
  if (!el.dataset.clipFix) {
    el.dataset.clipFix = "1";
    keepClipRefsRelative(el);
  }
  const size = padSize();
  const padding = Math.round(size * 0.08);
  el.style.width = el.style.height = `${size}px`;
  // Exposed for the e2e tests, which map stroke data to screen points.
  el.dataset.size = String(size);
  el.dataset.padding = String(padding);
  el.dataset.char = char;
  return HanziWriter.create(el, char, {
    width: size,
    height: size,
    padding,
    showOutline,
    showCharacter: false,
    strokeColor: "#2b2b2b",
    outlineColor: "#e4dccf",
    drawingColor: "#2f6fd6",
    highlightColor: "#f4a340",
    drawingWidth: 22,
    strokeAnimationSpeed: 1,
    delayBetweenStrokes: 250,
    charDataLoader: (c, onLoad, onError) => {
      const data = storyStrokeData[c];
      if (data) onLoad(data);
      else onError(new Error(`No stroke data bundled for "${c}" — run npm run gen:story-strokes`));
    },
  });
}

function miniBox(target: TargetCharacter, badge = ""): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "mini-box";
  btn.dataset.char = target.char;
  const py = document.createElement("span");
  py.className = "mini-pinyin";
  py.textContent = target.pinyin;
  const ch = document.createElement("span");
  ch.className = "mini-char";
  ch.textContent = target.char;
  const b = document.createElement("span");
  b.className = "mini-badge";
  b.textContent = badge;
  btn.append(py, ch, b);
  return btn;
}

// ---------- step navigation ----------

const stepButtons = Array.from(document.querySelectorAll<HTMLButtonElement>(".step"));

function goTo(step: Step): void {
  for (const b of stepButtons) b.setAttribute("aria-selected", String(b.dataset.step === step));
  for (const p of document.querySelectorAll<HTMLElement>(".panel")) p.hidden = p.dataset.panel !== step;
  document.body.dataset.step = step;
  if (step !== "practise") practise.leave();
  if (step !== "test") test.leave();
  if (step === "practise") practise.enter();
  if (step === "test") test.enter();
  window.scrollTo({ top: 0 });
}

stepButtons.forEach((b) => b.addEventListener("click", () => goTo(b.dataset.step as Step)));
document.querySelectorAll<HTMLElement>("[data-goto]").forEach((b) =>
  b.addEventListener("click", () => goTo(b.dataset.goto as Step)),
);

// ---------- step 1: read ----------

function renderStory(): void {
  $("story-title").textContent = story.title;
  const textEl = $("story-text");
  textEl.replaceChildren();
  for (const seg of segmentStory(story)) {
    if (seg.kind === "text") {
      textEl.append(seg.text);
      continue;
    }
    const word = document.createElement("span");
    word.className = "target-word";
    word.title = `${seg.target.word} — ${seg.target.meaning}`;
    for (const c of seg.text) {
      if (c === seg.target.char) {
        const ruby = document.createElement("ruby");
        ruby.className = "target-char";
        ruby.append(c);
        const rt = document.createElement("rt");
        rt.textContent = seg.target.pinyin;
        ruby.append(rt);
        word.append(ruby);
      } else {
        word.append(c);
      }
    }
    textEl.append(word);
  }

  const row = $("read-char-row");
  for (const t of story.targets) {
    const box = miniBox(t);
    box.addEventListener("click", () => {
      practise.focusOn([t.char]);
      goTo("practise");
    });
    row.append(box);
  }

  const readBtn = $("read-aloud");
  if (!("speechSynthesis" in window)) {
    readBtn.hidden = true;
  } else {
    readBtn.addEventListener("click", () => {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(story.text);
      u.lang = "zh-CN";
      u.rate = 0.8;
      speechSynthesis.speak(u);
    });
  }
}

// ---------- step 2: practise ----------

const practise = (() => {
  let index = 0;
  let writer: ReturnType<typeof HanziWriter.create> | null = null;
  let run = 0; // bumps on every action, so stale callbacks are ignored
  const stars = new Map<string, number>(); // 1 = traced, 2 = written alone
  const row = $("practise-char-row");
  const feedback = $("practise-feedback");
  const boxes = story.targets.map((t, i) => {
    const box = miniBox(t);
    box.setAttribute("role", "option");
    box.addEventListener("click", () => select(i));
    row.append(box);
    return box;
  });

  function refreshBoxes(): void {
    boxes.forEach((box, i) => {
      box.setAttribute("aria-selected", String(i === index));
      const n = stars.get(story.targets[i].char) ?? 0;
      box.querySelector(".mini-badge")!.textContent = "★".repeat(n);
    });
  }

  function award(n: number): void {
    const c = story.targets[index].char;
    stars.set(c, Math.max(stars.get(c) ?? 0, n));
    refreshBoxes();
  }

  let entered = false;

  function select(i: number): void {
    index = i;
    const t = story.targets[i];
    $("practise-pinyin").textContent = t.pinyin;
    $("practise-word").textContent = `${t.word} · ${t.meaning}`;
    refreshBoxes();
    if (!entered) return; // enter() will draw it
    run++;
    writer?.cancelQuiz();
    writer = createWriter($("practise-pad"), t.char, true);
    animate();
  }

  function animate(): void {
    if (!writer) return;
    const my = ++run;
    writer.cancelQuiz();
    writer.showOutline();
    feedback.textContent = "看清楚笔顺哦。";
    writer.hideCharacter({ duration: 0 });
    void writer.animateCharacter({
      onComplete: () => {
        if (my === run) feedback.textContent = "现在描一描吧！";
      },
    });
  }

  function quiz(withOutline: boolean): void {
    if (!writer) return;
    const my = ++run;
    writer.cancelQuiz();
    if (withOutline) writer.showOutline();
    else writer.hideOutline();
    feedback.textContent = withOutline ? "沿着灰色的字描。" : "不看提示，自己写一写。";
    void writer.quiz({
      showHintAfterMisses: withOutline ? 2 : 3,
      onMistake: () => {
        if (my === run) feedback.textContent = "这一笔不对，再试试。";
      },
      onCorrectStroke: () => {
        if (my === run) feedback.textContent = "很好！";
      },
      onComplete: ({ totalMistakes }) => {
        if (my !== run) return;
        if (withOutline) {
          award(1);
          feedback.textContent = totalMistakes === 0 ? "描得真好！试试自己写？" : "描完了！再描一次，或试试自己写。";
        } else {
          writer!.showOutline();
          if (totalMistakes <= 1) {
            award(2);
            feedback.textContent = "太棒了！你记住这个字了。";
          } else {
            award(1);
            feedback.textContent = `写完了，错了 ${totalMistakes} 笔。再写一次吧！`;
          }
        }
      },
    });
  }

  $("btn-animate").addEventListener("click", animate);
  $("btn-trace").addEventListener("click", () => quiz(true));
  $("btn-free").addEventListener("click", () => quiz(false));

  return {
    enter(): void {
      entered = true;
      select(index);
    },
    leave(): void {
      run++;
      writer?.cancelQuiz();
    },
    focusOn(chars: string[]): void {
      const i = story.targets.findIndex((t) => chars.includes(t.char));
      if (i >= 0) index = i;
    },
  };
})();

// ---------- step 3: write from memory ----------

const test = (() => {
  let order: TargetCharacter[] = [];
  let pos = 0;
  let results: { char: string; result: TestResult }[] = [];
  let writer: ReturnType<typeof HanziWriter.create> | null = null;
  let run = 0;
  let finished = false;
  const feedback = $("test-feedback");
  const nextBtn = $<HTMLButtonElement>("btn-test-next");
  const retryBtn = $<HTMLButtonElement>("btn-test-retry");
  const revealBtn = $<HTMLButtonElement>("btn-test-reveal");

  function start(): void {
    order = shuffled(story.targets);
    pos = 0;
    results = [];
    finished = false;
    $("test-run").hidden = false;
    $("test-summary").hidden = true;
    show();
  }

  function show(): void {
    const t = order[pos];
    $("test-progress").textContent = `第 ${pos + 1} / ${order.length} 个字`;
    const { before, after } = blankSentence(story, t);
    const prompt = $("test-prompt");
    prompt.replaceChildren();
    const blank = document.createElement("span");
    blank.className = "blank";
    const py = document.createElement("span");
    py.className = "blank-py";
    py.textContent = t.pinyin;
    const box = document.createElement("span");
    box.className = "blank-box";
    blank.append(py, box);
    prompt.append(before, blank, after);

    nextBtn.hidden = true;
    retryBtn.hidden = revealBtn.hidden = false;
    feedback.textContent = "想一想，把空格里的字写出来。";
    writer?.cancelQuiz();
    writer = createWriter($("test-pad"), t.char, false);
    startQuiz();
  }

  function startQuiz(): void {
    if (!writer) return;
    const my = ++run;
    writer.cancelQuiz();
    void writer.quiz({
      showHintAfterMisses: 3,
      onMistake: () => {
        if (my === run) feedback.textContent = "这一笔好像不对……";
      },
      onCorrectStroke: () => {
        if (my === run) feedback.textContent = "";
      },
      onComplete: ({ totalMistakes }) => {
        if (my === run) record(gradeAttempt(totalMistakes, false), totalMistakes);
      },
    });
  }

  function record(result: TestResult, mistakes = 0): void {
    run++;
    results.push({ char: order[pos].char, result });
    feedback.textContent =
      result === "correct" ? "✓ 写对了！" : result === "shaky" ? `△ 写出来了，错了 ${mistakes} 笔。` : "✗ 记住它的样子，下次再试。";
    retryBtn.hidden = revealBtn.hidden = true;
    nextBtn.hidden = false;
    nextBtn.textContent = pos + 1 < order.length ? "下一个 →" : "看成绩 →";
    nextBtn.focus();
  }

  retryBtn.addEventListener("click", () => {
    feedback.textContent = "再写一次。";
    startQuiz();
  });

  revealBtn.addEventListener("click", () => {
    if (!writer) return;
    writer.cancelQuiz();
    record("revealed");
    writer.showOutline();
    writer.hideCharacter({ duration: 0 });
    void writer.animateCharacter();
  });

  nextBtn.addEventListener("click", () => {
    if (pos + 1 < order.length) {
      pos++;
      show();
    } else {
      showSummary();
    }
  });

  function showSummary(): void {
    finished = true;
    const s = summarize(results);
    $("test-run").hidden = true;
    $("test-summary").hidden = false;
    $("summary-title").textContent =
      s.correct === s.total ? `全对！${s.correct} / ${s.total} 🎉` : `写对了 ${s.correct} / ${s.total} 个字`;
    const row = $("summary-row");
    row.replaceChildren();
    const mark: Record<TestResult, string> = { correct: "✓", shaky: "△", revealed: "✗" };
    for (const t of story.targets) {
      const r = results.find((x) => x.char === t.char)!.result;
      const box = miniBox(t, mark[r]);
      box.classList.add(`result-${r}`);
      box.disabled = true;
      row.append(box);
    }
    const reviewBtn = $<HTMLButtonElement>("btn-review");
    reviewBtn.hidden = s.toReview.length === 0;
    reviewBtn.onclick = () => {
      practise.focusOn(s.toReview);
      goTo("practise");
    };
  }

  $("btn-test-again").addEventListener("click", start);

  return {
    enter(): void {
      if (!writer || finished) start();
      else if (nextBtn.hidden) startQuiz(); // resume the current character
    },
    leave(): void {
      run++;
      writer?.cancelQuiz();
    },
  };
})();

renderStory();
goTo("read");
