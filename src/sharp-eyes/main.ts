import { gradeAttempt, type TestResult } from "../reading/memoryTest";
import { isTestMode } from "../story-builder/library";
import { charPinyin } from "../story-builder/pinyin";
import { $, readPinyinPref, ruby, savePinyinPref, speak, speakButton } from "../story-builder/ui";
import { DICTATION_MAX, promptFor, type DictPrompt } from "./dictation";
import { afterDictation, dueNow, waiting, withToWrite, withWrite, writeAfterFix } from "./writing";
import { createWritePad } from "./writePad";
import {
  QUICK_SECONDS,
  currentLevel,
  isFast,
  nextStageLabel,
  planSession,
  report,
  toNextLevel,
  type Stage,
  type StageResult,
} from "./session";
import type { Level } from "./families";
import type { Stamp } from "./round";
import { LEVELS } from "./families";
import {
  askFix,
  firstOfDay,
  fixedLine,
  hintLine,
  homeLine,
  missedLine,
  noHint,
  openLine,
  praise,
  stampLine,
  wrongPickLine,
  wrongTapLine,
} from "./lines";
import { NOTES, type Note } from "./notes";
import {
  firstFindToday,
  loadProgress,
  notesDone,
  saveProgress,
  withPen,
  withStamp,
  type DictItem,
  type Progress,
} from "./progress";
import {
  INK,
  choices,
  correctText,
  finish,
  hint,
  isOver,
  left,
  newRound,
  parseNote,
  pick,
  stamp,
  tap,
  tappable,
  type ParsedNote,
  type RoundState,
} from "./round";

// ---------- pinyin + views ----------

let showPinyin = readPinyinPref();
function applyPinyin(): void {
  document.body.classList.toggle("no-pinyin", !showPinyin);
  $("btn-pinyin").setAttribute("aria-pressed", String(showPinyin));
}

type View = "home" | "play" | "dict" | "report";
function show(view: View): void {
  for (const v of ["home", "play", "dict", "report"] as View[]) $(`view-${v}`).hidden = v !== view;
  $("btn-home").style.visibility = view === "home" ? "hidden" : "visible";
  window.scrollTo({ top: 0 });
}

let progress: Progress = loadProgress();

const scrollBehavior = (): ScrollBehavior =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";

interface Play {
  p: ParsedNote;
  s: RoundState;
  /** The mistake found and waiting for its fix, if any. */
  fixing?: number;
  /**
   * Pinyin per cell, of what 团团 meant to write: 眼晴 shows yǎnjing, as
   * when you type the right pinyin and pick the wrong character. The
   * pinyin of the wrong character (yǎn qíng) would give it away.
   */
  py: string[];
  /** The fixed mistake she is teaching 团团 to write, if any. */
  writing?: number;
  /** This write has been counted (再写一次 doesn't count again). */
  counted?: boolean;
  /** Per fixed mistake: written alone with no wrong stroke (in any try). */
  clean: Map<number, boolean>;
  done: boolean;
}
let play: Play | undefined;


/** The session being played (none when a single note was opened by ?note=). */
interface Run {
  level: Level;
  stages: Stage[];
  /** Stage index, and the sentence within a 快手改 stage. */
  si: number;
  qi: number;
  results: StageResult[];
  /** The 快手改 stage so far. */
  quickStamps: Stamp[];
  quickFast: number;
  /** 优 needed for the next level when the session started. */
  levelAtStart: Level;
}
let run: Run | undefined;

/** The running 快手改 clock. */
let quickTimer: ReturnType<typeof setInterval> | undefined;
let quickStartedAt = 0;

const writePad = createWritePad({ pad: $("write-pad"), say: (t) => ($("write-line").textContent = `🐼 ${t}`) });
const dictPad = createWritePad({ pad: $("dict-pad"), say: (t) => ($("dict-line").textContent = `🐼 ${t}`) });

// ---------- home ----------

