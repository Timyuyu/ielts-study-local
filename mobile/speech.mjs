export const normalizeSpeech = (text) => text.trim().replace(/\s+/g, " ").toLowerCase();

export function installOfflineSpeech(env) {
  const manifest = env.fetch("/audio/offline/manifest.json").then((response) => {
    if (!response.ok) throw new Error("离线朗读资源缺失");
    return response.json();
  });
  // Retain the rejection until playback so a damaged install reports an error.
  manifest.catch(() => {});
  let current = null;
  let sequence = 0;
  const listeners = new Set();
  const voices = [{ name: "内置离线英语录音", lang: "en-US", localService: true, default: true, voiceURI: "offline-recordings" }];
  class OfflineUtterance {
    constructor(text = "") { this.text = text; this.lang = "en-US"; this.rate = 1; this.pitch = 1; this.volume = 1; }
  }
  const finish = (entry, type) => {
    if (current !== entry) return;
    if (type !== "start") { current = null; entry.audio?.pause(); }
    entry.utterance[`on${type}`]?.({ type, utterance: entry.utterance });
  };
  env.__offlineSpeechEvent = (id, type) => {
    if (current?.id === id) finish(current, type);
  };
  env.__offlineVoicesChanged = () => listeners.forEach((listener) => listener({ type: "voiceschanged" }));
  const speech = {
    getVoices() { return voices; },
    addEventListener(type, listener) { if (type === "voiceschanged") listeners.add(listener); },
    removeEventListener(type, listener) { if (type === "voiceschanged") listeners.delete(listener); },
    cancel() {
      const previous = current;
      current = null;
      previous?.audio?.pause();
      env.AndroidSpeech?.cancel();
    },
    speak(utterance) {
      speech.cancel();
      const entry = { id: String(++sequence), utterance, audio: null };
      current = entry;
      void manifest.then((tracks) => {
        if (current !== entry) return;
        const track = tracks[normalizeSpeech(utterance.text)] ?? tracks[normalizeSpeech(utterance.text).replace(/[’']/g, "")];
        if (!track) {
          if (env.AndroidSpeech) env.AndroidSpeech.speak(utterance.text, utterance.lang, utterance.rate, utterance.pitch, entry.id);
          else finish(entry, "error");
          return;
        }
        const audio = new env.Audio(track.src);
        entry.audio = audio;
        audio.preload = "auto";
        audio.playbackRate = Math.min(2, Math.max(0.5, utterance.rate || 1));
        audio.volume = Math.min(1, Math.max(0, utterance.volume ?? 1));
        audio.onplay = () => finish(entry, "start");
        audio.onended = () => finish(entry, "end");
        audio.onerror = () => finish(entry, "error");
        if (track.duration) audio.ontimeupdate = () => {
          if (audio.currentTime >= (track.start ?? 0) + track.duration) finish(entry, "end");
        };
        const begin = () => {
          if (current !== entry) return;
          if (track.start) audio.currentTime = track.start;
          void audio.play().catch(() => finish(entry, "error"));
        };
        if (audio.readyState >= 1) begin();
        else audio.onloadedmetadata = begin;
      }).catch(() => finish(entry, "error"));
    },
  };
  Object.defineProperty(env, "speechSynthesis", { value: speech, configurable: true });
  Object.defineProperty(env, "SpeechSynthesisUtterance", { value: OfflineUtterance, configurable: true });
  return speech;
}
