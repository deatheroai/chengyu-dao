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
  /** The finished, saved sentence. */
  saved?: GrownSentence;
}

let play: Play | undefined;
const input = () => $<HTMLTextAreaElement>("grow-input");

/** `fresh`: the sense just added, which grows in. */
function renderSentence(fresh?: Origin): void {
  if (!play) return;
  const p = play;
  const text = p.saved?.final ?? p.current;
  $("grow-sentence").replaceChildren(coloured(p.seed.plain, layerSteps(p.layers, p.saved?.final), fresh));
  $("grow-speak").replaceChildren(speakButton(text));
  $("layer-dots").replaceChildren(
    ...Array.from({ length: SENSES_PER_SENTENCE }, (_, i) => {
      const li = document.createElement("li");
      const layer = p.layers[i];
      li.className = layer ? `dot filled seg-${layer.sense}` : "dot";
      li.textContent = layer ? getSense(layer.sense).emoji : "";
      return li;
    }),
  );
}

function startGrowing(seed: Seed): void {
  play = { seed, layers: [], current: seed.plain, aiHints: {}, busy: false };
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
  const richEx = document.createElement("p");
  richEx.append(ruby(`→ ${ex.rich}`));
  $("example").replaceChildren(plainEx, richEx);
  $("example").hidden = true;
  $("step-note").hidden = true;
  $("thinking").hidden = true;
  $("btn-keep").hidden = true;
  $("pick").hidden = true;
  $("reaction").hidden = true;
  $("step").hidden = false;
  const box = input();
  box.value = p.current;
  box.readOnly = false;
  speak(question);
  $("step").scrollIntoView({ behavior: "smooth", block: "nearest" });
  box.focus();
  box.setSelectionRange(box.value.length, box.value.length);
}

function stepNote(text: string): void {
  $("step-note").textContent = `🐼 ${text}`;
  $("step-note").hidden = false;
}

function setBusy(busy: boolean): void {
  if (!play) return;
  play.busy = busy;
  $("thinking").hidden = !busy;
  for (const id of ["btn-grow", "btn-back", "btn-keep"]) $<HTMLButtonElement>(id).disabled = busy;
  input().readOnly = busy;
}

async function grow(): Promise<void> {
  if (!play || !play.sense || play.busy) return;
  const p = play;
  const sense = p.sense!;
  const raw = input().value.trim();
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
  if (res.senseDone) {
    addLayer(sentence, true, res.reaction || offlineCheer);
  } else {
    stepNote(res.hint || res.reaction || "再试一试？");
    $("btn-keep").hidden = false;
  }
}

/** 就这样吧: keep the sentence as written, without a ⭐. */
function keepAnyway(): void {
  if (!play || !play.sense || play.busy) return;
  const raw = input().value.trim();
  if (!isUsableSentence(raw)) return;
  addLayer(finishSentence(raw), false, "好，我们接着让它长大！");
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

  wireMic($<HTMLButtonElement>("btn-mic"), input());
  input().addEventListener("input", () => ($("step-note").hidden = true));
  $("btn-hint").addEventListener("click", () => ($("hint-words").hidden = !$("hint-words").hidden));
  $("btn-example").addEventListener("click", () => ($("example").hidden = !$("example").hidden));
  $("btn-back").addEventListener("click", () => play && !play.busy && openPick());
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