function renderHome(): void {
  play = undefined;
  run = undefined;
  stopQuickTimer();
  const done = notesDone(progress);
  const level = currentLevel(progress);
  const next = planSession(progress, level)[0].notes[0];
  $("home-line").textContent = homeLine(done);
  $("start-emoji").textContent = next.emoji;
  $("start-sub").textContent = `${next.title} · P${next.level}`;
  $("home-level").textContent = levelLine(level);
  const best = Object.values(progress.stamps).filter((s) => s === "优").length;
  const pens = progress.pens?.length ?? 0;
  const due = dueNow(progress, Date.now()).length;
  const later = waiting(progress, Date.now());
  $("home-count").hidden = done === 0;
  $("home-count").textContent = `已经改了 ${done} 张，${best} 个“优”，${pens} 支✍️金笔` + (later ? `。还有 ${later} 个字过一会儿再默写。` : "");
  $("btn-home-dictate").hidden = due === 0;
  $("btn-home-dictate").textContent = `✍️ 团团想考你 ${Math.min(due, DICTATION_MAX)} 个字（默写）`;
  show("home");
}

function levelLine(level: Level): string {
  const more = toNextLevel(progress, level);
  return more ? `现在是 P${level} · 再拿 ${more} 个“优”就能升到 P${level + 1}` : `现在是 P${level} · 最高级了！`;
}

// ---------- the session ----------

function startSession(level?: Level): void {
  const lv = level ?? currentLevel(progress);
  run = { level: lv, stages: planSession(progress, lv), si: 0, qi: 0, results: [], quickStamps: [], quickFast: 0, levelAtStart: currentLevel(progress) };
  playStage();
}

function playStage(): void {
  if (!run) return;
  const stage = run.stages[run.si];
  if (!stage) return showReport();
  renderStrip();
  if (stage.kind === "quick") {
    run.qi = 0;
    run.quickStamps = [];
    run.quickFast = 0;
  }
  startNote(stage.notes[stage.kind === "quick" ? run.qi : 0]);
}

const STAGE_ICON = { find: "📝", quick: "⚡", essay: "📒" } as const;

function renderStrip(): void {
  const strip = $("stage-strip");
  strip.hidden = !run;
  if (!run) return;
  const r = run;
  strip.replaceChildren(
    ...r.stages.map((st, i) => {
      const li = document.createElement("li");
      li.className = i < r.si ? "done" : i === r.si ? "now" : "";
      li.textContent = STAGE_ICON[st.kind];
      return li;
    }),
    Object.assign(document.createElement("li"), { textContent: "🏅", className: r.si >= r.stages.length ? "now" : "" }),
  );
}

const inQuick = (): boolean => run?.stages[run.si]?.kind === "quick";

function startQuickTimer(level: Level): void {
  stopQuickTimer();
  quickStartedAt = Date.now();
  const total = QUICK_SECONDS[level];
  const bar = $("quick-bar");
  const box = $("quick-timer");
  box.hidden = false;
  box.classList.remove("over");
  const tick = () => {
    const left = Math.max(0, total - (Date.now() - quickStartedAt) / 1000);
    bar.style.width = `${(left / total) * 100}%`;
    if (left <= 0) {
      box.classList.add("over");
      box.dataset.label = "慢慢来也可以～";
    } else box.dataset.label = `⚡ ${Math.ceil(left)}`;
  };
  tick();
  quickTimer = setInterval(tick, 250);
}

function stopQuickTimer(): void {
  clearInterval(quickTimer);
  quickTimer = undefined;
}

/** After a 快手改 sentence: on to the next one, or the stage's end card. */
function quickSentenceDone(pl: Play, st: Stamp): boolean {
  const r = run;
  if (!r || !inQuick()) return false;
  const seconds = (Date.now() - quickStartedAt) / 1000;
  stopQuickTimer();
  const fast = st !== "加油" && isFast(r.level, seconds);
  r.quickStamps.push(st);
  if (fast) r.quickFast++;
  const stage = r.stages[r.si];
  if (r.qi + 1 < stage.notes.length) {
    say(fast ? `⚡ 够快！只用了 ${Math.round(seconds)} 秒！下一句……` : "改好了！下一句……", fast ? "🥳" : "😊");
    r.qi++;
    setTimeout(() => {
      if (run === r && play === pl) startNote(stage.notes[r.qi]);
    }, missedDelay(pl));
    return true;
  }
  return false;
}

