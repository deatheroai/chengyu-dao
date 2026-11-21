import { renderRubyText } from "../shared/rubyText";
import { finishSentence, isUsableSentence } from "../story-builder/expansion";
import { isTestMode, loadLibrary } from "../story-builder/library";
import type { GrowResponse } from "../story-builder/partnerApi";
import { partnerEnabled, requestGrow } from "../story-builder/partnerClient";
import { charPinyin } from "../story-builder/pinyin";
import { createPractice } from "../story-builder/practice";
import { SENSES, getSense, type SenseId } from "../story-builder/senses";
import { loadTaught, pickCharsToTeach, saveTaught } from "../story-builder/teach";
import { $, readPinyinPref, ruby, savePinyinPref, speak, speakButton, wireMic } from "../story-builder/ui";
import { deleteGrown, loadGarden, saveGrown, type GrownSentence } from "./garden";
import {
  EXAMPLES,
  SENSES_PER_SENTENCE,
  checkNote,
  cheerFor,
  dotsLabel,
  insertAt,
  slotWidthEm,
  tidySpaces,
  slotOffsets,
  slotWords,
  spotOffset,
  growthText,
  hintsFor,
  isLong,
  layerSteps,
  legendRows,
  offlineCheck,
  openSenses,
  questionFor,
  seedsFromLibrary,
  segments,
  starCount,
  type Layer,
  type Origin,
} from "./grow";
import { SEEDS, getSeed, type Seed } from "./seeds";

// ---------- pinyin + views ----------

let showPinyin = readPinyinPref();
function applyPinyin(): void {
  document.body.classList.toggle("no-pinyin", !showPinyin);
  $("btn-pinyin").setAttribute("aria-pressed", String(showPinyin));
}

type View = "home" | "play" | "read";
function show(view: View): void {
  for (const v of ["home", "play", "read"] as View[]) $(`view-${v}`).hidden = v !== view;
  $("btn-home").style.visibility = view === "home" ? "hidden" : "visible";
  window.scrollTo({ top: 0 });
}

let aiEnabled = false;
const testMode = isTestMode();

/** The sentence with each sense's additions in that sense's colour, pinyin over every character. */
function coloured(plain: string, steps: { text: string; origin: Origin }[], fresh?: Origin): HTMLElement {
  const wrap = document.createElement("span");
  wrap.className = "coloured";
  const segs = segments(plain, steps);
  const py = charPinyin(segs.map((s) => s.text).join(""));
  let at = 0;
  for (const seg of segs) {
    const span = document.createElement("span");
    span.className = `seg seg-${seg.origin}${seg.origin === fresh ? " fresh" : ""}`;
    span.dataset.origin = seg.origin;
    const n = Array.from(seg.text).length;
    renderRubyText(span, seg.text, py.slice(at, at + n));
    at += n;
    wrap.append(span);
  }
  return wrap;
}

function legendItems(plain: string, layers: Layer[]): HTMLLIElement[] {
  return legendRows(plain, layers).map((row) => {
    const s = getSense(row.sense);
    const li = document.createElement("li");
    li.className = `legend-row seg-${row.sense}`;
    li.dataset.sense = row.sense;
    const label = document.createElement("span");
    label.className = "legend-sense";
    label.textContent = `${s.emoji} ${s.label}`;
    const added = document.createElement("span");
    added.className = "legend-added";
    added.textContent = row.added.length ? row.added.join("、") : "……";
    li.append(label, added);
    if (row.done) li.append("⭐");
    return li;
  });
}

// ---------- home ----------

function seedCard(seed: Seed): HTMLButtonElement {
  const card = document.createElement("button");
  card.type = "button";
  card.className = "adventure-card seed-card";
  card.dataset.seed = seed.id;
  const emoji = document.createElement("span");
  emoji.className = "adventure-emoji";
  emoji.textContent = seed.emoji;
  card.append(emoji, ruby(seed.title, "adventure-title"), ruby(seed.plain, "adventure-blurb"));
  card.addEventListener("click", () => startGrowing(seed));
  return card;
}

let storySeeds: Seed[] = [];

