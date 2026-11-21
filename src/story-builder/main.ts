import { renderRubyText } from "../shared/rubyText";
import { ADVENTURES, getAdventure, type Adventure } from "./adventures";
import { applyFixes, findFixes, fixedChars, fixesLeft, type Fix } from "./corrections";
import { finishSentence, isUsableSentence, sensesUsed } from "./expansion";
import { TURNS, isChoiceTurn, openingBeat, pickMission, scriptedChoices, scriptedNext, shuffled, wheelRotation } from "./flow";
import { buildFeedback, type FeedbackOut, type StoryFeedback } from "./feedback";
import { feedbackCard } from "./feedbackCard";
import { deleteStory, isTestMode, loadLibrary, saveStory, storyText, updateStory, type SavedStory, type StoryLine } from "./library";
import type { NewWord, NextBeat, TurnResponse } from "./partnerApi";
import { partnerEnabled, requestStart, requestTurn } from "./partnerClient";
import { charPinyin } from "./pinyin";
import { createPractice } from "./practice";
import { SENSES, SENSE_IDS, getSense, type SenseId } from "./senses";
import { loadTaught, pickCharsToTeach, saveTaught } from "./teach";
import { $, readPinyinPref, ruby, savePinyinPref, speak, speakButton, wireMic } from "./ui";

// ---------- shared helpers ----------

let showPinyin = readPinyinPref();

function applyPinyin(): void {
  document.body.classList.toggle("no-pinyin", !showPinyin);
  $("btn-pinyin").setAttribute("aria-pressed", String(showPinyin));
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
  /** The sentence that verdict was for. */
  asked?: string;
  stars: number;
  storyId: string;
  busy: boolean;
  /** The 好词卡 from the last AI turn, if the AI gave one. */
  aiFeedback?: FeedbackOut;
  /** The rendered story lines, in step with `lines`. */
  lineEls: HTMLLIElement[];
  /** This turn is being written by a parent (请爸爸妈妈写). */
  byParent: boolean;
  /** The parent turn has been used: once per story. */
  parentUsed: boolean;
  /** 错别字 the child is fixing before the line goes into the story. */
  fixing?: { done: boolean; reaction: string; outcome: Outcome; fixes: Fix[] };
}

/** What 团团 says after a turn: the next beat, and other ways the story
 * could go when this is the turn where the child picks. */
interface Outcome {
  next: NextBeat;
  alternatives?: NextBeat[];
  feedback?: FeedbackOut;
  /** 错别字 the AI found in the child's sentence. */
  fixes?: Fix[];
}

const PARENT_CHEER = "哇，爸爸妈妈也是写故事高手！";
let game: Game | undefined;
let wheelAngle = 0;

const sentenceInput = () => $<HTMLTextAreaElement>("sentence");