/** A little longer to look when 团团 had to circle missed ones. */
const missedDelay = (pl: Play): number => (left(pl.p, pl.s).length ? 2200 : 1200);

function showReport(): void {
  const r = run;
  if (!r) return;
  stopQuickTimer();
  renderStrip();
  const before = progress.bestSession ?? 0;
  const rep = report(r.results, before);
  if (rep.best > before) {
    progress = { ...progress, bestSession: rep.best };
    saveProgress(progress);
  }
  const NAME = { find: "便条", quick: "快手改", essay: "作文" } as const;
  $("report-rows").replaceChildren(
    ...r.results.map((res) => {
      const li = document.createElement("li");
      const name = document.createElement("span");
      name.textContent = `${STAGE_ICON[res.kind]} ${NAME[res.kind]}`;
      const stamps = document.createElement("span");
      stamps.className = "report-stamps";
      for (const st of res.stamps) {
        const b = document.createElement("b");
        b.className = `mini-stamp stamp-${st === "优" ? "best" : st === "良" ? "good" : "try"}`;
        b.textContent = st;
        stamps.append(b);
      }
      const extra = document.createElement("span");
      extra.className = "report-extra";
      extra.textContent = [res.fast !== undefined ? `⚡${res.fast}` : "", res.pen ? "✍️" : ""].filter(Boolean).join(" ");
      li.append(name, stamps, extra);
      return li;
    }),
  );
  $("report-sum").textContent = `“优” ${rep.best} / ${rep.total} · ⚡ ${rep.fast} · ✍️ 金笔 ${rep.pens}`;
  $("report-line").textContent = rep.line;
  const now = currentLevel(progress);
  $("report-level").textContent = now > r.levelAtStart ? `🎉 升级了！下次是 P${now} 的字！` : levelLine(now);
  const toWrite = Math.min(DICTATION_MAX, dueNow(progress, Date.now()).length);
  $("btn-report-dictate").hidden = toWrite === 0;
  const later = waiting(progress, Date.now());
  if (!toWrite && later) $("report-line").textContent += ` 刚写过的 ${later} 个字，过几分钟团团再考你。`;
  $("btn-report-dictate").textContent = `✍️ 默写 ${toWrite} 个字`;
  show("report");
  if (rep.beatBest || rep.best === rep.total) burst($("report-sum"));
}

function nextAfterNote(): void {
  if (!run) return startSession();
  run.si++;
  playStage();
}

// ---------- the note ----------

function say(text: string, face = "🐼"): void {
  $("tuan-line").textContent = text;
  const f = $("tuan-face");
  f.textContent = face;
  f.classList.remove("bounce");
  void f.offsetWidth;
  f.classList.add("bounce");
}

function cellEl(i: number): HTMLButtonElement | null {
  return $("note-text").querySelector<HTMLButtonElement>(`[data-cell="${i}"]`);
}

function setCellChar(el: HTMLElement, char: string, py: string): void {
  const r = document.createElement("ruby");
  r.append(char);
  if (py) {
    const rt = document.createElement("rt");
    rt.textContent = py;
    r.append(rt);
  }
  el.replaceChildren(r);
}

