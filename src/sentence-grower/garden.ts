import { isTestMode } from "../story-builder/library";
import { PARTNER_SENSES } from "../story-builder/partnerApi";
import type { SenseId } from "../story-builder/senses";
import type { Layer } from "./grow";

/**
 * 我的好句子: sentences the child has grown, kept in this browser only.
 * `?test` keeps them in a separate list, as in the story builder.
 */
export interface GrownSentence {
  id: string;
  seedId: string;
  emoji: string;
  title: string;
  plain: string;
  layers: Layer[];
  /** The finished sentence (after 改一改, if the child changed it). */
  final: string;
  savedAt: number;
}

const KEY = "chengyu-dao:sentence-grower:garden:v1";
const gardenKey = () => (isTestMode() ? `${KEY}:test` : KEY);
const MAX = 50;

const isStr = (x: unknown): x is string => typeof x === "string";
const isSense = (x: unknown): x is SenseId => (PARTNER_SENSES as readonly unknown[]).includes(x);

function cleanLayer(x: unknown): Layer | null {
  const l = x as Layer;
  return l && isSense(l.sense) && isStr(l.text) ? { sense: l.sense, text: l.text, done: l.done === true } : null;
}

function cleanSentence(x: unknown): GrownSentence | null {
  const s = x as GrownSentence;
  if (!s || !isStr(s.id) || !isStr(s.plain) || !isStr(s.final) || typeof s.savedAt !== "number" || !Array.isArray(s.layers)) {
    return null;
  }
  const layers = s.layers.map(cleanLayer);
  if (layers.some((l) => l === null)) return null;
  return {
    id: s.id,
    seedId: isStr(s.seedId) ? s.seedId : "",
    emoji: isStr(s.emoji) ? s.emoji : "🌱",
    title: isStr(s.title) ? s.title : "",
    plain: s.plain,
    layers: layers as Layer[],
    final: s.final,
    savedAt: s.savedAt,
  };
}

function storage(): Storage | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

/** Grown sentences, newest first. Bad or missing data reads as empty. */
export function loadGarden(): GrownSentence[] {
  try {
    const raw = storage()?.getItem(gardenKey());
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.map(cleanSentence).filter((s): s is GrownSentence => s !== null);
  } catch {
    return [];
  }
}

function write(list: GrownSentence[]): GrownSentence[] {
  try {
    storage()?.setItem(gardenKey(), JSON.stringify(list));
  } catch {
    /* storage full or blocked: the sentence still shows on screen */
  }
  return list;
}

/** Saves (or replaces, by id) a sentence at the front; keeps the newest 50. */
export function saveGrown(s: GrownSentence): GrownSentence[] {
  return write([s, ...loadGarden().filter((x) => x.id !== s.id)].slice(0, MAX));
}

export function deleteGrown(id: string): GrownSentence[] {
  return write(loadGarden().filter((x) => x.id !== id));
}
