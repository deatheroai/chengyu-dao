import { renderRubyText } from "../shared/rubyText";
import { charPinyin } from "./pinyin";

/**
 * Small DOM helpers shared by story-builder.html and
 * sentence-grower.html: element lookup, pinyin over text, read-aloud
 * and voice input.
 */

export const $ = <T extends HTMLElement = HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} missing`);
  return el as T;
};

/** One 拼音 on/off choice for both pages. */
const PINYIN_KEY = "chengyu-dao:story-builder:pinyin";

export function readPinyinPref(): boolean {
  try {
    return localStorage.getItem(PINYIN_KEY) !== "off";
  } catch {
    return true;
  }
}

export function savePinyinPref(on: boolean): void {
  try {
    localStorage.setItem(PINYIN_KEY, on ? "on" : "off");
  } catch {
    /* ignore */
  }
}

/** Text with pinyin over each character. */
export function ruby(text: string, cls = ""): HTMLElement {
  const span = document.createElement("span");
  if (cls) span.className = cls;
  renderRubyText(span, text, charPinyin(text));
  return span;
}

export function speak(text: string): void {
  if (!("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "zh-CN";
  u.rate = 0.8;
  speechSynthesis.speak(u);
}

export function speakButton(text: string): HTMLButtonElement {
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

/** Shows `button` and makes it add what the child says at the cursor in
 * `input` (or in whichever box `input()` returns at the time). */
export function wireMic(
  button: HTMLButtonElement,
  input: HTMLTextAreaElement | HTMLInputElement | (() => HTMLTextAreaElement | HTMLInputElement | null),
): void {
  const Ctor: (new () => Recognition) | undefined =
    (window as unknown as Record<string, new () => Recognition>).SpeechRecognition ??
    (window as unknown as Record<string, new () => Recognition>).webkitSpeechRecognition;
  if (!Ctor) return;
  button.hidden = false;
  button.addEventListener("click", () => {
    const rec = new Ctor();
    rec.lang = "zh-CN";
    rec.interimResults = false;
    button.classList.add("listening");
    rec.onresult = (e) => {
      const box = typeof input === "function" ? input() : input;
      if (!box) return;
      const said = e.results[0]?.[0]?.transcript ?? "";
      const at = box.selectionEnd ?? box.value.length;
      box.value = box.value.slice(0, at) + said + box.value.slice(at);
      box.dispatchEvent(new Event("input", { bubbles: true }));
    };
    rec.onend = () => button.classList.remove("listening");
    rec.start();
  });
}