function renderNote(pl: Play): void {
  const box = $("note-text");
  box.replaceChildren();
  // Punctuation is glued to its neighbour (closing marks to the
  // character before, opening marks to the one after), so a line never
  // starts with ，。！？ or ends with “.
  let glue: HTMLElement | null = null;
  let opening: HTMLElement | null = null;
  const glueWith = (prev: Element | null, el: HTMLElement): HTMLElement => {
    if (prev?.classList.contains("py-glue")) {
      prev.append(el);
      return prev as HTMLElement;
    }
    const g = document.createElement("span");
    g.className = "py-glue";
    if (prev) {
      box.insertBefore(g, prev);
      g.append(prev);
    } else box.append(g);
    g.append(el);
    return g;
  };
  pl.p.cells.forEach((c, i) => {
    if (!tappable(pl.p, i)) {
      const span = document.createElement("span");
      span.className = "py-punct cell-punct";
      span.textContent = c.char;
      if (/[“‘（「]/.test(c.char)) {
        opening = opening ? glueWith(opening, span) : glueWith(null, span);
      } else glue = glueWith(glue ?? box.lastElementChild, span);
      return;
    }
    const b = document.createElement("button");
    b.type = "button";
    b.className = "cell";
    b.dataset.cell = String(i);
    setCellChar(b, c.char, pl.py[i] ?? "");
    b.addEventListener("click", () => onTap(i));
    if (opening) {
      opening.append(b);
      glue = opening;
      opening = null;
    } else {
      box.append(b);
      glue = null;
    }
  });
  // Read aloud as meant, for the same reason as the pinyin.
  $("note-speak").replaceChildren(speakButton(correctText(pl.p)));
}

function renderInk(pl: Play): void {
  const ink = $("ink");
  if (pl.s.freeInk) {
    ink.textContent = "🖍️ 这张不用墨水";
    return;
  }
  ink.textContent = "";
  ink.setAttribute("aria-label", `红笔还有 ${pl.s.ink} 滴墨水`);
  for (let i = 0; i < INK; i++) {
    const d = document.createElement("span");
    d.className = `drop${i < pl.s.ink ? "" : " empty"}`;
    d.textContent = "💧";
    ink.append(d);
  }
}

function renderDots(pl: Play): void {
  const dots = $("found-dots");
  dots.replaceChildren();
  const essay = pl.p.note.kind === "essay";
  dots.hidden = essay;
  $("found-label").textContent = essay
    ? `已经找到 ${pl.s.found.length} 个`
    : `找到 ${pl.s.found.length} / ${pl.p.mistakes.length} 个`;
  pl.p.mistakes.forEach((_, i) => {
    const li = document.createElement("li");
    li.className = pl.s.fixed.includes(i) ? "dot fixed" : pl.s.found.includes(i) ? "dot found" : "dot";
    li.textContent = pl.s.fixed.includes(i) ? "⭕" : "";
    dots.append(li);
  });
}

function clearHints(): void {
  for (const el of $("note-text").querySelectorAll(".hinted")) el.classList.remove("hinted");
}

function startNote(note: Note): void {
  const p = parseNote(note);
  play = {
    p,
    s: newRound(p),
    py: charPinyin(correctText(p)),
    clean: new Map(),
    done: false,
  };
  stopQuickTimer();
  $("quick-timer").hidden = true;
  const quick = inQuick() && run ? { i: run.qi + 1, n: run.stages[run.si].notes.length } : undefined;
  $("note-emoji").textContent = quick ? "⚡" : note.emoji;
  $("note-title").textContent = quick ? `快手改 ${quick.i} / ${quick.n}` : note.title;
  renderNote(play);
  renderInk(play);
  renderDots(play);
  $("fix").hidden = true;
  $("write").hidden = true;
  $("end").hidden = true;
  $("play-actions").hidden = false;
  $("btn-hint").hidden = false;
  $("btn-finish").hidden = note.kind !== "essay";
  say(quick && quick.i > 1 ? "下一句！哪个字写错了？" : quick ? "⚡ 快手改！每句一个错字，看谁改得快！" : openLine(p.mistakes.length, note.kind === "essay", note.starter === true));
  show("play");
  if (quick && run) startQuickTimer(run.level);
}

function onTap(cell: number): void {
  const pl = play;
  if (!pl || pl.done) return;
  if (pl.fixing !== undefined) {
    say("先把这个字改好吧！👇");
    return;
  }
  if (pl.writing !== undefined) {
    say("先教团团写好这个字吧！✍️");
    return;
  }
  const { state, result } = tap(pl.p, pl.s, cell);
  pl.s = state;
  const el = cellEl(cell);
  if (result.kind === "found") {
    clearHints();
    el?.classList.add("found");
    const day = firstFindToday(progress);
    progress = day.progress;
    saveProgress(progress);
    say(day.first ? firstOfDay : praise(pl.s.found.length), "🙀");
    if (day.first) burst(el);
    openFix(pl, result.mistake);
  } else if (result.kind === "wrong") {
    el?.classList.add("ok");
    renderInk(pl);
    say(wrongTapLine(pl.s.freeInk, pl.s.ink), "🐼");
    if (result.out) endNote(pl);
  }
  renderDots(pl);
}

