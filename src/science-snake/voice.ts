/**
 * Read-aloud and a small chime for Science Snake. Uses the browser's
 * own `speechSynthesis` (free, works offline on phones) and a Web Audio
 * beep, so there are no sound files to ship. Everything here fails
 * quietly: a browser without speech just stays silent.
 *
 * iOS only lets audio start after a tap, so the first call must come
 * from a tap handler (the page's "Go in" button does this).
 */

let muted = false;
let audioContext: AudioContext | null = null;

export function isMuted(): boolean {
  return muted;
}

export function setMuted(value: boolean): void {
  muted = value;
  if (muted) window.speechSynthesis?.cancel();
}

function pickVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis?.getVoices() ?? [];
  return (
    voices.find((v) => v.lang === "en-SG") ??
    voices.find((v) => v.lang === "en-GB") ??
    voices.find((v) => v.lang.startsWith("en"))
  );
}

/** Speaks `text`, cutting off anything still being read. */
export function speak(text: string): void {
  if (muted || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = pickVoice();
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang ?? "en-GB";
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  } catch {
    // No speech on this browser — the text is on screen anyway.
  }
}

/** A short rising two-note chime for each placed phrase; a low buzz when `sad`. */
export function chime(sad = false): void {
  if (muted) return;
  try {
    audioContext ??= new AudioContext();
    const ctx = audioContext;
    const notes = sad ? [220, 160] : [660, 880];
    notes.forEach((frequency, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = sad ? "sawtooth" : "sine";
      osc.frequency.value = frequency;
      const start = ctx.currentTime + i * 0.09;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.15, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.2);
    });
  } catch {
    // No Web Audio — the on-screen change is enough.
  }
}
