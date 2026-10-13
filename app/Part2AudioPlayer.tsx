"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PART2_CUES } from "./speaking-bank";
import { SPEAKING_TRANSLATIONS } from "./speaking-translations";

type TimedSentence = { text: string; start: number; duration: number };
type ManifestTrack = {
  id: string;
  topic: string;
  prompt: string;
  src: string;
  filename: string;
  words: number;
  bytes: number;
  duration: number;
  sentences: TimedSentence[];
};
type AudioManifest = {
  trackCount: number;
  totalDurationSeconds: number;
  voice: string;
  tracks: ManifestTrack[];
};

const PLAYER_STATE_KEY = "ielts-part2-mp3-player:v1";
const SPEEDS = [0.75, 0.9, 1, 1.1, 1.25];

function readPlayerState() {
  const initial = {
    trackIndex: 0,
    speed: 1,
    volume: 0.9,
    savedPosition: null as { trackId: string; time: number } | null,
  };
  if (typeof window === "undefined") return initial;
  try {
    const saved = JSON.parse(window.localStorage.getItem(PLAYER_STATE_KEY) ?? "null");
    if (saved?.trackId) {
      const savedIndex = PART2_CUES.findIndex((cue) => cue.id === saved.trackId);
      if (savedIndex >= 0) initial.trackIndex = savedIndex;
      if (typeof saved.time === "number") initial.savedPosition = { trackId: saved.trackId, time: saved.time };
    }
    if (SPEEDS.includes(saved?.speed)) initial.speed = saved.speed;
    if (typeof saved?.volume === "number") initial.volume = Math.min(1, Math.max(0, saved.volume));
  } catch {
    // A fresh player state is fine when local storage is unavailable.
  }
  return initial;
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "00:00";
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

function splitSentences(text: string) {
  return text.match(/[^.!?]+[.!?]+(?:[”’\"])?|[^.!?]+$/g)?.map((item) => item.trim()).filter(Boolean) ?? [text];
}

export function Part2AudioPlayer() {
  const [initialPlayerState] = useState(readPlayerState);
  const audioRef = useRef<HTMLAudioElement>(null);
  const pendingPlayRef = useRef(false);
  const savedPositionRef = useRef<{ trackId: string; time: number } | null>(initialPlayerState.savedPosition);
  const lastSavedSecond = useRef(-1);
  const [manifest, setManifest] = useState<AudioManifest | null>(null);
  const [trackIndex, setTrackIndex] = useState(initialPlayerState.trackIndex);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(initialPlayerState.speed);
  const [volume, setVolume] = useState(initialPlayerState.volume);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [repeatOne, setRepeatOne] = useState(false);
  const [query, setQuery] = useState("");
  const [showChinese, setShowChinese] = useState(true);
  const [status, setStatus] = useState("正在读取 MP3 资料库…");
  const [offlineCount, setOfflineCount] = useState<number | null>(null);
  const [offlineBusy, setOfflineBusy] = useState(false);
  const [offlineProgress, setOfflineProgress] = useState<{ done: number; total: number } | null>(null);

  const tracks = useMemo(() => PART2_CUES.map((cue) => {
    const generated = manifest?.tracks.find((track) => track.id === cue.id);
    return {
      ...cue,
      translation: SPEAKING_TRANSLATIONS[cue.id] ?? "",
      src: generated?.src ?? `/audio/part2/${cue.id}.mp3`,
      duration: generated?.duration ?? 0,
      words: generated?.words ?? cue.answer.trim().split(/\s+/).length,
      sentences: generated?.sentences ?? splitSentences(cue.answer).map((text) => ({ text, start: -1, duration: 0 })),
    };
  }), [manifest]);
  const track = tracks[trackIndex] ?? tracks[0];
  const filteredTracks = tracks.filter((item) => `${item.id} ${item.topic} ${item.prompt}`.toLowerCase().includes(query.trim().toLowerCase()));
  const activeSentence = track.sentences.findIndex((sentence, index) => {
    if (sentence.start < 0) return false;
    const next = track.sentences[index + 1];
    return currentTime >= sentence.start && currentTime < (next?.start ?? sentence.start + sentence.duration + 0.35);
  });

  useEffect(() => {
    let active = true;
    fetch("/audio/part2/manifest.json", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("MP3 资料库尚未生成");
        return response.json() as Promise<AudioManifest>;
      })
      .then((data) => {
        if (!active) return;
        setManifest(data);
        setStatus(`${data.trackCount} 篇范文 MP3 已就绪`);
      })
      .catch(() => active && setStatus("MP3 资料库暂时不可用"));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, button, a")) return;
      const audio = audioRef.current;
      if (!audio) return;
      if (event.code === "Space") {
        event.preventDefault();
        if (audio.paused) void audio.play(); else audio.pause();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        audio.currentTime = Math.max(0, audio.currentTime - 5);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        audio.currentTime = Math.min(audio.duration || duration, audio.currentTime + 5);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [duration]);

  const savePosition = (time: number) => {
    try {
      window.localStorage.setItem(PLAYER_STATE_KEY, JSON.stringify({ trackId: track.id, time, speed, volume }));
    } catch {
      // Playback continues even when persistence is disabled.
    }
  };

  const chooseTrack = (nextIndex: number, forcePlay = isPlaying) => {
    const normalizedIndex = (nextIndex + tracks.length) % tracks.length;
    pendingPlayRef.current = forcePlay;
    setCurrentTime(0);
    setDuration(tracks[normalizedIndex]?.duration ?? 0);
    setIsPlaying(false);
    setTrackIndex(normalizedIndex);
  };

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      try {
        await audio.play();
        setStatus(`${track.id.toUpperCase()} · 正在播放`);
      } catch {
        setStatus("浏览器阻止了播放，请再次点击播放键");
      }
    } else {
      audio.pause();
    }
  };

  const handleEnded = () => {
    savePosition(0);
    if (repeatOne) {
      const audio = audioRef.current;
      if (audio) { audio.currentTime = 0; void audio.play(); }
    } else if (autoAdvance) {
      chooseTrack(trackIndex + 1, true);
    } else {
      setIsPlaying(false);
    }
  };

  const totalMinutes = manifest ? Math.round(manifest.totalDurationSeconds / 60) : 0;
  const progress = duration ? Math.min(100, (currentTime / duration) * 100) : 0;

  useEffect(() => {
    if (typeof caches === "undefined") return;
    caches.open("ielts-audio-v1")
      .then((cache) => cache.keys())
      .then((keys) => setOfflineCount(keys.length))
      .catch(() => {});
  }, [manifest]);

  const cacheAllAudio = async () => {
    if (typeof caches === "undefined") {
      setStatus("离线缓存需要 HTTPS 环境（部署后或本机 localhost 可用）");
      return;
    }
    const urls = tracks.map((item) => item.src);
    const cache = await caches.open("ielts-audio-v1");
    let done = 0;
    setOfflineBusy(true);
    setOfflineProgress({ done: 0, total: urls.length });
    setStatus(`正在缓存音频 ${0}/${urls.length}…请保持页面打开`);
    for (const url of urls) {
      try {
        const response = await fetch(url, { cache: "force-cache" });
        if (response.ok) await cache.put(url, response.clone());
      } catch {
        // 单条失败不中断，继续下载其余音频
      }
      done += 1;
      if (done % 10 === 0 || done === urls.length) setOfflineProgress({ done, total: urls.length });
    }
    const keys = await cache.keys();
    setOfflineCount(keys.length);
    setOfflineBusy(false);
    setStatus(keys.length === urls.length
      ? `已离线缓存全部 ${keys.length} 篇音频，可完全离线学习`
      : `已离线缓存 ${keys.length}/${urls.length} 篇音频（可在有网时重试）`);
  };

  return (
    <div className="page part2-audio-page">
      <header className="audio-page-header">
        <div><span className="eyebrow coral">PART 2 · MP3 MODEL ANSWERS</span><h1>把 {tracks.length} 篇范文，变成你的背景输入。</h1><p>看英文、对照中文、跟着美式男声逐句听。电脑开着时，让高频表达自然进入耳朵。</p></div>
        <div className="audio-library-stat"><strong>{tracks.length}</strong><span>篇范文</span><small>{totalMinutes ? `约 ${totalMinutes} 分钟` : "完整音频库"}</small></div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center" }}>
          <button type="button" disabled={offlineBusy} onClick={() => void cacheAllAudio()} style={{ border: "1px solid rgba(255,255,255,.35)", background: offlineBusy ? "rgba(255,255,255,.12)" : "rgba(255,255,255,.06)", color: "#fff", padding: "8px 14px", borderRadius: 10, cursor: "pointer", fontSize: 13 }}>
            {offlineBusy ? `正在缓存 ${offlineProgress?.done ?? 0}/${offlineProgress?.total ?? 0}…` : "⬇ 下载全部音频（离线可用）"}
          </button>
          {offlineCount !== null && (
            <small style={{ color: "rgba(255,255,255,.65)", fontSize: 12 }}>
              {offlineCount === tracks.length ? "✓ 已全部离线，随时可学" : `已离线 ${offlineCount}/${tracks.length} 篇`}
            </small>
          )}
        </div>
      </header>

      <div className="audio-player-shell">
        <aside className="audio-playlist-panel">
          <div className="audio-list-head"><div><span>LIBRARY</span><strong>Part 2 播放列表</strong></div><button type="button" onClick={() => chooseTrack(Math.floor(Math.random() * tracks.length), true)}>随机播放</button></div>
          <label className="audio-search"><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索话题或题目…" aria-label="搜索 Part 2 范文" /></label>
          <div className="audio-track-list" role="list" aria-label="Part 2 MP3 列表">
            {filteredTracks.map((item) => {
              const index = tracks.findIndex((trackItem) => trackItem.id === item.id);
              const active = index === trackIndex;
              return <button type="button" role="listitem" key={item.id} className={active ? "audio-track active" : "audio-track"} onClick={() => { if (active) void togglePlay(); else chooseTrack(index, true); }}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{item.topic}</strong><small>{item.prompt}</small></div><time>{formatTime(item.duration)}</time>{active && <i aria-hidden="true"><b /><b /><b /></i>}</button>;
            })}
            {!filteredTracks.length && <div className="audio-empty-search">没有找到匹配的范文。</div>}
          </div>
        </aside>

        <main className="audio-reading-stage">
          <section className="audio-now-playing">
            <div className="audio-track-number"><span>TRACK</span><strong>{String(trackIndex + 1).padStart(2, "0")}</strong><small>/ {tracks.length}</small></div>
            <div className="audio-title"><span>{track.id.toUpperCase()} · {track.words} WORDS</span><h2>{track.topic}</h2><p>{track.prompt}</p></div>
            <a className="audio-download" href={track.src} download={`${track.id}-${track.topic}.mp3`}>↓ 下载本篇 MP3</a>
          </section>

          <section className={showChinese ? "audio-transcript-grid" : "audio-transcript-grid english-only"}>
            <article className="audio-english-copy">
              <header><span>ENGLISH TRANSCRIPT</span><strong>跟随高亮句子听读</strong></header>
              <div>{track.sentences.map((sentence, index) => <p key={`${track.id}:${index}`} className={activeSentence === index ? "active" : ""} onClick={() => { const audio = audioRef.current; if (audio && sentence.start >= 0) { audio.currentTime = sentence.start; setCurrentTime(sentence.start); } }}>{sentence.text}</p>)}</div>
            </article>
            {showChinese && <aside className="audio-chinese-copy"><header><span>中文理解</span><button type="button" onClick={() => setShowChinese(false)}>隐藏</button></header><p>{track.translation}</p><div className="audio-study-note"><b>听读建议</b><span>第一遍看中文理解；第二遍只看英文；第三遍关掉文字跟读。</span></div></aside>}
            {!showChinese && <button className="show-translation" type="button" onClick={() => setShowChinese(true)}>显示中文理解</button>}
          </section>

          <section className="audio-control-deck" aria-label="MP3 播放控制">
            <audio
              ref={audioRef}
              src={track.src}
              preload="metadata"
              onLoadedMetadata={(event) => {
                const audio = event.currentTarget;
                audio.playbackRate = speed;
                audio.volume = volume;
                setDuration(audio.duration || track.duration);
                const saved = savedPositionRef.current;
                if (saved?.trackId === track.id && saved.time > 0 && saved.time < audio.duration - 2) {
                  audio.currentTime = saved.time;
                  setCurrentTime(saved.time);
                  savedPositionRef.current = null;
                }
                if (pendingPlayRef.current) { pendingPlayRef.current = false; void audio.play(); }
              }}
              onTimeUpdate={(event) => {
                const time = event.currentTarget.currentTime;
                setCurrentTime(time);
                const second = Math.floor(time);
                if (second > 0 && second % 5 === 0 && second !== lastSavedSecond.current) { lastSavedSecond.current = second; savePosition(time); }
              }}
              onPlay={() => setIsPlaying(true)}
              onPause={(event) => { setIsPlaying(false); savePosition(event.currentTarget.currentTime); }}
              onEnded={handleEnded}
              onError={() => setStatus("这篇 MP3 无法读取，请重新生成音频库")}
            />
            <div className="audio-progress-row"><time>{formatTime(currentTime)}</time><input aria-label="播放进度" type="range" min="0" max={duration || 1} step="0.1" value={Math.min(currentTime, duration || 1)} style={{ background: `linear-gradient(90deg, var(--coral) ${progress}%, rgba(255,255,255,.18) ${progress}%)` }} onChange={(event) => { const time = Number(event.target.value); if (audioRef.current) audioRef.current.currentTime = time; setCurrentTime(time); }} /><time>-{formatTime(Math.max(0, duration - currentTime))}</time></div>
            <div className="audio-main-controls">
              <button type="button" onClick={() => chooseTrack(trackIndex - 1)} aria-label="上一篇">↤</button>
              <button type="button" onClick={() => { if (audioRef.current) audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10); }} aria-label="后退十秒">↺<small>10</small></button>
              <button type="button" className="audio-play-primary" onClick={togglePlay} aria-label={isPlaying ? "暂停" : "播放"}>{isPlaying ? "Ⅱ" : "▶"}</button>
              <button type="button" onClick={() => { if (audioRef.current) audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + 10); }} aria-label="前进十秒"><small>10</small>↻</button>
              <button type="button" onClick={() => chooseTrack(trackIndex + 1)} aria-label="下一篇">↦</button>
            </div>
            <div className="audio-secondary-controls">
              <div className="audio-speed" aria-label="播放速度">{SPEEDS.map((item) => <button type="button" key={item} className={speed === item ? "active" : ""} onClick={() => { setSpeed(item); if (audioRef.current) audioRef.current.playbackRate = item; }}>{item}×</button>)}</div>
              <button type="button" className={autoAdvance ? "active" : ""} aria-pressed={autoAdvance} onClick={() => setAutoAdvance((value) => !value)}>连续播放</button>
              <button type="button" className={repeatOne ? "active" : ""} aria-pressed={repeatOne} onClick={() => setRepeatOne((value) => !value)}>单曲循环</button>
              <label className="audio-volume"><span>音量</span><input aria-label="音量" type="range" min="0" max="1" step="0.05" value={volume} onChange={(event) => { const next = Number(event.target.value); setVolume(next); if (audioRef.current) audioRef.current.volume = next; }} /></label>
            </div>
            <footer><span className={manifest ? "ready" : ""}>{status}</span><small>快捷键：空格播放 / 暂停 · ← → 前后 5 秒</small></footer>
          </section>
        </main>
      </div>
    </div>
  );
}
