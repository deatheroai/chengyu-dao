import { isTestMode } from "../story-builder/library";
import { charPinyin } from "../story-builder/pinyin";
import { $, readPinyinPref, savePinyinPref, speak, speakButton } from "../story-builder/ui";
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
import { firstFindToday, loadProgress, nextNote, notesDone, saveProgress, withStamp, type Progress } from "./progress";
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
  writtenText,
  type ParsedNote,
  type RoundState,
} from "./round";

// ---------- pinyin + views ----------

let showPinyin = readPinyinPref();
function applyPinyin(): void {
  document.body.classList.toggle("no-pinyin", !showPinyin);
  $("btn-pinyin").setAttribute("aria-pressed", String(showPinyin));
}

type View = "home" | "play";
function show(view: View): void {
  for (const v of ["home", "play"] as View[]) $(`view-${v}`).hidden = v !== view;
  $("btn-home").style.visibility = view === "home" ? "hidden" : "visible";
  window.scrollTo({ top: 0 });
}

let progress: Progress = loadProgress();

interface Play {
  p: ParsedNote;
  s: RoundState;
  /** The mistake found and waiting for its fix, if any. */
  fixing?: number;
  /** Pinyin per cell: as written, and once fixed. */
  pyWritten: string[];
  pyRight: string[];
  done: boolean;
}
let play: Play | undefined;

// ---------- home ----------

function renderHome(): void {
  play = undefined;
  const done = notesDone(progress);
  const next = nextNote(progress);
  $("home-line").textContent = homeLine(done);
  $("start-emoji").textContent = next.emoji;
  $("start-sub").textContent = `${next.title} · P${next.level}`;
  $("home-count").hidden = done === 0;
  const best = Object.values(progress.stamps).filter((s) => s === "优").length;
  $("home-count").textContent = `已经改了 ${done} 张，${best} 个“优”`;
  show("home");
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
    setCellChar(b, c.char, pl.pyWritten[i] ?? "");
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
  $("note-speak").replaceChildren(speakButton(writtenText(pl.p)));
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
    pyWritten: charPinyin(writtenText(p)),
    pyRight: charPinyin(correctText(p)),
    done: false,
  };
  $("note-emoji").textContent = note.emoji;
  $("note-title").textContent = note.title;
  renderNote(play);
  renderInk(play);
  renderDots(play);
  $("fix").hidden = true;
  $("end").hidden = true;
  $("play-actions").hidden = false;
  $("btn-hint").hidden = false;
  $("btn-finish").hidden = note.kind !== "essay";
  say(openLine(p.mistakes.length, note.kind === "essay", note.starter === true));
  show("play");
}

function onTap(cell: number): void {
  const pl = play;
  if (!pl || pl.done) return;
  if (pl.fixing !== undefined) {
    say("先把这个字改好吧！👇");
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
  $("fix").scrollIntoView({ block: "nearest", behavior: "smooth" });
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
    setCellChar(el, m.right, pl.pyRight[m.cell] ?? "");
    el.classList.add("fixed");
    el.disabled = true;
  }
  pl.fixing = undefined;
  $("fix").hidden = true;
  speak(m.family.chars.find((c) => c.char === m.right)?.word ?? m.right);
  say(fixedLine(m.right), "😊");
  renderDots(pl);
  if (isOver(pl.p, pl.s)) setTimeout(() => endNote(pl), 900);
}

function onHint(): void {
  const pl = play;
  if (!pl || pl.done) return;
  if (pl.fixing !== undefined) {
    say("看看团团写的意思，再想想哪个字对。偏旁会告诉你答案！");
    return;
  }
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
  $("fix").hidden = true;
  clearHints();
  const missed = left(pl.p, pl.s);
  for (const i of missed) {
    const m = pl.p.mistakes[i];
    const el = cellEl(m.cell);
    if (!el) continue;
    setCellChar(el, m.right, pl.pyRight[m.cell] ?? "");
    el.classList.add("missed");
  }
  for (const el of $("note-text").querySelectorAll<HTMLButtonElement>(".cell")) el.disabled = true;
  const st = stamp(pl.p, pl.s);
  progress = withStamp(progress, pl.p.note.id, st);
  saveProgress(progress);
  const stampEl = $("stamp");
  stampEl.textContent = st;
  stampEl.className = `stamp stamp-${st === "优" ? "best" : st === "良" ? "good" : "try"}`;
  $("end-line").textContent = stampLine(st, pl.p.note.starter === true);
  $("end-missed").hidden = missed.length === 0;
  $("end-missed").textContent = missedLine(missed.length);
  $("play-actions").hidden = true;
  $("end").hidden = false;
  say(st === "加油" ? "没关系，团团也常常写错！" : "谢谢你！🎉", st === "加油" ? "🐼" : "🥳");
  if (st === "优") burst(stampEl);
  $("end").scrollIntoView({ block: "nearest", behavior: "smooth" });
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
    renderHome();
  });
  $("btn-start").addEventListener("click", () => startNote(nextNote(progress)));
  $("btn-next").addEventListener("click", () => startNote(nextNote(progress)));
  $("btn-end-home").addEventListener("click", renderHome);
  $("btn-hint").addEventListener("click", onHint);
  $("btn-finish").addEventListener("click", () => {
    const pl = play;
    if (!pl || pl.done || pl.fixing !== undefined) return;
    pl.s = finish(pl.s);
    endNote(pl);
  });
  // A grown-up can jump to a level or a note: ?level=4, ?note=p5-garden.
  const q = new URLSearchParams(location.search);
  const level = Number(q.get("level"));
  const noteId = q.get("note");
  renderHome();
  const jump =
    NOTES.find((x) => x.id === noteId) ??
    ((LEVELS as readonly number[]).includes(level)
      ? NOTES.find((x) => x.level === level && x.kind === "find" && !progress.stamps[x.id]) ?? NOTES.find((x) => x.level === level && x.kind === "find")
      : undefined);
  if (jump) startNote(jump);
}

init();