function openFix(pl: Play, mistake: number): void {
  pl.fixing = mistake;
  const m = pl.p.mistakes[mistake];
  const oops = $("oops");
  oops.replaceChildren(m.oops, speakButton(m.oops.replace(/[\p{Extended_Pictographic}‍️]/gu, "")));
  $("fix-ask").textContent = askFix;
  const box = $("fix-choices");
  box.replaceChildren();
  for (const c of choices(pl.p, mistake)) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "choice";
    b.textContent = c;
    b.addEventListener("click", () => onPick(c, b));
    box.append(b);
  }
  $("fix").hidden = false;
  $("fix").scrollIntoView({ block: "nearest", behavior: scrollBehavior() });
}

function onPick(char: string, button: HTMLButtonElement): void {
  const pl = play;
  if (!pl || pl.fixing === undefined) return;
  const mistake = pl.fixing;
  const { state, right } = pick(pl.p, pl.s, mistake, char);
  pl.s = state;
  if (!right) {
    button.disabled = true;
    say(wrongPickLine(char), "🤔");
    return;
  }
  const m = pl.p.mistakes[mistake];
  const el = cellEl(m.cell);
  if (el) {
    setCellChar(el, m.right, pl.py[m.cell] ?? "");
    el.classList.add("fixed");
    el.disabled = true;
  }
  pl.fixing = undefined;
  $("fix").hidden = true;
  speak(m.family.chars.find((c) => c.char === m.right)?.word ?? m.right);
  say(fixedLine(m.right), "😊");
  renderDots(pl);
  // Only a harder character she has never written is written now; it
  // (and any harder one from 快手改) comes back once more in a later 默写.
  const writeNow = !inQuick() && writeAfterFix(progress, m.right);
  progress = withToWrite(progress, { noteId: pl.p.note.id, mistake });
  saveProgress(progress);
  if (writeNow) setTimeout(() => openWrite(pl, mistake), 700);
  else if (isOver(pl.p, pl.s)) setTimeout(() => endNote(pl), inQuick() ? 0 : 900);
  else if (!inQuick()) setTimeout(() => play === pl && !pl.done && say(pl.p.note.kind === "essay" ? "还有错字吗？找完了就按“改好了”。" : "还有错字，继续找！🔍"), 1500);
}

// ---------- teach 团团 to write the fixed character ----------

function openWrite(pl: Play, mistake: number): void {
  if (play !== pl || pl.done) return;
  pl.writing = mistake;
  const m = pl.p.mistakes[mistake];
  const word = m.family.chars.find((c) => c.char === m.right)?.word ?? m.right;
  const label = $("write-label");
  label.replaceChildren(`✍️ 教团团写「${m.right}」`, ruby(`（${word}）`, "write-word"), speakButton(word));
  $("btn-again").hidden = true;
  $("btn-write-next").hidden = true;
  $("btn-watch").hidden = false;
  $("btn-trace").hidden = false;
  $("write").hidden = false;
  $("write-line").textContent = "";
  pl.counted = false;
  writePad.teach(m.right, true, onWritten);
  // After teach() has sized the pad, so the whole card comes into view.
  $("write").scrollIntoView({ block: "end", behavior: scrollBehavior() });
}

