// 单词发音：预生成男声美音 mp3 → 词典真人美音录音 → 浏览器语音兜底
let manifestPromise: Promise<Record<string, string> | null> | null = null;

export function loadWordAudioManifest(): Promise<Record<string, string> | null> {
  if (!manifestPromise) {
    manifestPromise = fetch("/audio/words/manifest.json", { cache: "force-cache" })
      .then((response) => (response.ok ? response.json() : null))
      .catch(() => null);
  }
  return manifestPromise;
}

// 与生成脚本一致：小写 + 去撇
export function wordAudioKey(word: string): string {
  return word.toLowerCase().replace(/[’']/g, "");
}

export async function wordAudioUrl(word: string): Promise<string | null> {
  const manifest = await loadWordAudioManifest();
  return manifest?.[wordAudioKey(word)] ?? null;
}

// 词典真人录音缓存（避免重复请求）
const dictionaryAudioCache = new Map<string, string | null>();

function pickAmericanAudio(phonetics: Array<{ audio?: string }>): string | null {
  const urls = phonetics.map((item) => item.audio).filter((audio): audio is string => Boolean(audio));
  // 优先美音（-us 或 /us 标记），其次任意可用音频
  const american = urls.find((url) => /-us\.|_us\.|\/us\.|en-us/i.test(url));
  return american ?? urls[0] ?? null;
}

/**
 * 尝试获取一个可播放的发音 URL：
 * 1. 本地预生成的男声美音 mp3
 * 2. dictionaryapi.dev 真人录音（美音优先）
 */
export async function resolveWordAudioUrl(word: string): Promise<string | null> {
  const local = await wordAudioUrl(word);
  if (local) return local;
  const key = wordAudioKey(word);
  if (dictionaryAudioCache.has(key)) return dictionaryAudioCache.get(key) ?? null;
  try {
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(key)}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      dictionaryAudioCache.set(key, null);
      return null;
    }
    const data = (await response.json()) as Array<{ phonetics?: Array<{ audio?: string }> }>;
    const audio = pickAmericanAudio(data[0]?.phonetics ?? []);
    dictionaryAudioCache.set(key, audio);
    return audio;
  } catch {
    dictionaryAudioCache.set(key, null);
    return null;
  }
}

/**
 * 尝试播放单词发音（优先预生成男声 mp3，其次词典真人录音）。
 * @returns 播放成功的 audio 实例；无可用音频返回 null（调用方应兜底到浏览器语音）
 */
export async function playWordAudio(
  word: string,
  handlers: { onStart?: () => void; onEnd?: () => void } = {},
): Promise<HTMLAudioElement | null> {
  const url = await resolveWordAudioUrl(word);
  if (!url) return null;
  try {
    const audio = new Audio(url);
    audio.preload = "auto";
    audio.onplay = () => handlers.onStart?.();
    audio.onended = () => handlers.onEnd?.();
    audio.onerror = () => handlers.onEnd?.();
    await audio.play();
    return audio;
  } catch {
    return null;
  }
}
