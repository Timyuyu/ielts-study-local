import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import edgeTts from "msedge-tts";

const { MsEdgeTTS, OUTPUT_FORMAT } = edgeTts;

const ROOT = resolve(process.cwd());
const outputDir = resolve(ROOT, "public", "audio", "words");
const manifestPath = resolve(outputDir, "manifest.json");
const wordsFile = process.argv[2];
const force = process.argv.includes("--force");
const voice = "en-US-AndrewMultilingualNeural";
const voiceRate = "0%";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 自适应间隔：成功加速、失败降速，逼近限流阈值
let interval = 700;
const MIN_INTERVAL = 450;
const MAX_INTERVAL = 3200;
let consecutiveFails = 0;

async function main() {
  const raw = await readFile(wordsFile, "utf8");
  const entries = raw.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
    const [norm, orig] = line.split("\t");
    return { norm, text: orig || norm };
  });
  console.log(`words to synthesize: ${entries.length}`);

  await mkdir(outputDir, { recursive: true });
  const manifest = {};
  let done = 0;
  let failed = 0;

  for (const { norm, text } of entries) {
    const filename = `${norm}.mp3`;
    const destination = resolve(outputDir, filename);
    try {
      const existing = await stat(destination);
      if (existing.size > 500 && !force) {
        done += 1;
        manifest[norm] = `/audio/words/${filename}`;
        if (done % 100 === 0) console.log(`[${done}/${entries.length}] (kept) interval=${interval}ms`);
        continue;
      }
    } catch {}

    let ok = false;
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const tts = new MsEdgeTTS();
      const tmpDir = resolve(outputDir, `.tmp-${filename}-${attempt}`);
      try {
        await rm(tmpDir, { recursive: true, force: true });
        await mkdir(tmpDir, { recursive: true });
        await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3, {});
        const { audioFilePath } = await tts.toFile(tmpDir, text, { rate: voiceRate, pitch: "+0Hz", volume: "+0%" });
        await rm(destination, { force: true });
        await rename(audioFilePath, destination);
        manifest[norm] = `/audio/words/${filename}`;
        done += 1;
        ok = true;
        consecutiveFails = 0;
        interval = Math.max(MIN_INTERVAL, Math.round(interval * 0.9));
        if (done % 100 === 0) console.log(`[${done}/${entries.length}] generated interval=${interval}ms`);
        break;
      } catch {
        await sleep(300 * attempt);
      } finally {
        await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
      }
    }
    if (!ok) {
      failed += 1;
      consecutiveFails += 1;
      interval = Math.min(MAX_INTERVAL, Math.round(interval * 1.6));
      if (consecutiveFails >= 5) {
        // 连续失败：限流严重，等待 10 分钟恢复窗口
        console.log(`rate-limited (${failed} fails so far), waiting 10min...`);
        await sleep(600_000);
        consecutiveFails = 0;
      }
    }
    await sleep(interval);
  }

  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`done: ${done} kept/generated, ${failed} failed · manifest: ${Object.keys(manifest).length} words`);
}

main().catch((error) => { console.error(error); process.exit(1); });