function onWritten(mistakes: number): void {
  const pl = play;
  if (!pl || pl.writing === undefined) return;
  const m = pl.p.mistakes[pl.writing];
  if (!pl.counted) {
    pl.counted = true;
    progress = withWrite(progress, m.right, Date.now());
    saveProgress(progress);
  }
  const clean = mistakes === 0;
  if (clean) pl.clean.set(pl.writing, true);
  else if (!pl.clean.has(pl.writing)) pl.clean.set(pl.writing, false);
  $("btn-write-next").hidden = false;
  $("btn-again").hidden = clean;
  if (clean) {
    $("write-line").textContent = `🥳 写得真好，一笔都没错！团团学会「${m.right}」了！✍️`;
    burst($("write-pad"));
  } else {
    $("write-line").textContent = `🤔 写好了！不过有 ${mistakes} 笔不太对……再写一次，好吗？`;
  }
}

function writeNext(): void {
  const pl = play;
  if (!pl || pl.writing === undefined) return;
  writePad.stop();
  pl.writing = undefined;
  $("write").hidden = true;
  if (isOver(pl.p, pl.s)) endNote(pl);
  else say(pl.p.note.kind === "essay" ? "还有错字吗？找完了就按“改好了”。" : "还有错字，继续找！🔍");
}

function onHint(): void {
  const pl = play;
  if (!pl || pl.done) return;
  if (pl.fixing !== undefined) {
    say("看看团团写的意思，再想想哪个字对。偏旁会告诉你答案！");
    return;
  }
  if (pl.writing !== undefined) return;
  const h = hint(pl.p, pl.s);
  if (!h) {
    say(noHint);
    return;
  }
  pl.s = h.state;
  clearHints();
  for (const c of h.hint.cells) cellEl(c)?.classList.add("hinted");
  say(hintLine(h.hint.step, h.hint.clue), "🧐");
}

function endNote(pl: Play): void {
  if (pl.done) return;
  pl.done = true;
  pl.fixing = undefined;
  pl.writing = undefined;
  writePad.stop();
  $("fix").hidden = true;
  $("write").hidden = true;
  clearHints();
  const missed = left(pl.p, pl.s);
  for (const i of missed) {
    const m = pl.p.mistakes[i];
    const el = cellEl(m.cell);
    if (!el) continue;
    setCellChar(el, m.right, pl.py[m.cell] ?? "");
    el.classList.add("missed");
  }
  for (const el of $("note-text").querySelectorAll<HTMLButtonElement>(".cell")) el.disabled = true;
  const st = stamp(pl.p, pl.s);
  progress = withStamp(progress, pl.p.note.id, st);
  saveProgress(progress);
  if (quickSentenceDone(pl, st)) return;
  const stampEl = $("stamp");
  stampEl.textContent = st;
  stampEl.className = `stamp stamp-${st === "优" ? "best" : st === "良" ? "good" : "try"}`;
  $("end-line").textContent = stampLine(st, pl.p.note.starter === true);
  $("end-missed").hidden = missed.length === 0;
  $("end-missed").textContent = missedLine(missed.length);
  const written = [...pl.clean.values()];
  const cleanCount = written.filter(Boolean).length;
  const pens = $("end-pens");
  pens.hidden = written.length === 0;
  const pen = written.length > 0 && cleanCount === written.length && missed.length === 0;
  if (pen) {
    progress = withPen(progress, pl.p.note.id);
    saveProgress(progress);
    pens.textContent = "✍️ 每个字都写得一笔不错，得到一支金笔！";
  } else {
    pens.textContent = `✍️ 写对了 ${cleanCount} / ${written.length} 个字`;
  }
  if (run) {
    const r = run;
    if (inQuick()) {
      // quickSentenceDone has already counted this last sentence.
      const stamps = [...r.quickStamps];
      const fast = r.quickFast;
      r.results.push({ kind: "quick", stamps, fast });
      pens.hidden = false;
      pens.textContent = `⚡ ${stamps.length} 句里有 ${fast} 句够快！`;
      $("end-line").textContent =
        stamps.every((x) => x === "优") ? "快手改全部“优”！团团都看呆了！" : "快手改完成！改得又快又准，团团好佩服！";
      stampEl.textContent = stamps.every((x) => x === "优") ? "优" : stamps.includes("加油") ? "加油" : "良";
      stampEl.className = `stamp stamp-${stampEl.textContent === "优" ? "best" : stampEl.textContent === "良" ? "good" : "try"}`;
    } else r.results.push({ kind: pl.p.note.kind, stamps: [st], pen });
  }
  $("btn-next").textContent = run ? nextStageLabel(run.stages[run.si + 1]) : "再来一张 📝";
  const toWrite = Math.min(DICTATION_MAX, dueNow(progress, Date.now()).length);
  $("btn-dictate").hidden = toWrite === 0;
  $("btn-dictate").textContent = `✍️ 默写 ${toWrite} 个字`;
  $("play-actions").hidden = true;
  $("end").hidden = false;
  say(st === "加油" ? "没关系，团团也常常写错！" : "谢谢你！🎉", st === "加油" ? "🐼" : "🥳");
  if (st === "优") burst(stampEl);
  $("end").scrollIntoView({ block: "nearest", behavior: scrollBehavior() });
}