function lineItem(line: StoryLine): HTMLLIElement {
  const li = document.createElement("li");
  li.className = `line line-${line.by}`;
  const who = document.createElement("span");
  who.className = "who";
  who.textContent = line.by === "partner" ? "🐼" : line.by === "parent" ? "👨‍👩‍👧" : "🧒";
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  if (line.by !== "child") {
    // 团团's and a parent's lines get pinyin: the child reads them.
    bubble.append(ruby(line.text, "line-text"));
    if (line.word) bubble.append(newWordChip(line.word));
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
    for (const f of line.fixes ?? []) {
      const fixed = document.createElement("span");
      fixed.className = "line-fixed";
      fixed.textContent = `🔍 改正了：${f.wrong} → ${f.right}`;
      bubble.append(fixed);
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

/** 📗 新词 under 团团's line: the word and what it means, with pinyin. */
function newWordChip(word: NewWord): HTMLElement {
  const chip = document.createElement("span");
  chip.className = "new-word";
  const b = document.createElement("b");
  b.append(ruby(word.word));
  chip.append("📗 新词：", b, "——", ruby(word.meaning));
  return chip;
}

/** 团团's line as a story line, keeping its 📗 新词. */
const partnerLine = (beat: NextBeat): StoryLine => ({ by: "partner", text: beat.line, ...(beat.word ? { word: beat.word } : {}) });

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
  game.lineEls.push(li);
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
    lineEls: [],
    byParent: false,
    parentUsed: false,
  };
  $("play-title").replaceChildren(adventure ? ruby(`${adventure.emoji} ${adventure.title}`) : ruby(`✏️ ${title}`));
  $("story-flow").replaceChildren();
  const about = adventure?.about;
  $("topic-card").hidden = !about;
  ($("topic-card") as HTMLDetailsElement).open = true;
  $("topic-text").replaceChildren(...(about ? [ruby(about), speakButton(about)] : []));
  $("turn-end").hidden = true;
  $("choice").hidden = true;
  $("end-feedback").replaceChildren();
  show("play");
  addLine(partnerLine(beat));
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
  const word = g.beat.word;
  $("turn-word").replaceChildren(...(word ? [ruby(`📗 试试在句子里用上新词「${word.word}」！`)] : []));
  $("turn-word").hidden = !word;
  renderGuide(g.beat);
  const input = sentenceInput();
  input.value = "";
  input.readOnly = false;
  $("turn-hint").textContent = "";
  $("btn-written").hidden = false;
  $<HTMLButtonElement>("btn-written").disabled = false;
  $("btn-guide").hidden = false;
  setWriter(false);
  $("spin-area").hidden = true;
  $("mission").hidden = true;
  g.mission = undefined;
  g.pending = undefined;
  g.asked = undefined;
  g.fixing = undefined;
  g.original = "";
  showFixCard(false);
  $("turn").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

/** Questions that help with any scene, whatever 团团 asked. */
const THINK_QUESTIONS = ["谁？在哪里？", "他们在做什么？", "看到、听到了什么？", "心里觉得怎么样？"];

/** 🤔 不知道写什么？ The question said simply, starters to tap, things to
 * think about, and an example sentence behind one more tap. */
function renderGuide(beat: NextBeat): void {
  const guide = beat.guide;
  $("guide").hidden = true;
  $("btn-guide").setAttribute("aria-expanded", "false");
  const explain = guide?.explain || `团团问：“${beat.question}” 想一想下面的问题，写一句话就可以了！`;
  $("guide-explain").replaceChildren(ruby(explain), speakButton(explain));
  $("guide-explain").dataset.say = explain;
  const starters = guide?.starters ?? [];
  $("guide-starters-label").hidden = starters.length === 0;
  $("guide-starters").replaceChildren(
    ...starters.map((st) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "hint-word guide-starter";
      b.append(ruby(st));
      b.addEventListener("click", () => {
        const input = sentenceInput();
        if (input.readOnly) return;
        input.value = input.value.trim() ? `${input.value}${st}` : st;
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
        $("turn-hint").textContent = "";
      });
      return b;
    }),
  );
  $("guide-think").replaceChildren(
    ...THINK_QUESTIONS.map((q) => {
      const li = document.createElement("li");
      li.append(ruby(q));
      return li;
    }),
  );
  const example = guide?.example;
  $("btn-example").hidden = !example;
  $("guide-example").hidden = true;
  $("guide-example").replaceChildren(...(example ? [ruby(`比如：${example}`), speakButton(example)] : []));
}

function toggleGuide(): void {
  const open = $("guide").hidden;
  $("guide").hidden = !open;
  $("btn-guide").setAttribute("aria-expanded", String(open));
  if (open) {
    ($("topic-card") as HTMLDetailsElement).open = false;
    speak($("guide-explain").dataset.say ?? "");
  }
}

/** Phase 2: the sentence is written; spin for a mission. */
function finishWriting(): void {
  if (!game || game.busy) return;
  const text = sentenceInput().value.trim();
  if (!isUsableSentence(text)) {
    $("turn-hint").textContent = text ? "再多写几个字吧！" : "先写一句话吧！";
    return;
  }
  if (game.byParent) {
    void parentWrote(text);
    return;
  }
  game.original = text;
  $("turn-hint").textContent = "";
  $("btn-written").hidden = true;
  $("btn-guide").hidden = true;
  $("guide").hidden = true;
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
    ...(g.byParent ? { writer: "parent" as const } : { mission: g.mission! }),
    original: finishSentence(g.original),
    sentence,
    turnsLeft: TURNS - g.done - 1,
    ...(isChoiceTurn(g.done) ? { choices: true } : {}),
  };
}

