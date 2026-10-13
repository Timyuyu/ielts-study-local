import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { PART1_QUESTIONS, PART2_CUES } from "../app/speaking-bank.ts";
import { PART3_QUESTIONS, SPEAKING_MOCKS } from "../app/ielts-speaking-exam.ts";
import { LISTENING_MOCKS } from "../app/ielts-exam-bank.ts";
import { LISTENING_BANK } from "../app/practice-banks.ts";

const normalize = (text) => text.trim().replace(/\s+/g, " ").toLowerCase();
const manifest = {};
const texts = new Map();
const add = (text) => {
  if (!text?.trim()) return;
  const key = normalize(text);
  if (manifest[key]) return;
  const id = createHash("sha256").update(key).digest("hex").slice(0, 24);
  texts.set(key, { text: text.trim(), id });
};
const words = JSON.parse(await readFile("public/audio/words/manifest.json", "utf8"));
for (const [word, src] of Object.entries(words)) manifest[normalize(word)] = { src };
const part2 = JSON.parse(await readFile("public/audio/part2/manifest.json", "utf8"));
for (const track of part2.tracks) {
  const cue = PART2_CUES.find((item) => item.id === track.id);
  manifest[normalize(cue.answer)] = { src: track.src };
  for (const sentence of track.sentences) {
    manifest[normalize(sentence.text)] = { src: track.src, start: sentence.start, duration: sentence.duration };
  }
}
for (const line of (await readFile("public/speaking-1000.txt", "utf8")).split(/\r?\n/)) {
  const body = line.trim().match(/^\d+\s*\.\s*(.+)$/)?.[1];
  if (body) add(body.slice(0, body.search(/[\u3400-\u9fff]/)));
}
for (const item of [...PART1_QUESTIONS, ...PART3_QUESTIONS]) {
  add(item.question);
  add(item.answer);
  for (const sentence of item.answer.match(/[^.!?]+[.!?]+(?:[”’\"])?|[^.!?]+$/g) ?? []) add(sentence);
}
for (const cue of PART2_CUES) add(cue.prompt);
for (const mock of SPEAKING_MOCKS) {
  mock.part1Questions.forEach(add);
  add(mock.part2.prompt);
}
for (const mock of LISTENING_MOCKS) for (const section of mock.sections) for (const turn of section.turns) add(turn.text);
for (const item of LISTENING_BANK) add(item.transcript);
await mkdir("mobile/offline-audio", { recursive: true });
for (const [key, { id }] of texts) manifest[key] = { src: `/audio/offline/${id}.mp3` };
await writeFile("mobile/offline-audio/catalog.json", JSON.stringify([...texts.values()]));
await writeFile("mobile/offline-audio/manifest.json", JSON.stringify(manifest));
console.log(`Offline speech: ${Object.keys(manifest).length} entries; ${texts.size} new recordings`);
