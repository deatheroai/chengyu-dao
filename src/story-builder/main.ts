import { renderRubyText } from "../shared/rubyText";
import { ADVENTURES, getAdventure, type Adventure } from "./adventures";
import { finishSentence, isUsableSentence, sensesUsed } from "./expansion";
import { TURNS, charsToPractise, openingBeat, pickMission, scriptedNext, wheelRotation } from "./flow";
import { deleteStory, loadLibrary, saveStory, storyText, type SavedStory, type StoryLine } from "./library";
import type { NextBeat, TurnResponse } from "./partnerApi";
import { partnerEnabled, requestStart, requestTurn } from "./partnerClient";
import { charPinyin } from "./pinyin";
import { createPractice } from "./practice";
import { SENSES, SENSE_IDS, getSense, type SenseId } from "./senses";

const $ = <T extends HTMLElement = HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} missing`);
  return el as T;
};

// ---------- shared helpers ----------

const PINYIN_KEY = "chengyu-dao:story-builder:pinyin";
function readPinyinPref(): boolean {
  try {
    return localStorage.getItem(PINYIN_KEY) !== "off";
  } catch {
    return true;
  }
}
let showPinyin = readPinyinPref();

function applyPinyin(): void {
  document.body.classList.toggle("no-pinyin", !showPinyin);
  $("btn-pinyin").setAttribute("aria-pressed", String(showPinyin));
}

/** Text with pinyin over each character. */
function ruby(text: string, cls = ""): HTMLElement {
  const span = document.createElement("span");
  if (cls) span.className = cls;
  renderRubyText(span, text, charPinyin(text));
  return span;
}

function speak(text: string): void {
  if (!("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "zh-CN";
  u.rate = 0.8;
  speechSynthesis.speak(u);
}

function speakButton(text: string): HTMLButtonElement {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "speak-btn";
  b.textContent = "🔊";
  b.setAttribute("aria-label", "朗读");
  b.hidden = !("speechSynthesis" in window);
  b.addEventListener("click", () => speak(text));
  return b;
}

// Voice input (Chrome / Safari); hidden where unsupported.
type Recognition = {
  lang: string;
  interimResults: boolean;
  start(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
};
const RecognitionCtor: (new () => Recognition) | undefined =
  (window as unknown as Record<string, new () => Recognition>).SpeechRecognition ??
  (window as unknown as Record<string, new () => Recognition>).webkitSpeechRecognition;

function wireMic(button: HTMLButtonElement, input: HTMLTextAreaElement): void {
  if (!RecognitionCtor) return;
  button.hidden = false;
  button.addEventListener("click", () => {
    const rec = new RecognitionCtor();
    rec.lang = "zh-CN";
    rec.interimResults = false;
    button.classList.add("listening");
    rec.onresult = (e) => {
      const said = e.results[0]?.[0]?.transcript ?? "";
      const at = input.selectionEnd ?? input.value.length;
      input.value = input.value.slice(0, at) + said + input.value.slice(at);
    };
    rec.onend = () => button.classList.remove("listening");
    rec.start();
  });
}

// ---------- views ----------

type View = "home" | "play" | "read";
function show(view: View): void {
  for (const v of ["home", "play", "read"] as View[]) $(`view-${v}`).hidden = v !== view;
  $("btn-home").style.visibility = view === "home" ? "hidden" : "visible";
  window.scrollTo({ top: 0 });
}

let aiEnabled = false;

// ---------- home ----------

function renderHome(): void {
  $("adventure-grid").replaceChildren(
    ...ADVENTURES.map((a) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "adventure-card";
      card.dataset.adventure = a.id;
      const emoji = document.createElement("span");
      emoji.className = "adventure-emoji";
      emoji.textContent = a.emoji;
      card.append(emoji, ruby(a.title, "adventure-title"), ruby(a.blurb, "adventure-blurb"));
      card.addEventListener("click", () => startAdventure(a));
      return card;
    }),
  );
  $("idea-card").hidden = !aiEnabled;
  $("idea-hint").textContent = "";

  const library = loadLibrary();
  $("library").hidden = library.length === 0;
  $("library-list").replaceChildren(
    ...library.map((s) => {
      const li = document.createElement("li");
      const b = document.createElement("button");
      b.type = "button";
      b.className = "library-item";
      const emoji = getAdventure(s.adventureId)?.emoji ?? "✏️";
      b.textContent = `${emoji} ${s.title}`;
      const small = document.createElement("small");
      small.textContent = new Date(s.savedAt).toLocaleDateString("zh-CN", { month: "long", day: "numeric" });
      b.append(small);
      b.addEventListener("click", () => openSaved(s));
      li.append(b);
      return li;
    }),
  );
  show("home");
}

// ---------- play ----------

interface Game {
  adventure?: Adventure;
  title: string;
  lines: StoryLine[];
  /** Child turns finished so far. */
  done: number;
  /** 团团's current beat: its question and hints. */
  beat: NextBeat;
  /** The child's sentence before this turn's mission. */
  original: string;
  mission?: SenseId;
  /** The latest AI verdict this turn (used if the child skips). */
  pending?: TurnResponse;
  stars: number;
  storyId: string;
  busy: boolean;
}
let game: Game | undefined;
let wheelAngle = 0;

const sentenceInput = () => $<HTMLTextAreaElement>("sentence");

function lineItem(line: StoryLine): HTMLLIElement {
  const li = document.createElement("li");
  li.className = `line line-${line.by}`;
  const who = document.createElement("span");
  who.className = "who";
  who.textContent = line.by === "partner" ? "🐼" : "🧒";
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  if (line.by === "partner") {
    bubble.append(ruby(line.text, "line-text"));
  } else {
    const text = document.createElement("span");
    text.className = "line-text";
    text.textContent = line.text;
    bubble.append(text);
    if (line.plain && line.plain !== line.text) {
      const before = document.createElement("span");
      before.className = "line-before";
      before.textContent = `原来：${line.plain}`;
      bubble.append(before);
    }
    if (line.mission) {
      const meta = document.createElement("span");
      meta.className = "line-meta";
      const s = getSense(line.mission);
      meta.textContent = line.missionDone ? `${s.emoji} ${s.mission} ⭐` : `${s.emoji} ${s.mission}`;
      bubble.append(meta);
    }
  }
  bubble.append(speakButton(line.text));
  li.append(who, bubble);
  return li;
}

function addLine(line: StoryLine, note?: string): void {
  if (!game) return;
  game.lines.push(line);
  const li = lineItem(line);
  if (note) {
    const n = document.createElement("p");
    n.className = "praise";
    n.textContent = `🐼 ${note}`;
    li.querySelector(".bubble")?.prepend(n);
  }
  $("story-flow").append(li);
}

function newGame(title: string, beat: NextBeat, adventure?: Adventure): void {
  game = {
    adventure,
    title,
    lines: [],
    done: 0,
    beat,
    original: "",
    stars: 0,
    storyId: `${adventure?.id ?? "idea"}-${Date.now()}`,
    busy: false,
  };
  $("play-title").replaceChildren(adventure ? ruby(`${adventure.emoji} ${adventure.title}`) : ruby(`✏️ ${title}`));
  $("story-flow").replaceChildren();
  $("turn-end").hidden = true;
  show("play");
  addLine({ by: "partner", text: beat.line });
  speak(beat.line);
  openTurn();
}

function startAdventure(adventure: Adventure): void {
  newGame(adventure.title, openingBeat(adventure), adventure);
}

async function startIdea(idea: string): Promise<void> {
  const hint = $("idea-hint");
  if (!isUsableSentence(idea, 2)) {
    hint.textContent = "先写一写你的想法吧！";
    return;
  }
  hint.textContent = "🐼 团团在想故事的开头……";
  $<HTMLButtonElement>("btn-idea").disabled = true;
  const res = await requestStart(idea);
  $<HTMLButtonElement>("btn-idea").disabled = false;
  if (!res) {
    hint.textContent = "团团现在想不出来，先选一个上面的故事吧！";
    return;
  }
  $<HTMLInputElement>("idea-input").value = "";
  newGame(idea, res.next);
}

/** Phase 1 of a turn: write a sentence. */
function openTurn(): void {
  if (!game) return;
  const g = game;
  $("turn").hidden = false;
  $("turn-count").textContent = `${g.done + 1} / ${TURNS}`;
  $("turn-prompt").replaceChildren(ruby(g.beat.question), speakButton(g.beat.question));
  const input = sentenceInput();
  input.value = "";
  input.readOnly = false;
  $("turn-hint").textContent = "";
  $("btn-written").hidden = false;
  $("spin-area").hidden = true;
  $("mission").hidden = true;
  g.mission = undefined;
  g.pending = undefined;
  g.original = "";
  $("turn").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

/** Phase 2: the sentence is written; spin for a mission. */
function finishWriting(): void {
  if (!game) return;
  const text = sentenceInput().value.trim();
  if (!isUsableSentence(text)) {
    $("turn-hint").textContent = text ? "再多写几个字吧！" : "先写一句话吧！";
    return;
  }
  game.original = text;
  $("turn-hint").textContent = "";
  $("btn-written").hidden = true;
  renderWheel(sensesUsed(text, game.adventure?.beats[game.done]));
  $("spin-area").hidden = false;
  $<HTMLButtonElement>("btn-spin").disabled = false;
  $("spin-area").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function renderWheel(used: SenseId[]): void {
  const wheel = $("wheel");
  wheel.replaceChildren(
    ...SENSES.map((s, i) => {
      const slot = document.createElement("span");
      slot.className = "wheel-slot";
      slot.dataset.sense = s.id;
      slot.classList.toggle("used", used.includes(s.id));
      slot.style.setProperty("--angle", `${i * (360 / SENSES.length)}deg`);
      const emoji = document.createElement("span");
      emoji.className = "wheel-emoji";
      emoji.textContent = s.emoji;
      const label = document.createElement("span");
      label.className = "wheel-label";
      label.textContent = s.label;
      slot.append(emoji, label);
      return slot;
    }),
  );
  wheel.dataset.used = used.join(",");
}

function spin(): void {
  if (!game || game.mission) return;
  const used = ($("wheel").dataset.used ?? "").split(",").filter(Boolean) as SenseId[];
  const mission = pickMission(used);
  game.mission = mission;
  $<HTMLButtonElement>("btn-spin").disabled = true;
  wheelAngle = wheelRotation(wheelAngle, SENSE_IDS.indexOf(mission));
  const wheel = $("wheel");
  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  wheel.style.transitionDuration = reduced ? "0.2s" : "2.4s";
  wheel.style.transform = `rotate(${wheelAngle}deg)`;
  window.setTimeout(() => openMission(mission), reduced ? 250 : 2500);
}

/** Phase 3: the mission card. The child edits their own sentence. */
function openMission(mission: SenseId): void {
  if (!game) return;
  const s = getSense(mission);
  for (const slot of document.querySelectorAll<HTMLElement>(".wheel-slot")) {
    slot.classList.toggle("picked", slot.dataset.sense === mission);
  }
  // The pick was shown on the wheel; now keep the sentence and the mission together.
  $("spin-area").hidden = true;
  $("mission").dataset.sense = mission;
  $("mission-title").textContent = `${s.emoji} ${s.mission}`;
  $("mission-question").replaceChildren(ruby(s.question), speakButton(s.question));
  const hints = game.beat.hints[mission]?.length ? game.beat.hints[mission] : s.words.slice(0, 3);
  $("hint-words").replaceChildren(
    ...hints.map((w) => {
      const span = document.createElement("span");
      span.className = "hint-word";
      span.append(ruby(w));
      return span;
    }),
  );
  $("hint-words").hidden = true;
  $("btn-hint").hidden = hints.length === 0;
  $("partner-note").hidden = true;
  $("thinking").hidden = true;
  $("mission").hidden = false;
  speak(s.question);
  $("mission").scrollIntoView({ behavior: "smooth", block: "nearest" });
  const input = sentenceInput();
  input.focus();
  input.setSelectionRange(input.value.length, input.value.length);
}

function setBusy(busy: boolean): void {
  if (!game) return;
  game.busy = busy;
  $("thinking").hidden = !busy;
  $<HTMLButtonElement>("btn-done").disabled = busy;
  $<HTMLButtonElement>("btn-skip").disabled = busy;
  sentenceInput().readOnly = busy;
}

function turnRequest(sentence: string) {
  const g = game!;
  return {
    story: g.lines.map((l) => ({ by: l.by, text: l.text })),
    original: finishSentence(g.original),
    sentence,
    mission: g.mission!,
    turnsLeft: TURNS - g.done - 1,
  };
}

function partnerNote(text: string): void {
  const note = $("partner-note");
  note.textContent = `🐼 ${text}`;
  note.hidden = false;
}

async function missionDone(): Promise<void> {
  if (!game || !game.mission || game.busy) return;
  const g = game;
  const raw = sentenceInput().value.trim();
  if (!isUsableSentence(raw)) {
    partnerNote("句子不见了，再写一写吧！");
    return;
  }
  const sentence = finishSentence(raw);
  const sense = getSense(g.mission!);

  if (!aiEnabled) {
    if (raw === g.original) {
      partnerNote(`先把${sense.label}的东西加进你的句子里吧！`);
      return;
    }
    commit(sentence, true, "句子变得更生动了！", scriptedNext(g.adventure, g.done));
    return;
  }

  setBusy(true);
  const res = await requestTurn(turnRequest(sentence));
  setBusy(false);
  if (game !== g) return;
  if (!res) {
    // AI unavailable mid-story: trust the child and carry on with the script.
    commit(sentence, raw !== g.original, "好！我们接着写。", scriptedNext(g.adventure, g.done));
    return;
  }
  if (res.missionDone) {
    commit(sentence, true, res.reaction, res.next);
  } else {
    g.pending = res;
    partnerNote(res.hint || res.reaction || "再试一试？");
  }
}

async function skipMission(): Promise<void> {
  if (!game || game.busy) return;
  const g = game;
  const raw = sentenceInput().value.trim();
  const sentence = finishSentence(isUsableSentence(raw) ? raw : g.original);
  if (g.pending) {
    commit(sentence, false, g.pending.reaction, g.pending.next);
    return;
  }
  if (aiEnabled && g.mission) {
    setBusy(true);
    const res = await requestTurn(turnRequest(sentence));
    setBusy(false);
    if (game !== g) return;
    if (res) {
      commit(sentence, res.missionDone, res.reaction, res.next);
      return;
    }
  }
  commit(sentence, false, "好！我们接着写。", scriptedNext(g.adventure, g.done));
}

function commit(sentence: string, done: boolean, reaction: string, next: NextBeat): void {
  if (!game) return;
  const g = game;
  addLine({ by: "child", text: sentence, plain: finishSentence(g.original), mission: g.mission, missionDone: done });
  if (done) g.stars += 1;
  g.done += 1;
  g.beat = next;
  $("turn").hidden = true;
  addLine({ by: "partner", text: next.line }, reaction);
  speak(next.line);
  if (g.done >= TURNS) finishStory();
  else openTurn();
}

const practice = createPractice({
  tabs: $("char-tabs"),
  pad: $("practise-pad"),
  feedback: $("practise-feedback"),
  animate: $<HTMLButtonElement>("btn-animate"),
  trace: $<HTMLButtonElement>("btn-trace"),
  free: $<HTMLButtonElement>("btn-free"),
});
let picked: string[] = [];

function finishStory(): void {
  if (!game) return;
  const g = game;
  saveStory({
    id: g.storyId,
    adventureId: g.adventure?.id ?? "idea",
    title: g.title,
    savedAt: Date.now(),
    lines: g.lines,
  });
  $("end-stars").textContent = `你完成了 ${g.stars} / ${TURNS} 个任务 ${"⭐".repeat(g.stars)}`;

  picked = [];
  practice.stop();
  $("practise-pad-wrap").hidden = true;
  $<HTMLButtonElement>("btn-practise").disabled = true;
  $("char-pick").replaceChildren(
    ...charsToPractise(g.lines).map((c) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "char-chip";
      b.textContent = c;
      b.dataset.char = c;
      b.setAttribute("aria-pressed", "false");
      b.addEventListener("click", () => {
        const on = picked.includes(c);
        if (!on && picked.length >= 3) return;
        picked = on ? picked.filter((x) => x !== c) : [...picked, c];
        b.setAttribute("aria-pressed", String(!on));
        $<HTMLButtonElement>("btn-practise").disabled = picked.length === 0;
      });
      return b;
    }),
  );
  $("turn-end").hidden = false;
  $("turn-end").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

// ---------- saved stories ----------

let openStory: SavedStory | undefined;
function openSaved(story: SavedStory): void {
  openStory = story;
  const del = $("btn-delete-saved");
  delete del.dataset.armed;
  del.textContent = "删除";
  $("read-title").replaceChildren(ruby(`${getAdventure(story.adventureId)?.emoji ?? "✏️"} ${story.title}`));
  $("read-flow").replaceChildren(...story.lines.map((l) => lineItem(l)));
  show("read");
}

// ---------- wiring ----------

function init(): void {
  applyPinyin();
  $("btn-pinyin").addEventListener("click", () => {
    showPinyin = !showPinyin;
    try {
      localStorage.setItem(PINYIN_KEY, showPinyin ? "on" : "off");
    } catch {
      /* ignore */
    }
    applyPinyin();
  });
  $("btn-home").addEventListener("click", () => {
    if ("speechSynthesis" in window) speechSynthesis.cancel();
    practice.stop();
    game = undefined;
    renderHome();
  });

  $("idea-card").addEventListener("submit", (e) => {
    e.preventDefault();
    void startIdea($<HTMLInputElement>("idea-input").value.trim());
  });

  const input = sentenceInput();
  wireMic($<HTMLButtonElement>("btn-mic"), input);
  input.addEventListener("input", () => ($("turn-hint").textContent = ""));
  $("btn-written").addEventListener("click", finishWriting);
  $("btn-spin").addEventListener("click", spin);
  $("btn-hint").addEventListener("click", () => {
    $("hint-words").hidden = !$("hint-words").hidden;
  });
  $("btn-done").addEventListener("click", () => void missionDone());
  $("btn-skip").addEventListener("click", () => void skipMission());

  $("btn-read-all").addEventListener("click", () => game && speak(storyText(game.lines)));
  $("btn-again").addEventListener("click", () => {
    practice.stop();
    game = undefined;
    renderHome();
  });
  $("btn-practise").addEventListener("click", () => {
    if (!picked.length) return;
    $("practise-pad-wrap").hidden = false;
    practice.start(picked);
    $("practise-pad-wrap").scrollIntoView({ behavior: "smooth", block: "nearest" });
  });

  $("btn-read-saved").addEventListener("click", () => openStory && speak(storyText(openStory.lines)));
  // Two taps to delete (no confirm() dialog: some embedded viewers block it).
  const delBtn = $("btn-delete-saved");
  delBtn.addEventListener("click", () => {
    if (!openStory) return;
    if (delBtn.dataset.armed !== "1") {
      delBtn.dataset.armed = "1";
      delBtn.textContent = "再点一次，确认删除";
      return;
    }
    deleteStory(openStory.id);
    openStory = undefined;
    renderHome();
  });

  renderHome();
  void partnerEnabled().then((on) => {
    aiEnabled = on;
    document.body.dataset.ai = on ? "on" : "off";
    if (!$("view-home").hidden) $("idea-card").hidden = !on;
  });
}

init();