/** The pre-written outcome of this turn, when AI is off or fails. */
function scriptedOutcome(g: Game): Outcome {
  if (!isChoiceTurn(g.done)) return { next: scriptedNext(g.adventure, g.done) };
  const [next, ...alternatives] = scriptedChoices(g.adventure, g.done);
  return { next, alternatives };
}

/** Switches the write step between the child and a parent. */
function setWriter(byParent: boolean): void {
  if (!game) return;
  game.byParent = byParent;
  $("turn").classList.toggle("by-parent", byParent);
  $("turn-who").textContent = byParent ? "👨‍👩‍👧 请爸爸妈妈写一句" : "✏️ 轮到你了";
  sentenceInput().placeholder = byParent ? "爸爸妈妈写一句……" : "写一句话……";
  const btn = $("btn-parent");
  btn.hidden = game.parentUsed;
  btn.textContent = byParent ? "↩ 还是我自己写" : "🙋 请爸爸妈妈写这一句";
  $("parent-note").hidden = game.parentUsed || byParent;
  $("turn-hint").textContent = "";
}

/** A parent wrote this turn: no mission, 团团 cheers and carries on. */
async function parentWrote(text: string): Promise<void> {
  if (!game) return;
  const g = game;
  g.original = text;
  g.mission = undefined;
  const sentence = finishSentence(text);
  if (!aiEnabled) {
    commit(sentence, false, PARENT_CHEER, scriptedOutcome(g));
    return;
  }
  g.busy = true;
  $<HTMLButtonElement>("btn-written").disabled = true;
  $<HTMLButtonElement>("btn-parent").disabled = true;
  sentenceInput().readOnly = true;
  $("turn-hint").textContent = "🐼 团团在读爸爸妈妈的句子……";
  const res = await requestTurn(turnRequest(sentence));
  g.busy = false;
  $<HTMLButtonElement>("btn-parent").disabled = false;
  if (game !== g) return;
  commit(sentence, false, res?.reaction || PARENT_CHEER, res ?? scriptedOutcome(g));
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

  // Nothing added yet: nudge here, without spending an AI call.
  if (raw === g.original) {
    partnerNote(`先把${sense.label}的东西加进你的句子里吧！`);
    return;
  }
  if (!aiEnabled) {
    settle(sentence, true, "句子变得更生动了！", scriptedOutcome(g));
    return;
  }
  // Tapped again without changing anything since 团团's nudge: same answer, no new call.
  if (g.pending && g.asked === sentence) {
    partnerNote(g.pending.hint || g.pending.reaction || "再试一试？");
    return;
  }

  g.asked = sentence;
  setBusy(true);
  const res = await requestTurn(turnRequest(sentence));
  setBusy(false);
  if (game !== g) return;
  if (!res) {
    // AI unavailable mid-story: trust the child and carry on with the script.
    settle(sentence, raw !== g.original, "好！我们接着写。", scriptedOutcome(g));
    return;
  }
  if (res.missionDone) {
    settle(sentence, true, res.reaction, res);
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
    settle(sentence, false, g.pending.reaction, g.pending);
    return;
  }
  if (aiEnabled && g.mission) {
    setBusy(true);
    const res = await requestTurn(turnRequest(sentence));
    setBusy(false);
    if (game !== g) return;
    if (res) {
      settle(sentence, res.missionDone, res.reaction, res);
      return;
    }
  }
  settle(sentence, false, "好！我们接着写。", scriptedOutcome(g));
}

/**
 * The child's sentence is ready. If it has 错别字 (from the AI, or a
 * common slip like 芭莎 for 巴刹), 团团 points them out and the child
 * fixes the sentence first; otherwise it goes straight into the story.
 */