function renderHome(): void {
  const garden = loadGarden();
  const intro = garden.length
    ? `你已经种了 ${garden.length} 个好句子！再选一个句子，我们让它长大吧。`
    : "我是团团！选一个短短的句子，我们一次加一个感觉，让它慢慢长大吧！";
  $("home-intro").replaceChildren(ruby(intro));
  $("seed-grid").replaceChildren(...SEEDS.map(seedCard));

  storySeeds = seedsFromLibrary(loadLibrary());
  $("story-seeds-wrap").hidden = storySeeds.length === 0;
  $("story-seeds").replaceChildren(
    ...storySeeds.map((seed) => {
      const li = document.createElement("li");
      const b = document.createElement("button");
      b.type = "button";
      b.className = "library-item story-seed";
      b.dataset.seed = seed.id;
      b.textContent = seed.plain;
      const small = document.createElement("small");
      small.textContent = seed.title;
      b.append(small);
      b.addEventListener("click", () => startGrowing(seed));
      li.append(b);
      return li;
    }),
  );

  $("garden-wrap").hidden = garden.length === 0;
  $("garden").replaceChildren(
    ...garden.map((g) => {
      const li = document.createElement("li");
      const b = document.createElement("button");
      b.type = "button";
      b.className = "library-item garden-item";
      b.textContent = `${g.emoji} ${g.final}`;
      const small = document.createElement("small");
      small.textContent = "⭐".repeat(starCount(g.layers));
      b.append(small);
      b.addEventListener("click", () => openSaved(g));
      li.append(b);
      return li;
    }),
  );
  show("home");
}

// ---------- play ----------

interface Play {
  seed: Seed;
  layers: Layer[];
  /** The sentence as it is now. */
  current: string;
  sense?: SenseId;
  /** 💡 words from the AI's last verdict, for the next senses. */
  aiHints: Partial<Record<SenseId, string[]>>;
  busy: boolean;
  /** The ＋ the child is writing in: a string offset into `current`. */
  slot?: number;
  /** 团团's suggested ＋ for this sense, if the picture has one. */
  suggested?: number;
  /** What the child typed in the ＋. */
  addition: string;
  /** ✏️ 整句改一改: editing the whole sentence instead of one ＋. */
  whole: boolean;
  /** 团团 asked for another try: whether that sentence had the sense
   * (就这样吧 then keeps the ⭐), and its reaction. */
  pending?: { done: boolean; reaction: string };
  /** The finished, saved sentence. */
  saved?: GrownSentence;
}

let play: Play | undefined;
const input = () => $<HTMLTextAreaElement>("grow-input");
const slotInput = () => document.querySelector<HTMLInputElement>("#slot-sentence .slot-input");

/** The sentence with what the child is adding right now. */
function sentenceNow(p: Play): string {
  if (p.whole) return tidySpaces(input().value);
  return p.slot !== undefined && p.addition.trim() ? tidySpaces(insertAt(p.current, p.slot, p.addition)) : p.current;
}

/** `fresh`: the sense just added, which grows in. `preview`: the
 * sentence with what the child is typing, in the current sense's colour. */
function renderSentence(fresh?: Origin, preview?: string): void {
  if (!play) return;
  const p = play;
  const text = p.saved?.final ?? p.current;
  const steps = layerSteps(p.layers, p.saved?.final);
  if (preview && p.sense && preview !== p.current) steps.push({ text: preview, origin: p.sense });
  $("grow-sentence").replaceChildren(coloured(p.seed.plain, steps, fresh));
  $("grow-speak").replaceChildren(speakButton(text));
  $("dots-label").textContent = dotsLabel(p.layers.length);
  $("layer-dots").replaceChildren(
    ...Array.from({ length: SENSES_PER_SENTENCE }, (_, i) => {
      const li = document.createElement("li");
      const layer = p.layers[i];
      li.className = layer ? `dot filled seg-${layer.sense}` : "dot";
      li.textContent = layer ? getSense(layer.sense).emoji : String(i + 1);
      return li;
    }),
  );
}

function startGrowing(seed: Seed): void {
  play = { seed, layers: [], current: seed.plain, aiHints: {}, busy: false, addition: "", whole: false };
  practice.stop();
  $("scene-emoji").textContent = seed.emoji;
  $("scene-title").replaceChildren(ruby(seed.title));
  $("reaction").hidden = true;
  $("end").hidden = true;
  $("step").hidden = true;
  show("play");
  renderSentence();
  speak(seed.plain);
  openPick();
}