/** A small burst of stars from an element, for the big moments. */
function burst(from: HTMLElement | null): void {
  if (!from || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  const r = from.getBoundingClientRect();
  for (let i = 0; i < 10; i++) {
    const s = document.createElement("span");
    s.className = "spark";
    s.textContent = ["⭐", "✨", "🌟"][i % 3];
    const a = (Math.PI * 2 * i) / 10;
    s.style.left = `${r.left + r.width / 2}px`;
    s.style.top = `${r.top + r.height / 2}px`;
    s.style.setProperty("--dx", `${Math.cos(a) * 80}px`);
    s.style.setProperty("--dy", `${Math.sin(a) * 80}px`);
    document.body.append(s);
    setTimeout(() => s.remove(), 900);
  }
}

// ---------- 默写 ----------

interface Dict {
  prompts: DictPrompt[];
  i: number;
  results: { item: DictItem; char: string; result: TestResult }[];
  revealed: boolean;
  done: boolean;
}
let dict: Dict | undefined;

function startDictation(): void {
  const prompts = dueNow(progress, Date.now())
    .slice(0, DICTATION_MAX)
    .map(promptFor)
    .filter((x): x is DictPrompt => x !== null);
  if (!prompts.length) return;
  writePad.stop();
  dict = { prompts, i: 0, results: [], revealed: false, done: false };
  $("dict-end").hidden = true;
  $("dict-pad-wrap").hidden = false;
  show("dict");
  showDictPrompt();
}

function showDictPrompt(): void {
  const d = dict;
  if (!d) return;
  const pr = d.prompts[d.i];
  d.revealed = false;
  d.done = false;
  $("dict-count").textContent = `第 ${d.i + 1} / ${d.prompts.length} 个`;
  const blank = (): HTMLElement => {
    const r = document.createElement("ruby");
    r.className = "dict-blank";
    r.append("\u3000");
    const rt = document.createElement("rt");
    rt.textContent = pr.pinyin;
    r.append(rt);
    return r;
  };
  // "＿" marks the same character again (爬来爬去): it gets a blank too.
  const part = (text: string): Node[] =>
    text.split("＿").flatMap((piece, i) => [...(i ? [blank()] : []), ...(piece ? [ruby(piece)] : [])]);
  $("dict-sentence").replaceChildren(...part(pr.before), blank(), ...part(pr.after));
  $("dict-line").textContent = d.i === 0 ? "🐼 团团来考考你！空格里是哪个字？写出来吧。" : "🐼 下一个！空格里是哪个字？";
  $("btn-dict-show").hidden = false;
  $("btn-dict-next").hidden = true;
  dictPad.dictate(pr.char, onDictWritten);
}

function onDictWritten(mistakes: number): void {
  const d = dict;
  if (!d || d.done) return;
  d.done = true;
  const pr = d.prompts[d.i];
  const result = gradeAttempt(mistakes, d.revealed);
  d.results.push({ item: pr.item, char: pr.char, result });
  $("dict-line").textContent =
    result === "correct" ? `🥳 对了！是「${pr.word}」的「${pr.char}」！⭐` : `🐼 写出来了！不过「${pr.char}」有几笔不太对，团团记下来，下次再写一写。`;
  $("btn-dict-show").hidden = true;
  $("btn-dict-next").hidden = false;
}

function dictShow(): void {
  const d = dict;
  if (!d || d.done) return;
  d.revealed = true;
  d.done = true;
  const pr = d.prompts[d.i];
  d.results.push({ item: pr.item, char: pr.char, result: "revealed" });
  dictPad.reveal();
  $("btn-dict-show").hidden = true;
  $("btn-dict-next").hidden = false;
}

function dictNext(): void {
  const d = dict;
  if (!d || !d.done) return;
  if (d.i + 1 < d.prompts.length) {
    d.i++;
    showDictPrompt();
    return;
  }
  dictPad.stop();
  progress = afterDictation(progress, d.results.map((r) => ({ item: r.item, ok: r.result === "correct" })), Date.now());
  saveProgress(progress);
  const right = d.results.filter((r) => r.result === "correct").length;
  $("dict-score").textContent = `默写：${right} / ${d.results.length}`;
  const list = $("dict-results");
  list.replaceChildren(
    ...d.results.map((r) => {
      const li = document.createElement("li");
      li.className = r.result === "correct" ? "ok" : "again";
      li.textContent = r.char;
      li.title = r.result === "correct" ? "写对了" : "下次再写";
      return li;
    }),
  );
  $("dict-end-line").textContent =
    right === d.results.length ? "全部写对了！这些字你都会了，团团不会再考啦！🎉" : "画圈的字，过一会儿团团再考你一次。一次比一次好！";
  $("dict-pad-wrap").hidden = true;
  $("dict-end").hidden = false;
  if (right === d.results.length) burst($("dict-score"));
}

// ---------- wiring ----------

function init(): void {
  applyPinyin();
  if (isTestMode()) {
    $("test-badge").hidden = false;
    document.title = `🧪 ${document.title}`;
    for (const a of document.querySelectorAll<HTMLAnchorElement>(".other-game a")) a.href += "?test";
  }
  $("btn-pinyin").addEventListener("click", () => {
    showPinyin = !showPinyin;
    savePinyinPref(showPinyin);
    applyPinyin();
  });
  $("btn-home").addEventListener("click", () => {
    if ("speechSynthesis" in window) speechSynthesis.cancel();
    writePad.stop();
    dictPad.stop();
    renderHome();
  });
  const written = (m: number) => onWritten(m);
  $("btn-watch").addEventListener("click", () => writePad.showStrokes(written));
  $("btn-trace").addEventListener("click", () => writePad.trace(written));
  $("btn-again").addEventListener("click", () => {
    $("btn-again").hidden = true;
    writePad.again(written);
  });
  $("btn-write-next").addEventListener("click", writeNext);
  $("btn-dictate").addEventListener("click", startDictation);
  $("btn-dict-show").addEventListener("click", dictShow);
  $("btn-dict-next").addEventListener("click", dictNext);
  $("btn-dict-home").addEventListener("click", renderHome);
  $("btn-dict-more").addEventListener("click", () => startSession());
  $("btn-start").addEventListener("click", () => startSession());
  $("btn-next").addEventListener("click", nextAfterNote);
  $("btn-report-home").addEventListener("click", renderHome);
  $("btn-report-dictate").addEventListener("click", startDictation);
  $("btn-home-dictate").addEventListener("click", startDictation);
  $("btn-end-home").addEventListener("click", renderHome);
  $("btn-hint").addEventListener("click", onHint);
  $("btn-finish").addEventListener("click", () => {
    const pl = play;
    if (!pl || pl.done || pl.fixing !== undefined || pl.writing !== undefined) return;
    pl.s = finish(pl.s);
    endNote(pl);
  });
  // A grown-up can jump to a level or a note: ?level=4, ?note=p5-garden.
  const q = new URLSearchParams(location.search);
  const level = Number(q.get("level"));
  const noteId = q.get("note");
  renderHome();
  const jump = NOTES.find((x) => x.id === noteId);
  if (jump) startNote(jump);
  else if ((LEVELS as readonly number[]).includes(level)) startSession(level as Level);
}

init();
