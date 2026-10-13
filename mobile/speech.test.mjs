import assert from "node:assert/strict";
import { test } from "node:test";
import { installOfflineSpeech } from "./speech.mjs";

test("offline speech starts and finishes, seeks sentence clips, and ignores a canceled playback", async () => {
  const audios = [];
  class Audio {
    constructor(src) { this.src = src; this.readyState = 1; this.currentTime = 0; audios.push(this); }
    async play() { this.onplay?.(); }
    pause() { this.paused = true; }
  }
  const env = { Audio, fetch: async () => ({ ok: true, json: async () => ({ hello: { src: "/hello.mp3" }, sentence: { src: "/part2.mp3", start: 30, duration: 4 } }) }) };
  const speech = installOfflineSpeech(env);
  let starts = 0, ends = 0;
  const utterance = new env.SpeechSynthesisUtterance(" Hello ");
  utterance.onstart = () => starts++;
  utterance.onend = () => ends++;
  speech.speak(utterance);
  await new Promise(setImmediate);
  assert.equal(starts, 1);
  assert.equal(audios[0].src, "/hello.mp3");
  audios[0].onended();
  assert.equal(ends, 1);
  const sentence = new env.SpeechSynthesisUtterance("sentence");
  sentence.onend = () => ends++;
  speech.speak(sentence);
  await new Promise(setImmediate);
  assert.equal(audios[1].currentTime, 30);
  audios[1].currentTime = 34;
  audios[1].ontimeupdate();
  assert.equal(ends, 2);
  speech.speak(utterance);
  speech.cancel();
  await new Promise(setImmediate);
  assert.equal(audios.length, 2);
  audios[1].onended();
  assert.equal(ends, 2);
});