/** Pick the next sense, or finish after three. */
function openPick(): void {
  if (!play) return;
  const p = play;
  if (p.layers.length >= SENSES_PER_SENTENCE) {
    finish();
    return;
  }
  const left = SENSES_PER_SENTENCE - p.layers.length;
  const label = p.layers.length ? `再选一个感觉！还可以加 ${left} 个。` : "选一个感觉，让句子长大！";
  $("pick-label").replaceChildren(ruby(label));
  const open = openSenses(p.layers);
  $("sense-cards").replaceChildren(
    ...SENSES.map((s) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = `sense-card seg-${s.id}`;
      b.dataset.sense = s.id;
      b.disabled = !open.includes(s.id);
      const emoji = document.createElement("span");
      emoji.className = "sense-emoji";
      emoji.textContent = s.emoji;
      b.append(emoji, ruby(s.label, "sense-label"));
      b.addEventListener("click", () => openStep(s.id));
      return b;
    }),
  );
  $("pick").hidden = false;
  $("step").hidden = true;
}

function openStep(sense: SenseId): void {
  if (!play) return;
  const p = play;
  p.sense = sense;
  const s = getSense(sense);
  const question = questionFor(p.seed, sense);
  $("step").dataset.sense = sense;
  $("step-title").textContent = `${s.emoji} ${s.mission}`;
  $("step-question").replaceChildren(ruby(question), speakButton(question));
  $("hint-words").replaceChildren(
    ...hintsFor(p.seed, sense, p.aiHints[sense]).map((w) => {
      const span = document.createElement("span");
      span.className = "hint-word";
      span.append(ruby(w));
      return span;
    }),
  );
  $("hint-words").hidden = true;
  const ex = EXAMPLES[sense];
  const plainEx = document.createElement("p");
  plainEx.append(ruby(`例子：${ex.plain}`));
  // The added part in colour, so the example also shows *where* it went.
  const richEx = document.createElement("p");
  richEx.append("→ ", coloured(ex.plain, [{ text: ex.rich, origin: sense }]));
  $("example").replaceChildren(plainEx, richEx);
  $("example").hidden = true;
  $("step-note").hidden = true;
  $("thinking").hidden = true;
  $("btn-keep").hidden = true;
  p.pending = undefined;
  $("pick").hidden = true;
  $("reaction").hidden = true;
  $("step").hidden = false;
  p.whole = false;
  p.addition = "";
  p.suggested = spotOffset(p.current, p.seed.spots?.[sense]);
  p.slot = p.suggested;
  $("whole-wrap").hidden = true;
  $("slot-sentence").hidden = false;
  $("btn-whole").hidden = false;
  $("slot-tip").hidden = false;
  renderSlots();
  speak(question);
  $("step").scrollIntoView({ behavior: "smooth", block: "nearest" });
  slotInput()?.focus();
}

