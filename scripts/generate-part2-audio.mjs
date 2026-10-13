import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import edgeTts from "msedge-tts";
import { PART2_CUES as cues } from "../app/speaking-bank.ts";

const { MsEdgeTTS, OUTPUT_FORMAT } = edgeTts;
const outputDir = resolve("public", "audio", "part2");
const manifestPath = resolve(outputDir, "manifest.json");
const force = process.argv.includes("--force");
const fromArgument = process.argv.find((argument) => argument.startsWith("--from="));
const regenerateFrom = Math.max(1, Number(fromArgument?.split("=")[1] ?? 1) || 1);
const concurrency = 3;
const voice = "en-US-AndrewMultilingualNeural";
const voiceRate = "-5%";

await mkdir(outputDir, { recursive: true });

let previousTracks = [];
try {
  previousTracks = JSON.parse(await readFile(manifestPath, "utf8")).tracks ?? [];
} catch {
  previousTracks = [];
}
const completed = new Map(previousTracks.map((track) => [track.id, track]));

function splitSentences(text) {
  return text.match(/[^.!?]+[.!?]+(?:[”’\"])?|[^.!?]+$/g)?.map((item) => item.trim()).filter(Boolean) ?? [text];
}

function escapeXml(text) {
  return text.replace(/[<>&'\"]/g, (character) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    "'": "&apos;",
    "\"": "&quot;",
  })[character]);
}

function estimatedBoundaries(text, durationSeconds) {
  const sentences = splitSentences(text);
  const totalWeight = sentences.reduce((sum, sentence) => sum + sentence.length, 0);
  let cursor = 0.12;
  return sentences.map((sentence, index) => {
    const remaining = Math.max(0.2, durationSeconds - 0.2);
    const duration = index === sentences.length - 1
      ? Math.max(0.2, remaining - cursor)
      : Math.max(0.2, (sentence.length / totalWeight) * remaining);
    const boundary = { text: sentence, start: Number(cursor.toFixed(3)), duration: Number(duration.toFixed(3)) };
    cursor += duration;
    return boundary;
  });
}

function readBoundaries(metadata, answer, durationSeconds) {
  const sourceSentences = splitSentences(answer);
  const raw = (metadata?.Metadata ?? []).filter((item) => item.Type === "SentenceBoundary");
  if (!raw.length) return estimatedBoundaries(answer, durationSeconds);
  return raw.map((item, index) => ({
    text: sourceSentences[index] ?? item.Data?.text?.Text ?? "",
    start: Number(((item.Data?.Offset ?? 0) / 10_000_000).toFixed(3)),
    duration: Number(((item.Data?.Duration ?? 0) / 10_000_000).toFixed(3)),
  })).filter((item) => item.text);
}

async function writeManifest() {
  const tracks = cues.map((cue) => completed.get(cue.id)).filter(Boolean);
  const manifest = {
    version: 1,
    generatedAt: new Date().toISOString(),
    voice,
    voiceRate,
    trackCount: tracks.length,
    totalDurationSeconds: Number(tracks.reduce((sum, track) => sum + track.duration, 0).toFixed(3)),
    tracks,
  };
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

let manifestWriteQueue = Promise.resolve();
function queueManifestWrite() {
  manifestWriteQueue = manifestWriteQueue.then(writeManifest);
  return manifestWriteQueue;
}

async function generateCue(cue, index) {
  const filename = `${cue.id}.mp3`;
  const destination = resolve(outputDir, filename);
  const existing = completed.get(cue.id);
  let existingFile = false;
  try {
    existingFile = (await stat(destination)).size > 5_000;
  } catch {
    existingFile = false;
  }

  if (existingFile && existing?.sentences?.length && (!force || index + 1 < regenerateFrom)) {
    process.stdout.write(`[${String(index + 1).padStart(2, "0")}/${cues.length}] kept ${filename}\n`);
    return;
  }

  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const tts = new MsEdgeTTS();
    const temporaryDirectory = resolve(outputDir, `.generate-${cue.id}-${attempt}`);
    try {
      await rm(temporaryDirectory, { recursive: true, force: true });
      await mkdir(temporaryDirectory, { recursive: true });
      await tts.setMetadata(
        voice,
        OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3,
        { sentenceBoundaryEnabled: true },
      );
      const { audioFilePath, metadataFilePath } = await tts.toFile(
        temporaryDirectory,
        escapeXml(cue.answer),
        { rate: voiceRate, pitch: "-2Hz", volume: "+0%" },
      );
      await rm(destination, { force: true });
      await rename(audioFilePath, destination);
      const metadata = metadataFilePath
        ? JSON.parse(await readFile(metadataFilePath, "utf8"))
        : null;
      if (metadataFilePath) await rm(metadataFilePath, { force: true });
      const file = await stat(destination);
      const duration = Number(((file.size * 8) / 96_000).toFixed(3));
      completed.set(cue.id, {
        id: cue.id,
        topic: cue.topic,
        prompt: cue.prompt,
        src: `/audio/part2/${filename}`,
        filename,
        words: cue.answer.trim().split(/\s+/).length,
        bytes: file.size,
        duration,
        sentences: readBoundaries(metadata, cue.answer, duration),
      });
      await queueManifestWrite();
      process.stdout.write(`[${String(index + 1).padStart(2, "0")}/${cues.length}] generated ${filename}\n`);
      lastError = undefined;
      break;
    } catch (error) {
      lastError = error;
      process.stderr.write(`[${cue.id}] attempt ${attempt} failed: ${error.message}\n`);
      if (attempt < 3) await new Promise((resolveDelay) => setTimeout(resolveDelay, 1500 * attempt));
    } finally {
      tts.close();
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  }
  if (lastError) throw lastError;
}

let nextCueIndex = 0;
async function worker() {
  while (nextCueIndex < cues.length) {
    const index = nextCueIndex;
    nextCueIndex += 1;
    await generateCue(cues[index], index);
  }
}

await Promise.all(Array.from({ length: concurrency }, worker));
await manifestWriteQueue;

await writeManifest();
const total = [...completed.values()].reduce((sum, track) => sum + track.duration, 0);
process.stdout.write(`ready: ${completed.size} MP3 files · ${(total / 60).toFixed(1)} minutes\n`);
