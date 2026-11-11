import { renderRubyText } from "../shared/rubyText";
import { ADVENTURES, getAdventure, type Adventure, type Beat } from "./adventures";
import {
  countHanzi,
  finishSentence,
  insertWord,
  isUsableSentence,
  sensesUsed,
  turnStars,
  wordsFor,
} from "./expansion";
import { deleteStory, loadLibrary, saveStory, storyText, type SavedStory, type StoryLine } from "./library";
import { charPinyin } from "./pinyin";
import { SENSES, getSense, type SenseId } from "./senses";

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

/** Authored text with pinyin over each character. */
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

function stars(n: number): string {
  return "★".repeat(n) + "☆".repeat(3 - n);
}

// Voice input (Chrome / Safari) so a child who can't type pinyin yet
// can say the sentence instead. Hidden where it isn't supported.
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

function wireMic(button: HTMLButtonElement, input: HTMLTextAreaElement, onChange: () => void): void {
  if (!RecognitionCtor) return;
  button.hidden = false;
  button.addEventListener("click", () => {
    const rec = new RecognitionCtor();
    rec.lang = "zh-CN";
    rec.interimResults = false;
    button.classList.add("listening");
    rec.onresult = (e) => {
      const said = e.results[0]?.[0]?.transcript ?? "";
      const r = insertWord(input.value, input.selectionStart, input.selectionEnd, said);
      input.value = r.value;
      onChange();
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

// ---------- home ----------

function renderHome(): void {
  const grid = $("adventure-grid");
  grid.replaceChildren(
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

  const library = loadLibrary();
  $("library").hidden = library.length === 0;
  $("library-list").replaceChildren(
    ...library.map((s) => {
      const li = document.createElement("li");
      const b = document.createElement("button");
      b.type = "button";
      b.className = "library-item";
      const emoji = getAdventure(s.adventureId)?.emoji ?? "📖";
      const date = new Date(s.savedAt).toLocaleDateString("zh-CN", { month: "long", day: "numeric" });
      b.textContent = `${emoji} ${s.title}`;
      const small = document.createElement("small");
      small.textContent = date;
      b.append(small);
      b.addEventListener("click", () => openSaved(s));
      li.append(b);
      return li;
    }),
  );
  show("home");
}

// ---------- play ----------

const PRAISE: Record<SenseId, string> = {
  see: "哇，我好像看到那个画面了！",
  hear: "我好像听到声音了！",
  smell: "嗯～我好像闻到了！",
  touch: "我好像摸到了！",
  feel: "我知道他的心情了！",
  pattern: "这个句子写得真生动！",
};

interface Game {
  adventure: Adventure;
  beatIndex: number;
  lines: StoryLine[];
  starTotal: number;
  storyId: string;
  /** The child's sentence before expansion, for the current turn. */
  plain: string;
  sense: SenseId;
}
let game: Game | undefined;

function currentBeat(): Beat | undefined {
  return game ? game.adventure.beats[game.beatIndex] : undefined;
}

function lineItem(line: StoryLine, withSpeak = true): HTMLLIElement {
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
    if (line.senses) {
      const meta = document.createElement("span");
      meta.className = "line-meta";
      meta.textContent = `${line.senses.map((s) => getSense(s).emoji).join("")} ${stars(turnStars(line.senses))}`;
      bubble.append(meta);
    }
  }
  if (withSpeak) bubble.append(speakButton(line.text));
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

function startAdventure(adventure: Adventure): void {
  game = {
    adventure,
    beatIndex: 0,
    lines: [],
    starTotal: 0,
    storyId: `${adventure.id}-${Date.now()}`,
    plain: "",
    sense: "see",
  };
  $("play-title").replaceChildren(ruby(`${adventure.emoji} ${adventure.title}`));
  $("story-flow").replaceChildren();
  $("turn-end").hidden = true;
  show("play");
  partnerTurn();
}

function partnerTurn(praise?: string): void {
  const beat = currentBeat();
  if (!game || !beat) return;
  addLine({ by: "partner", text: beat.partner }, praise);
  speak(beat.partner);
  openWrite();
}

function openWrite(): void {
  const beat = currentBeat();
  if (!game || !beat) return;
  $("turn-expand").hidden = true;
  $("turn-write").hidden = false;
  $("turn-count").textContent = `${game.beatIndex + 1} / ${game.adventure.beats.length}`;
  const prompt = $("write-prompt");
  prompt.replaceChildren(ruby(beat.prompt), speakButton(beat.prompt));
  const input = $<HTMLTextAreaElement>("write-input");
  input.value = game.plain;
  $("write-hint").textContent = "";
  $("starter-row").replaceChildren(
    ...beat.starters.map((s) => {
      const chip = wordChip(s);
      chip.addEventListener("click", () => {
        if (!input.value.startsWith(s)) input.value = s + input.value;
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      });
      return chip;
    }),
  );
  $("turn-write").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function wordChip(word: string): HTMLButtonElement {
  const chip = document.createElement("button");
  chip.type = "button";
  chip.className = "chip";
  chip.dataset.word = word;
  chip.append(ruby(word));
  return chip;
}

function finishWrite(): void {
  if (!game) return;
  const input = $<HTMLTextAreaElement>("write-input");
  const text = input.value.trim();
  if (!isUsableSentence(text)) {
    $("write-hint").textContent = countHanzi(text) === 0 ? "先写一句话吧！可以点上面的词开头。" : "再多写几个字吧！";
    return;
  }
  game.plain = text;
  openExpand();
}

function openExpand(): void {
  const beat = currentBeat();
  if (!game || !beat) return;
  $("turn-write").hidden = true;
  $("turn-expand").hidden = false;
  $("expand-plain").textContent = game.plain;
  $("example-plain").textContent = beat.example.plain;
  $("example-rich").replaceChildren(ruby(beat.example.rich), speakButton(beat.example.rich));
  const input = $<HTMLTextAreaElement>("expand-input");
  input.value = game.plain;
  $("expand-hint").textContent = "点一个词，放进你的句子里。也可以自己写！";
  // Open on the first sense the scene has words for.
  game.sense = (SENSES.find((s) => beat.words[s.id]?.length)?.id ?? "see") as SenseId;
  renderSenseTabs();
  updateMeter();
  $("turn-expand").scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderSenseTabs(): void {
  const beat = currentBeat();
  if (!game) return;
  const g = game;
  const used = new Set(sensesUsed($<HTMLTextAreaElement>("expand-input").value, beat));
  $("sense-tabs").replaceChildren(
    ...SENSES.map((s) => {
      const tab = document.createElement("button");
      tab.type = "button";
      tab.className = "sense-tab";
      tab.dataset.sense = s.id;
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-selected", String(s.id === g.sense));
      tab.classList.toggle("used", used.has(s.id));
      tab.textContent = `${s.emoji} ${s.label}`;
      tab.addEventListener("click", () => {
        g.sense = s.id;
        renderSenseTabs();
      });
      return tab;
    }),
  );
  const sense = getSense(g.sense);
  $("sense-question").replaceChildren(ruby(sense.question), speakButton(sense.question));
  const input = $<HTMLTextAreaElement>("expand-input");
  $("word-row").replaceChildren(
    ...wordsFor(beat, g.sense).map((w) => {
      const chip = wordChip(w);
      chip.addEventListener("click", () => {
        const r = insertWord(input.value, input.selectionStart, input.selectionEnd, w);
        input.value = r.value;
        input.focus();
        input.setSelectionRange(r.selectionStart, r.selectionEnd);
        speak(w);
        updateMeter();
      });
      return chip;
    }),
  );
}

function updateMeter(): void {
  if (!game) return;
  const beat = currentBeat();
  const text = $<HTMLTextAreaElement>("expand-input").value;
  const used = new Set(sensesUsed(text, beat));
  $("sense-badges").replaceChildren(
    ...SENSES.map((s) => {
      const b = document.createElement("span");
      b.className = "badge";
      b.classList.toggle("on", used.has(s.id));
      b.title = s.label;
      b.textContent = s.emoji;
      return b;
    }),
  );
  const grew = countHanzi(text) - countHanzi(game.plain);
  $("growth").textContent = grew > 0 ? `句子长了 ${grew} 个字！ ${stars(turnStars([...used]))}` : stars(turnStars([...used]));
  for (const tab of document.querySelectorAll<HTMLElement>(".sense-tab")) {
    tab.classList.toggle("used", used.has(tab.dataset.sense as SenseId));
  }
}

function finishExpand(): void {
  if (!game) return;
  const beat = currentBeat();
  const raw = $<HTMLTextAreaElement>("expand-input").value.trim();
  if (!isUsableSentence(raw)) {
    $("expand-hint").textContent = raw.includes("……") ? "把“……”换成你自己的词吧！" : "句子不见了，再写一写吧！";
    return;
  }
  const text = finishSentence(raw);
  const senses = sensesUsed(text, beat);
  game.starTotal += turnStars(senses);
  addLine({ by: "child", text, plain: finishSentence(game.plain), senses });
  game.plain = "";
  game.beatIndex += 1;
  $("turn-expand").hidden = true;

  const praise = senses.length ? PRAISE[senses[senses.length - 1]] : "好！我们接着写。";
  if (game.beatIndex < game.adventure.beats.length) {
    partnerTurn(praise);
  } else {
    addLine({ by: "partner", text: game.adventure.ending }, praise);
    finishStory();
  }
}

function finishStory(): void {
  if (!game) return;
  const g = game;
  saveStory({
    id: g.storyId,
    adventureId: g.adventure.id,
    title: g.adventure.title,
    savedAt: Date.now(),
    lines: g.lines,
  });
  const max = g.adventure.beats.length * 3;
  $("end-stars").textContent = `你得了 ${g.starTotal} / ${max} 颗星 ⭐`;
  const used = new Set(g.lines.flatMap((l) => l.senses ?? []));
  $("end-senses").textContent = used.size
    ? `你用了：${SENSES.filter((s) => used.has(s.id)).map((s) => `${s.emoji}${s.label}`).join("、")}`
    : "下次试试用五感放大镜，让句子更生动！";
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
  $("read-title").replaceChildren(ruby(`${getAdventure(story.adventureId)?.emoji ?? "📖"} ${story.title}`));
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
    speechSynthesis?.cancel();
    game = undefined;
    renderHome();
  });

  const writeInput = $<HTMLTextAreaElement>("write-input");
  $("btn-write-done").addEventListener("click", finishWrite);
  writeInput.addEventListener("input", () => ($("write-hint").textContent = ""));
  wireMic($<HTMLButtonElement>("btn-mic-write"), writeInput, () => ($("write-hint").textContent = ""));

  const expandInput = $<HTMLTextAreaElement>("expand-input");
  expandInput.addEventListener("input", updateMeter);
  wireMic($<HTMLButtonElement>("btn-mic-expand"), expandInput, updateMeter);
  $("btn-expand-done").addEventListener("click", finishExpand);
  $("btn-expand-back").addEventListener("click", () => {
    if (game) game.plain = expandInput.value.trim() || game.plain;
    openWrite();
  });

  $("btn-read-all").addEventListener("click", () => game && speak(storyText(game.lines)));
  $("btn-again").addEventListener("click", () => {
    game = undefined;
    renderHome();
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
}

init();