/** The sentence as words with a ＋ between them; the chosen ＋ is a box to type in. */
function renderSlots(): void {
  if (!play) return;
  const p = play;
  // 团团's spot only glows until the child picks another: it's a suggestion, not a must.
  const lit = p.slot === undefined || p.slot === p.suggested ? p.suggested : undefined;
  const tip =
    lit !== undefined
      ? "团团觉得可以加在发光的 ＋ 这里。你也可以点别的 ＋。"
      : p.slot !== undefined
        ? "好，就加在这里！想换地方，就点别的 ＋。"
        : "点一个 ＋，把新的词写进去。";
  $("slot-tip").replaceChildren(ruby(tip));
  const slots = slotOffsets(p.current, p.suggested);
  const words = slotWords(p.current, slots);
  // Pinyin for the whole sentence, so 了 and 地 read in context (le, de).
  const py = charPinyin(p.current);
  const wordRuby = (from: number, word: string): HTMLElement => {
    const span = document.createElement("span");
    span.className = "slot-word";
    const start = Array.from(p.current.slice(0, from)).length;
    renderRubyText(span, word, py.slice(start, start + Array.from(word).length));
    return span;
  };
  const parts: Node[] = [];
  slots.forEach((at, i) => {
    if (at === p.slot) {
      const box = document.createElement("input");
      box.className = `slot-input seg-${p.sense}`;
      box.lang = "zh-Hans";
      box.autocomplete = "off";
      box.value = p.addition;
      box.placeholder = at === slots.at(-1) && at > 0 ? "，……" : "……";
      box.setAttribute("aria-label", "写新的词");
      box.style.width = `${slotWidthEm(p.addition)}em`;
      box.addEventListener("input", () => {
        p.addition = box.value;
        box.style.width = `${slotWidthEm(box.value)}em`;
        $("step-note").hidden = true;
        renderSentence(undefined, sentenceNow(p));
      });
      box.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.isComposing) void grow();
      });
      parts.push(box);
    } else {
      const b = document.createElement("button");
      b.type = "button";
      b.className = at === lit ? "slot-btn suggested" : "slot-btn";
      b.dataset.at = String(at);
      b.textContent = "+";
      b.setAttribute("aria-label", "加在这里");
      b.addEventListener("click", () => {
        if (p.busy) return;
        p.slot = at;
        renderSlots();
        renderSentence(undefined, sentenceNow(p));
        slotInput()?.focus();
      });
      parts.push(b);
    }
    if (i < words.length) parts.push(wordRuby(at, words[i]));
  });
  const ending = p.current.slice(slots.at(-1));
  if (ending) parts.push(wordRuby(slots.at(-1)!, ending));
  $("slot-sentence").replaceChildren(...parts);
}

/** ✏️ 整句改一改: edit the whole sentence (for bigger changes like 跑 → 跑来跑去). */
function openWhole(): void {
  if (!play || play.busy) return;
  const p = play;
  const box = input();
  box.value = sentenceNow(p);
  p.whole = true;
  $("slot-sentence").hidden = true;
  $("slot-tip").hidden = true;
  $("btn-whole").hidden = true;
  $("whole-wrap").hidden = false;
  box.readOnly = false;
  box.focus();
}

function stepNote(text: string): void {
  $("step-note").textContent = `🐼 ${text}`;
  $("step-note").hidden = false;
}

function setBusy(busy: boolean): void {
  if (!play) return;
  play.busy = busy;
  $("thinking").hidden = !busy;
  for (const id of ["btn-grow", "btn-back", "btn-keep", "btn-whole"]) $<HTMLButtonElement>(id).disabled = busy;
  input().readOnly = busy;
  const box = slotInput();
  if (box) box.readOnly = busy;
}

async function grow(): Promise<void> {
  if (!play || !play.sense || play.busy) return;
  const p = play;
  const sense = p.sense!;
  if (!p.whole && !p.addition.trim()) {
    stepNote(p.slot === undefined ? "先点一个 ＋，选一个地方加新的词吧！" : "在 ＋ 里写上新的词吧！");
    return;
  }
  const raw = sentenceNow(p);
  const words = hintsFor(p.seed, sense, p.aiHints[sense]);
  const check = offlineCheck(p.current, raw, words);
  if (!check.ok) {
    stepNote(checkNote(check.reason, sense));
    return;
  }
  const sentence = finishSentence(raw);
  const offlineCheer = cheerFor(sense, check.used);
  if (!aiEnabled) {
    addLayer(sentence, true, offlineCheer);
    return;
  }
  setBusy(true);
  const res: GrowResponse | null = await requestGrow({ plain: p.seed.plain, before: p.current, sentence, sense });
  setBusy(false);
  if (play !== p || p.sense !== sense) return;
  if (!res) {
    // AI unavailable: the child added something, so trust them.
    addLayer(sentence, true, offlineCheer);
    return;
  }
  p.aiHints = res.hints;
  if (res.senseDone && res.readsWell) {
    addLayer(sentence, true, res.reaction || offlineCheer);
    return;
  }
  // Not yet: either the sense is missing, or it's there but the sentence
  // reads oddly. 团团 asks a question; the child can fix it or move on.
  p.pending = { done: res.senseDone, reaction: res.reaction || offlineCheer };
  const note = !res.senseDone
    ? res.hint || res.reaction || "再试一试？"
    : res.fixHint || "感觉加进去了！不过读起来有点怪，点 🔊 读给我听，听一听哪里不顺？";
  stepNote(note);
  speak(note);
  $("btn-keep").hidden = false;
}