function settle(sentence: string, done: boolean, reaction: string, outcome: Outcome): void {
  if (!game) return;
  const fixes = findFixes(sentence, outcome.fixes);
  if (!fixes.length) {
    commit(sentence, done, reaction, outcome);
    return;
  }
  game.fixing = { done, reaction, outcome, fixes };
  sentenceInput().value = sentence;
  sentenceInput().readOnly = false;
  $("fix-list").replaceChildren(
    ...fixes.map((f) => {
      const li = document.createElement("li");
      li.className = "fix-item";
      const wrong = document.createElement("span");
      wrong.className = "fix-wrong";
      wrong.textContent = f.wrong;
      const right = document.createElement("span");
      right.className = "fix-right";
      right.append(ruby(f.right));
      li.append(wrong, " → ", right, speakButton(f.right));
      if (f.why) li.append(ruby(f.why, "fix-why"));
      return li;
    }),
  );
  $("fix-note").textContent = "🐼 请你在上面的句子里改一改，再点“改好了”。";
  showFixCard(true);
  speak(`团团发现了错别字。${fixes.map((f) => `应该写${f.right}。${f.why}`).join("")}`);
  $("fix-card").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function showFixCard(on: boolean): void {
  $("fix-card").hidden = !on;
  $("mission-actions").hidden = on;
  if (on) $("partner-note").hidden = true;
}

/** 改好了: the line goes into the story once every wrong word is gone. */
function fixDone(): void {
  if (!game?.fixing) return;
  const { done, reaction, outcome, fixes } = game.fixing;
  const text = sentenceInput().value.trim();
  const left = fixesLeft(text, fixes);
  if (left.length) {
    $("fix-note").textContent = `🐼 还有「${left[0].wrong}」没改哦，应该是「${left[0].right}」。`;
    return;
  }
  if (!isUsableSentence(text)) {
    $("fix-note").textContent = "🐼 句子不见了，再写一写吧！";
    return;
  }
  game.fixing = undefined;
  showFixCard(false);
  commit(finishSentence(text), done, `${reaction} 错别字也改好了！✅`.trim(), outcome, fixes);
}

/** 帮我改: 团团 fixes it in the box, and the child looks before tapping 改好了. */
function fixHelp(): void {
  if (!game?.fixing) return;
  const input = sentenceInput();
  input.value = applyFixes(input.value, game.fixing.fixes);
  $("fix-note").textContent = `🐼 看，正确的写法是${game.fixing.fixes.map((f) => `「${f.right}」`).join("")}。记住了吗？点“改好了”。`;
}

function commit(sentence: string, done: boolean, reaction: string, outcome: Outcome, fixes: Fix[] = []): void {
  if (!game) return;
  const g = game;
  const word = g.beat.word?.word;
  if (!g.byParent && word && sentence.includes(word)) reaction = `${reaction} 你用上了新词「${word}」！📗`.trim();
  if (outcome.feedback) g.aiFeedback = outcome.feedback;
  if (g.byParent) {
    g.parentUsed = true;
    addLine({ by: "parent", text: sentence });
  } else {
    addLine({
      by: "child",
      text: sentence,
      plain: applyFixes(finishSentence(g.original), fixes),
      mission: g.mission,
      missionDone: done,
      ...(fixes.length ? { fixes } : {}),
    });
  }
  if (done) g.stars += 1;
  const finished = g.done;
  g.done += 1;
  $("turn").hidden = true;
  const alternatives = outcome.alternatives ?? [];
  if (isChoiceTurn(finished) && alternatives.length) {
    offerChoices(shuffled([outcome.next, ...alternatives]), reaction);
  } else {
    continueWith(outcome.next, reaction);
  }
}

/** 团团 writes `next` and the story moves on (or ends). */
function continueWith(next: NextBeat, reaction: string): void {
  if (!game) return;
  const g = game;
  g.beat = next;
  addLine(partnerLine(next), reaction);
  speak(next.line);
  if (g.done >= TURNS) finishStory();
  else openTurn();
}

/** 团团 offers three ways the story could go; the child taps one. */
function offerChoices(choices: NextBeat[], reaction: string): void {
  const g = game!;
  $("choice-reaction").textContent = reaction ? `🐼 ${reaction}` : "";
  $("choice-reaction").hidden = !reaction;
  $("choice-list").replaceChildren(
    ...choices.map((c, i) => {
      const li = document.createElement("li");
      li.className = "choice-row";
      const b = document.createElement("button");
      b.type = "button";
      b.className = "choice-option";
      const letter = document.createElement("span");
      letter.className = "choice-letter";
      letter.textContent = "ABC"[i] ?? "";
      b.append(letter, ruby(c.line));
      b.addEventListener("click", () => {
        if (game !== g) return;
        $("choice").hidden = true;
        continueWith(c, reaction);
      });
      li.append(b, speakButton(c.line));
      return li;
    }),
  );
  $("choice").hidden = false;
  speak("团团想了三个点子，你选哪一个？");
  $("choice").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

const practice = createPractice({
  tabs: $("char-tabs"),
  pad: $("practise-pad"),
  feedback: $("practise-feedback"),
  animate: $<HTMLButtonElement>("btn-animate"),
  trace: $<HTMLButtonElement>("btn-trace"),
  free: $<HTMLButtonElement>("btn-free"),
},
{
  onLearned: (char) => {
    const n = saveTaught(char).length;
    const count = $("teach-count");
    count.textContent = `团团已经跟你学会了 ${n} 个字。`;
    count.hidden = false;
    $(`teach-words`).querySelector(`[data-char="${char}"]`)?.classList.add("learned");
  },
});
let picked: string[] = [];

/** The child's sentence with `char` picked out, pinyin above it. */
function teachWord(char: string, sentence: string): HTMLLIElement {
  const li = document.createElement("li");
  li.className = "teach-word";
  li.dataset.char = char;
  const big = document.createElement("span");
  big.className = "teach-char";
  big.textContent = char;
  const ctx = document.createElement("span");
  ctx.className = "teach-context";
  const py = charPinyin(sentence);
  Array.from(sentence).forEach((c, i) => {
    const part = document.createElement("span");
    if (c === char) part.className = "hit";
    renderRubyText(part, c, [py[i] ?? ""]);
    ctx.append(part);
  });
  li.append(big, ctx);
  return li;
}

/** The 错别字 the child fixed and the 📗 新词 团团 used, for the 好词卡. */
function learnedFrom(lines: StoryLine[]): { fixes: Fix[]; words: NewWord[] } {
  const fixes = lines.flatMap((l) => (l.by === "child" ? (l.fixes ?? []) : []));
  const words = lines.flatMap((l) => (l.by === "partner" && l.word ? [l.word] : []));
  const unique = <T extends { wrong?: string; word?: string }>(xs: T[], key: (x: T) => string) =>
    xs.filter((x, i) => xs.findIndex((y) => key(y) === key(x)) === i);
  return { fixes: unique(fixes, (f) => f.wrong), words: unique(words, (w) => w.word) };
}

/** The child's line a rewrite replaces: the last one with that text. */
function rewriteLine(lines: StoryLine[], from: string, to: string): number {
  const i = lines.map((l) => l.by === "child" && l.text === from).lastIndexOf(true);
  if (i >= 0) lines[i] = { ...lines[i], text: to };
  return i;
}

function finishStory(): void {
  if (!game) return;
  const g = game;
  const feedback = buildFeedback(
    g.aiFeedback,
    g.lines.filter((l) => l.by === "child"),
  );
  const story: SavedStory = {
    id: g.storyId,
    adventureId: g.adventure?.id ?? "idea",
    title: g.title,
    savedAt: Date.now(),
    lines: g.lines,
    feedback,
  };
  saveStory(story);
  $("end-feedback").replaceChildren(
    feedbackCard({
      feedback,
      ...learnedFrom(g.lines),
      speakButton,
      onRewrite: (sentence) => {
        const i = rewriteLine(g.lines, feedback.wish?.sentence ?? "", sentence);
        if (i >= 0) {
          const li = lineItem(g.lines[i]);
          const old = g.lineEls[i];
          const praise = old.querySelector(".praise");
          if (praise) li.querySelector(".bubble")?.prepend(praise);
          old.replaceWith(li);
          g.lineEls[i] = li;
        }
        updateStory(story);
      },
    }),
  );
  const missions = g.lines.filter((l) => l.by === "child").length;
  $("end-stars").textContent = `你完成了 ${g.stars} / ${missions} 个任务 ${"⭐".repeat(g.stars)}`;

  practice.stop();
  $("practise-pad-wrap").hidden = true;
  $("teach-count").hidden = true;
  const picks = pickCharsToTeach(g.lines, feedback, new Set(loadTaught()));
  picked = picks.map((p) => p.char);
  $("practise").hidden = picks.length === 0;
  $<HTMLButtonElement>("btn-practise").hidden = false;
  $("teach-words").replaceChildren(...picks.map((p) => teachWord(p.char, p.sentence)));
  const fixed = new Set(g.lines.flatMap((l) => (l.fixes ?? []).flatMap(fixedChars)));
  const fixedPicks = picks.filter((p) => fixed.has(p.char)).map((p) => p.char);
  $("teach-ask").textContent = fixedPicks.length
    ? `你刚才改正了「${fixedPicks.join("」「")}」，我们一起把它写对、记牢吧！还有几个难写的字，也教教我吧！`
    : "你的故事里有几个难写的字，我还不会写，你能教教我吗？";
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
  const feedback: StoryFeedback =
    story.feedback ?? buildFeedback(undefined, story.lines.filter((l) => l.by === "child"));
  $("read-feedback").replaceChildren(
    feedbackCard({
      feedback,
      ...learnedFrom(story.lines),
      speakButton,
      onRewrite: (sentence) => {
        rewriteLine(story.lines, feedback.wish?.sentence ?? "", sentence);
        story.feedback = feedback;
        updateStory(story);
        $("read-flow").replaceChildren(...story.lines.map((l) => lineItem(l)));
      },
    }),
  );
  show("read");
}

// ---------- wiring ----------

function init(): void {
  applyPinyin();
  if (isTestMode()) {
    // ?test: a separate story book, so trying things doesn't touch the child's.
    $("test-badge").hidden = false;
    $("library-title").textContent = "🧪 测试故事书";
    $("saved-hint").textContent = "故事已经放进“测试故事书”里了。";
    $<HTMLAnchorElement>("link-grower").href = "/sentence-grower.html?test";
    document.title = `🧪 ${document.title}`;
  }
  $("btn-pinyin").addEventListener("click", () => {
    showPinyin = !showPinyin;
    savePinyinPref(showPinyin);
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
  $("btn-parent").addEventListener("click", () => game && !game.busy && setWriter(!game.byParent));
  $("btn-spin").addEventListener("click", spin);
  $("btn-hint").addEventListener("click", () => {
    $("hint-words").hidden = !$("hint-words").hidden;
  });
  $("btn-done").addEventListener("click", () => void missionDone());
  $("btn-skip").addEventListener("click", () => void skipMission());
  $("btn-fix-done").addEventListener("click", fixDone);
  $("btn-guide").addEventListener("click", toggleGuide);
  $("btn-example").addEventListener("click", () => {
    $("btn-example").hidden = true;
    $("guide-example").hidden = false;
  });
  $("btn-fix-help").addEventListener("click", fixHelp);

  $("btn-read-all").addEventListener("click", () => game && speak(storyText(game.lines)));
  $("btn-again").addEventListener("click", () => {
    practice.stop();
    game = undefined;
    renderHome();
  });
  $("btn-practise").addEventListener("click", () => {
    if (!picked.length) return;
    $<HTMLButtonElement>("btn-practise").hidden = true;
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