/** 就这样吧: keep the sentence as written. ⭐ only if 团团 found the sense in it. */
function keepAnyway(): void {
  if (!play || !play.sense || play.busy) return;
  const raw = sentenceNow(play);
  if (!isUsableSentence(raw)) return;
  const done = play.pending?.done ?? false;
  addLayer(finishSentence(raw), done, done ? play.pending!.reaction : "好，我们接着让它长大！");
}

function addLayer(text: string, done: boolean, reaction: string): void {
  if (!play || !play.sense) return;
  const p = play;
  p.layers.push({ sense: p.sense!, text, done });
  p.current = text;
  p.sense = undefined;
  $("step").hidden = true;
  renderSentence(p.layers.at(-1)!.sense);
  const note = $("reaction");
  note.textContent = `🐼 ${reaction}${done ? " ⭐" : ""}`;
  note.hidden = false;
  speak(reaction);
  openPick();
}

// ---------- the end: 读一读, 改一改, save, 教团团写字 ----------

function finish(): void {
  if (!play) return;
  const p = play;
  $("pick").hidden = true;
  p.saved = {
    id: `${p.seed.id}-${Date.now()}`,
    seedId: p.seed.id,
    emoji: p.seed.emoji,
    title: p.seed.title,
    plain: p.seed.plain,
    layers: p.layers,
    final: p.current,
    savedAt: Date.now(),
  };
  saveGrown(p.saved);
  renderEnd();
  $("read-actions").hidden = false;
  $("edit-wrap").hidden = true;
  $("read-ask").replaceChildren(ruby("我们一起读一读，听听顺不顺？"));
  $("long-note").hidden = !isLong(p.saved.final);
  $("practise").hidden = true;
  $("end").hidden = false;
  $("end").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function renderEnd(): void {
  const s = play?.saved;
  if (!s) return;
  $("end-growth").textContent = `${growthText(s.plain, s.final)} ${"⭐".repeat(starCount(s.layers))}`;
  $("end-before").replaceChildren(ruby(s.plain), speakButton(s.plain));
  $("end-after").replaceChildren(coloured(s.plain, layerSteps(s.layers, s.final)), speakButton(s.final));
  $("legend").replaceChildren(...legendItems(s.plain, s.layers));
}

function readDone(reply: string): void {
  if (!play?.saved) return;
  $("read-actions").hidden = true;
  $("edit-wrap").hidden = true;
  $("long-note").hidden = true;
  $("read-ask").replaceChildren(ruby(reply));
  offerTeach();
}

function saveEdit(): void {
  if (!play?.saved) return;
  const p = play;
  const raw = $<HTMLTextAreaElement>("edit-input").value.trim();
  if (!isUsableSentence(raw) || raw.includes("……")) {
    $("edit-hint").textContent = "句子不见了，再写一写吧！";
    return;
  }
  p.saved = { ...p.saved!, final: finishSentence(raw) };
  saveGrown(p.saved);
  renderSentence();
  renderEnd();
  readDone("改得好！现在读起来更顺了。");
}

const practice = createPractice(
  {
    tabs: $("char-tabs"),
    pad: $("practise-pad"),
    feedback: $("practise-feedback"),
    animate: $<HTMLButtonElement>("btn-animate"),
    trace: $<HTMLButtonElement>("btn-trace"),
    free: $<HTMLButtonElement>("btn-free"),
  },
  { onLearned: (char) => saveTaught(char) },
);
let teachChar = "";

/** 团团 asks to learn one character the child added to the sentence. */
function offerTeach(): void {
  const s = play?.saved;
  if (!s) return;
  const [pick] = pickCharsToTeach([{ by: "child", text: s.final, plain: s.plain }], undefined, new Set(loadTaught()), 1);
  teachChar = pick?.char ?? "";
  $("practise").hidden = !pick;
  if (!pick) return;
  $("teach-ask").replaceChildren(ruby(`你加的字里，有一个我还不会写：「${pick.char}」。你能教教我吗？`));
  const li = document.createElement("li");
  li.className = "teach-word";
  li.dataset.char = pick.char;
  const big = document.createElement("span");
  big.className = "teach-char";
  big.textContent = pick.char;
  li.append(big);
  $("teach-words").replaceChildren(li);
  $<HTMLButtonElement>("btn-practise").hidden = false;
  $("practise-pad-wrap").hidden = true;
}

// ---------- saved sentences ----------

let openGrown: GrownSentence | undefined;
function openSaved(g: GrownSentence): void {
  openGrown = g;
  const del = $("btn-delete");
  delete del.dataset.armed;
  del.textContent = "删除";
  $("read-emoji").textContent = g.emoji;
  $("read-title").replaceChildren(ruby(g.title));
  $("read-before").replaceChildren(ruby(g.plain), speakButton(g.plain));
  $("read-after").replaceChildren(coloured(g.plain, layerSteps(g.layers, g.final)), speakButton(g.final));
  $("read-legend").replaceChildren(...legendItems(g.plain, g.layers));
  show("read");
}

/** The seed a saved sentence grew from, to grow it again. */
function seedOf(g: GrownSentence): Seed {
  return (
    getSeed(g.seedId) ??
    storySeeds.find((s) => s.id === g.seedId) ?? { id: g.seedId, emoji: g.emoji, title: g.title, plain: g.plain, questions: {}, words: {}, fromStory: true }
  );
}

// ---------- wiring ----------

function init(): void {
  applyPinyin();
  if (testMode) {
    $("test-badge").hidden = false;
    $("garden-title").textContent = "🧪 测试句子本";
    $("saved-hint").textContent = "句子已经放进“测试句子本”里了。";
    $<HTMLAnchorElement>("link-story").href = "/story-builder.html?test";
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
    play = undefined;
    renderHome();
  });

  wireMic($<HTMLButtonElement>("btn-mic"), () => (play?.whole ? input() : slotInput()));
  input().addEventListener("input", () => {
    $("step-note").hidden = true;
    if (play) renderSentence(undefined, sentenceNow(play));
  });
  $("btn-whole").addEventListener("click", openWhole);
  $("btn-listen").addEventListener("click", () => play && speak(sentenceNow(play)));
  $("btn-hint").addEventListener("click", () => ($("hint-words").hidden = !$("hint-words").hidden));
  $("btn-example").addEventListener("click", () => ($("example").hidden = !$("example").hidden));
  $("btn-back").addEventListener("click", () => {
    if (!play || play.busy) return;
    play.sense = undefined;
    renderSentence();
    openPick();
  });
  $("btn-grow").addEventListener("click", () => void grow());
  $("btn-keep").addEventListener("click", keepAnyway);

  $("btn-read").addEventListener("click", () => play?.saved && speak(play.saved.final));
  $("btn-smooth").addEventListener("click", () => readDone("读起来真顺！你是写句子的小高手！"));
  $("btn-edit").addEventListener("click", () => {
    if (!play?.saved) return;
    $<HTMLTextAreaElement>("edit-input").value = play.saved.final;
    $("edit-hint").textContent = "";
    $("edit-wrap").hidden = false;
    $("long-note").hidden = true;
    $<HTMLTextAreaElement>("edit-input").focus();
  });
  $("btn-edit-save").addEventListener("click", saveEdit);
  $("btn-practise").addEventListener("click", () => {
    if (!teachChar) return;
    $<HTMLButtonElement>("btn-practise").hidden = true;
    $("practise-pad-wrap").hidden = false;
    practice.start([teachChar]);
    $("practise-pad-wrap").scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
  $("btn-again").addEventListener("click", () => {
    practice.stop();
    play = undefined;
    renderHome();
  });

  $("btn-regrow").addEventListener("click", () => openGrown && startGrowing(seedOf(openGrown)));
  // Two taps to delete (no confirm() dialog: some embedded viewers block it).
  const del = $("btn-delete");
  del.addEventListener("click", () => {
    if (!openGrown) return;
    if (del.dataset.armed !== "1") {
      del.dataset.armed = "1";
      del.textContent = "再点一次，确认删除";
      return;
    }
    deleteGrown(openGrown.id);
    openGrown = undefined;
    renderHome();
  });

  renderHome();
  void partnerEnabled().then((on) => {
    aiEnabled = on;
    document.body.dataset.ai = on ? "on" : "off";
  });
}

init();
