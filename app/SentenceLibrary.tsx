"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  scoreSentenceDictation,
  type PhraseProgress,
  type SavedSentence,
  type SentenceDictationScore,
} from "./study";

type LibraryMode = "overview" | "recall";
type MasteryFilter = "all" | "unstarted" | "learning" | "mastered";
type ReaderFont = "small" | "medium" | "large";
type ReaderDensity = "compact" | "comfortable";

interface PhraseCategory {
  id: string;
  pattern: string;
  meaning: string;
  start: number;
  count: number;
}

interface PhraseSentence {
  id: number;
  english: string;
  chinese: string;
  categoryId: string;
  pattern: string;
  meaning: string;
}

interface LibraryData {
  sentences: PhraseSentence[];
  categories: PhraseCategory[];
}

interface SentenceLibraryProps {
  progress: Record<string, PhraseProgress>;
  initialPosition: number;
  savedSentences: SavedSentence[];
  onUpdateProgress: (id: number, status: PhraseProgress["status"]) => void;
  onUpdatePosition: (id: number) => void;
  onSaveSentence: (sentence: SavedSentence) => void;
  onSpeak: (text: string, rate?: number) => void;
}

const EMPTY_LIBRARY: LibraryData = { sentences: [], categories: [] };
const READER_SETTINGS_KEY = "ielts-route:phrase-reader-settings";
const READER_POSITION_KEY = "ielts-route:phrase-reader-position";
const READER_DONE_KEY = "ielts-route:phrase-reader-done";
const DEFAULT_SCROLL_SPEED = 18;
const MIN_SCROLL_SPEED = 8;
const MAX_SCROLL_SPEED = 32;

function defaultCategory(number: number) {
  if (number <= 10) return { pattern: "I'm on...", meaning: "我正在 / 处于……" };
  if (number <= 20) return { pattern: "I'm at...", meaning: "我在……" };
  return { pattern: "I'm here to...", meaning: "我是来……的" };
}

function parseLibrary(source: string): LibraryData {
  const sentences: PhraseSentence[] = [];
  let currentPattern = "";
  let currentMeaning = "";

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || /^[-=]+$/.test(line)) continue;

    const heading = line.match(/^"(.+?)"\s*\((.+)\)\s*$/);
    if (heading) {
      currentPattern = heading[1].trim();
      currentMeaning = heading[2].replace(/\s+/g, "").trim();
      continue;
    }

    const numbered = line.match(/^(\d+)\s*\.\s*(.+)$/);
    if (!numbered) continue;
    const id = Number(numbered[1]);
    const body = numbered[2].trim();
    const chineseIndex = body.search(/[\u3400-\u9fff]/);
    if (chineseIndex < 0) continue;
    const inferred = defaultCategory(id);
    const pattern = id <= 30 ? inferred.pattern : currentPattern || inferred.pattern;
    const meaning = id <= 30 ? inferred.meaning : currentMeaning || inferred.meaning;
    sentences.push({
      id,
      english: body.slice(0, chineseIndex).trim(),
      chinese: body.slice(chineseIndex).replace(/\s+/g, "").trim(),
      categoryId: `pattern-${Math.floor((id - 1) / 10) + 1}`,
      pattern,
      meaning,
    });
  }

  const categories: PhraseCategory[] = [];
  for (const sentence of sentences) {
    const existing = categories.at(-1);
    if (existing?.id === sentence.categoryId) {
      existing.count += 1;
    } else {
      categories.push({
        id: sentence.categoryId,
        pattern: sentence.pattern,
        meaning: sentence.meaning,
        start: sentence.id,
        count: 1,
      });
    }
  }
  return { sentences, categories };
}

function normalizeSentence(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[‘’]/g, "'")
    .toLowerCase()
    .replace(/[^a-z0-9']+/g, " ")
    .trim();
}

function localDayKey() {
  const date = new Date();
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((value, index) => index === 0 ? String(value) : String(value).padStart(2, "0"))
    .join("-");
}

function readInitialReaderState(initialPosition: number) {
  const initial = {
    showChinese: true,
    readerFont: "medium" as ReaderFont,
    readerDensity: "compact" as ReaderDensity,
    scrollSpeed: DEFAULT_SCROLL_SPEED,
    lastRead: Math.min(Math.max(initialPosition || 1, 1), 990),
    readDoneToday: false,
  };
  if (typeof window === "undefined") return initial;
  try {
    const savedSettings = JSON.parse(window.localStorage.getItem(READER_SETTINGS_KEY) ?? "{}") as {
      showChinese?: boolean;
      readerFont?: ReaderFont;
      readerDensity?: ReaderDensity;
      scrollSpeed?: number;
    };
    if (typeof savedSettings.showChinese === "boolean") initial.showChinese = savedSettings.showChinese;
    if (["small", "medium", "large"].includes(savedSettings.readerFont ?? "")) initial.readerFont = savedSettings.readerFont!;
    if (["compact", "comfortable"].includes(savedSettings.readerDensity ?? "")) initial.readerDensity = savedSettings.readerDensity!;
    if (typeof savedSettings.scrollSpeed === "number") {
      initial.scrollSpeed = Math.min(Math.max(Math.round(savedSettings.scrollSpeed), MIN_SCROLL_SPEED), MAX_SCROLL_SPEED);
    }
    const savedPosition = initialPosition > 1
      ? initialPosition
      : Number(window.localStorage.getItem(READER_POSITION_KEY));
    if (Number.isInteger(savedPosition) && savedPosition >= 1 && savedPosition <= 990) initial.lastRead = savedPosition;
    initial.readDoneToday = window.localStorage.getItem(READER_DONE_KEY) === localDayKey();
  } catch {
    // Reading still works with defaults when browser storage is unavailable.
  }
  return initial;
}

function StatusPill({ status }: { status?: PhraseProgress["status"] }) {
  return status === "mastered"
    ? <span className="phrase-status mastered">已掌握</span>
    : status === "learning"
      ? <span className="phrase-status learning">需复习</span>
      : <span className="phrase-status">未学习</span>;
}

export function SentenceLibrary({
  progress,
  initialPosition,
  savedSentences,
  onUpdateProgress,
  onUpdatePosition,
  onSaveSentence,
  onSpeak,
}: SentenceLibraryProps) {
  const [initialReaderState] = useState(() => readInitialReaderState(initialPosition));
  const [library, setLibrary] = useState<LibraryData>(EMPTY_LIBRARY);
  const [loadError, setLoadError] = useState(false);
  const [mode, setMode] = useState<LibraryMode>("overview");
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [masteryFilter, setMasteryFilter] = useState<MasteryFilter>("all");
  const [showChinese, setShowChinese] = useState(initialReaderState.showChinese);
  const [readerFont, setReaderFont] = useState<ReaderFont>(initialReaderState.readerFont);
  const [readerDensity, setReaderDensity] = useState<ReaderDensity>(initialReaderState.readerDensity);
  const [readingFocus, setReadingFocus] = useState(false);
  const [autoScroll, setAutoScroll] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(initialReaderState.scrollSpeed);
  const [lastRead, setLastRead] = useState(initialReaderState.lastRead);
  const [positionRestored, setPositionRestored] = useState(false);
  const [jumpValue, setJumpValue] = useState("");
  const [readDoneToday, setReadDoneToday] = useState(initialReaderState.readDoneToday);
  const [recallIndex, setRecallIndex] = useState(0);
  const [recallInput, setRecallInput] = useState("");
  const [recallFeedback, setRecallFeedback] = useState<SentenceDictationScore | null>(null);
  const [recallRevealed, setRecallRevealed] = useState(false);
  const [recallPrompt, setRecallPrompt] = useState<PhraseSentence | null>(null);
  const lastReadRef = useRef(initialReaderState.lastRead);
  const positionRestoreTimer = useRef<number | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/speaking-1000.txt")
      .then((response) => {
        if (!response.ok) throw new Error("无法读取句库");
        return response.text();
      })
      .then((source) => {
        if (active) setLibrary(parseLibrary(source));
      })
      .catch(() => {
        if (active) setLoadError(true);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(READER_SETTINGS_KEY, JSON.stringify({ showChinese, readerFont, readerDensity, scrollSpeed }));
    } catch {
      // Preferences remain active for the current session.
    }
  }, [readerDensity, readerFont, scrollSpeed, showChinese]);

  useEffect(() => {
    lastReadRef.current = lastRead;
    try {
      window.localStorage.setItem(READER_POSITION_KEY, String(lastRead));
    } catch {
      // The current reading position remains visible in this session.
    }
    onUpdatePosition(lastRead);
  }, [lastRead, onUpdatePosition]);

  useEffect(() => {
    const savePosition = () => {
      try {
        window.localStorage.setItem(READER_POSITION_KEY, String(lastReadRef.current));
      } catch {
        // The latest in-memory position is still kept until the page closes.
      }
    };
    window.addEventListener("pagehide", savePosition);
    return () => window.removeEventListener("pagehide", savePosition);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("phrase-reading-focus", readingFocus);
    return () => document.documentElement.classList.remove("phrase-reading-focus");
  }, [readingFocus]);

  useEffect(() => {
    if (!autoScroll || mode !== "overview") return;
    let frame = 0;
    let previousTime: number | null = null;
    let targetY = window.scrollY;
    const move = (time: number) => {
      if (previousTime === null) previousTime = time;
      const elapsed = Math.min(time - previousTime, 50);
      previousTime = time;
      if (Math.abs(window.scrollY - targetY) > 3) targetY = window.scrollY;
      targetY += (scrollSpeed * elapsed) / 1000;
      window.scrollTo({ top: targetY, behavior: "auto" });
      const pageBottom = document.documentElement.scrollHeight - 2;
      if (window.scrollY + window.innerHeight >= pageBottom) {
        setAutoScroll(false);
        return;
      }
      frame = window.requestAnimationFrame(move);
    };
    frame = window.requestAnimationFrame(move);
    return () => window.cancelAnimationFrame(frame);
  }, [autoScroll, mode, scrollSpeed]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return library.sentences.filter((sentence) => {
      const status = progress[sentence.id]?.status;
      const matchesQuery = !normalizedQuery ||
        sentence.english.toLowerCase().includes(normalizedQuery) ||
        sentence.chinese.includes(query.trim()) ||
        sentence.pattern.toLowerCase().includes(normalizedQuery);
      const matchesCategory = categoryId === "all" || sentence.categoryId === categoryId;
      const matchesMastery = masteryFilter === "all" ||
        (masteryFilter === "unstarted" && !status) || status === masteryFilter;
      return matchesQuery && matchesCategory && matchesMastery;
    });
  }, [categoryId, library.sentences, masteryFilter, progress, query]);

  const filteredGroups = useMemo(() => library.categories
    .map((category) => ({
      category,
      sentences: filtered.filter((sentence) => sentence.categoryId === category.id),
    }))
    .filter((group) => group.sentences.length > 0), [filtered, library.categories]);

  useEffect(() => {
    if (mode !== "overview" || !filtered.length || !positionRestored) return;
    const rows = Array.from(document.querySelectorAll<HTMLElement>(".phrase-overview-row"));
    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((left, right) => left.boundingClientRect.top - right.boundingClientRect.top)[0];
      if (!visible) return;
      const id = Number((visible.target as HTMLElement).dataset.sentenceId);
      if (Number.isInteger(id)) {
        lastReadRef.current = id;
        setLastRead(id);
      }
    }, { rootMargin: "-18% 0px -72% 0px", threshold: 0 });
    rows.forEach((row) => observer.observe(row));
    return () => observer.disconnect();
  }, [categoryId, filtered.length, library.sentences.length, masteryFilter, mode, positionRestored, query]);

  useEffect(() => {
    if (!library.sentences.length || positionRestored) return;
    const savedPosition = lastReadRef.current;
    positionRestoreTimer.current = window.setTimeout(() => {
      document.getElementById(`phrase-sentence-${savedPosition}`)?.scrollIntoView({
        behavior: "auto",
        block: "center",
      });
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => setPositionRestored(true)));
    }, savedPosition > 1 ? 80 : 0);
    return () => {
      if (positionRestoreTimer.current) window.clearTimeout(positionRestoreTimer.current);
    };
  }, [library.sentences.length, positionRestored]);

  const masteredCount = Object.values(progress).filter((item) => item.status === "mastered").length;
  const difficultSentences = useMemo(
    () => library.sentences.filter((sentence) => progress[sentence.id]?.status === "learning"),
    [library.sentences, progress],
  );
  const recallSentences = difficultSentences.length ? difficultSentences : library.sentences;
  const queuedRecall = recallSentences[recallIndex % Math.max(1, recallSentences.length)];
  const currentRecall = recallPrompt ?? queuedRecall;
  const savedSet = useMemo(
    () => new Set(savedSentences.map((sentence) => normalizeSentence(sentence.english))),
    [savedSentences],
  );

  const saveSentence = (sentence: PhraseSentence) => onSaveSentence({
    id: `phrase-${sentence.id}`,
    english: sentence.english,
    chinese: sentence.chinese,
    topic: `口语密码 · ${sentence.pattern}`,
    part: "part1",
    sourceId: `phrase-${sentence.id}`,
    addedAt: new Date().toISOString(),
    source: "speaking",
  });

  const scrollToSentence = (rawId: number, smooth = true) => {
    const id = Math.min(Math.max(Math.round(rawId || 1), 1), library.sentences.length || 990);
    setMode("overview");
    setQuery("");
    setCategoryId("all");
    setMasteryFilter("all");
    setLastRead(id);
    window.setTimeout(() => {
      document.getElementById(`phrase-sentence-${id}`)?.scrollIntoView({
        behavior: smooth ? "smooth" : "auto",
        block: "center",
      });
    }, 30);
  };

  const checkRecall = () => {
    if (!currentRecall || !recallInput.trim()) return;
    const feedback = scoreSentenceDictation(currentRecall.english, recallInput);
    setRecallPrompt(currentRecall);
    setRecallFeedback(feedback);
    if (feedback.accuracy === 100) onUpdateProgress(currentRecall.id, "mastered");
  };

  const nextRecall = () => {
    const masteredPrompt = recallPrompt && progress[recallPrompt.id]?.status === "mastered";
    if (masteredPrompt && difficultSentences.length) {
      setRecallIndex((current) => current % difficultSentences.length);
    } else if (masteredPrompt && recallPrompt && library.sentences.length) {
      setRecallIndex(recallPrompt.id % library.sentences.length);
    } else {
      setRecallIndex((current) => (current + 1) % Math.max(1, recallSentences.length));
    }
    setRecallInput("");
    setRecallFeedback(null);
    setRecallRevealed(false);
    setRecallPrompt(null);
  };

  const completeToday = () => {
    setReadDoneToday(true);
    setLastRead(library.sentences.length);
    try {
      window.localStorage.setItem(READER_DONE_KEY, localDayKey());
    } catch {
      // Completion remains visible in this session.
    }
  };

  const toggleAutoScroll = () => {
    if (autoScroll) {
      setAutoScroll(false);
      return;
    }
    const atBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4;
    if (atBottom) {
      return;
    }
    setAutoScroll(true);
  };

  if (loadError) {
    return <div className="page phrase-library-page"><section className="phrase-load-state"><b>句库暂时没有加载成功</b><p>请刷新页面后再试，已有学习记录不会受影响。</p></section></div>;
  }

  if (!library.sentences.length) {
    return <div className="page phrase-library-page"><section className="phrase-load-state"><span className="loader-line" /><p>正在展开全部 990 句…</p></section></div>;
  }

  return (
    <div className="page phrase-library-page">
      <section className="phrase-reader-hero">
        <div>
          <span className="eyebrow light">MORNING READ · 每日全览</span>
          <h1>起床，开口，<br />读完 990 句。</h1>
          <p>不分页、不切卡，一条长卷从 001 连续读到 990。页面会自动记住你上次停下的位置。</p>
          <div className="phrase-reader-hero-actions">
            <button className="primary" onClick={() => scrollToSentence(1)}><span>01</span> 从头开始</button>
            <button onClick={() => scrollToSentence(lastRead)}><span>↳</span> 继续上次 · {String(lastRead).padStart(3, "0")}</button>
            <button onClick={() => setReadingFocus((current) => !current)}><span>□</span> {readingFocus ? "退出专注" : "专注朗读"}</button>
          </div>
        </div>
        <aside>
          <div className="phrase-today-state" data-done={readDoneToday ? "true" : "false"}>
            <span>{readDoneToday ? "TODAY · DONE" : "TODAY · READING"}</span>
            <strong>{readDoneToday ? "已读完" : String(lastRead).padStart(3, "0")}</strong>
            <small>{readDoneToday ? "今天的开口任务完成" : `当前读到 / ${library.sentences.length}`}</small>
          </div>
          <dl>
            <div><dt>{library.sentences.length}</dt><dd>完整例句</dd></div>
            <div><dt>{library.categories.length}</dt><dd>句型段落</dd></div>
            <div><dt>{masteredCount}</dt><dd>已经掌握</dd></div>
          </dl>
        </aside>
      </section>

      {mode === "overview" ? <>
        <section className="phrase-reader-toolbar" aria-label="全览阅读设置">
          <div className="phrase-reader-search">
            <span>查找</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="英文、中文或句型…" />
          </div>
          <label>
            <span>句型</span>
            <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
              <option value="all">全部 99 组</option>
              {library.categories.map((category, index) => <option key={category.id} value={category.id}>{String(index + 1).padStart(2, "0")} · {category.pattern}</option>)}
            </select>
          </label>
          <label>
            <span>状态</span>
            <select value={masteryFilter} onChange={(event) => setMasteryFilter(event.target.value as MasteryFilter)}>
              <option value="all">全部句子</option>
              <option value="unstarted">未学习</option>
              <option value="learning">需复习</option>
              <option value="mastered">已掌握</option>
            </select>
          </label>
          <div className="phrase-reader-toggle-group" aria-label="阅读显示设置">
            <button className={showChinese ? "active" : ""} onClick={() => setShowChinese((current) => !current)}>{showChinese ? "中英对照" : "只看英文"}</button>
            <button className={readerDensity === "compact" ? "active" : ""} onClick={() => setReaderDensity((current) => current === "compact" ? "comfortable" : "compact")}>{readerDensity === "compact" ? "紧凑" : "舒展"}</button>
            <button onClick={() => setReaderFont((current) => current === "small" ? "medium" : current === "medium" ? "large" : "small")}>字号 · {readerFont === "small" ? "小" : readerFont === "medium" ? "中" : "大"}</button>
          </div>
          <form className="phrase-reader-jump" onSubmit={(event) => { event.preventDefault(); scrollToSentence(Number(jumpValue)); }}>
            <span>跳到</span>
            <input inputMode="numeric" value={jumpValue} onChange={(event) => setJumpValue(event.target.value.replace(/\D/g, "").slice(0, 3))} placeholder="句号" aria-label="输入句子编号" />
            <button type="submit">前往</button>
          </form>
          <button className="phrase-recall-entry" onClick={() => { setAutoScroll(false); setMode("recall"); }}>听写回忆 →</button>
        </section>

        <div className="phrase-overview-meta"><span>全览朗读</span><p>共显示 <b>{filtered.length}</b> 句 · 滚动时自动保存位置 · 点击句号也可手动定位</p><button onClick={() => window.print()}>打印 / 保存 PDF</button></div>

        {filteredGroups.length ? <main className="phrase-overview" data-font={readerFont} data-density={readerDensity} data-chinese={showChinese ? "shown" : "hidden"}>
          {filteredGroups.map(({ category, sentences }) => (
            <section className="phrase-overview-group" id={`phrase-group-${category.id}`} key={category.id}>
              <header>
                <span>{String(library.categories.findIndex((item) => item.id === category.id) + 1).padStart(2, "0")}</span>
                <div><h2>{category.pattern}</h2><p>{category.meaning}</p></div>
                <small>{String(category.start).padStart(3, "0")}–{String(category.start + category.count - 1).padStart(3, "0")}</small>
              </header>
              <div>
                {sentences.map((sentence) => {
                  const saved = savedSet.has(normalizeSentence(sentence.english));
                  const status = progress[sentence.id]?.status;
                  return <article className={`phrase-overview-row ${lastRead === sentence.id ? "current" : ""}`} id={`phrase-sentence-${sentence.id}`} data-sentence-id={sentence.id} key={sentence.id}>
                    <button className="phrase-overview-number" onClick={() => setLastRead(sentence.id)} title="标记读到这里">{String(sentence.id).padStart(3, "0")}</button>
                    <div className="phrase-overview-copy"><strong>{sentence.english}</strong>{showChinese && <p>{sentence.chinese}</p>}</div>
                    <div className="phrase-overview-actions">
                      <button onClick={() => onSpeak(sentence.english, 0.88)} aria-label={`播放第 ${sentence.id} 句`} title="播放美音">▶</button>
                      <button className={saved ? "saved" : ""} onClick={() => saveSentence(sentence)} aria-label={`收藏第 ${sentence.id} 句`} title={saved ? "已收藏" : "收藏到精句本"}>{saved ? "★" : "☆"}</button>
                      <button className={status ?? ""} onClick={() => onUpdateProgress(sentence.id, status === "mastered" ? "learning" : "mastered")} aria-label={`更新第 ${sentence.id} 句掌握状态`} title={status === "mastered" ? "已掌握，点击改为需复习" : "标记为已掌握"}>{status === "mastered" ? "✓" : status === "learning" ? "!" : "○"}</button>
                    </div>
                  </article>;
                })}
              </div>
            </section>
          ))}
          <section className="phrase-reader-finish">
            <span>{readDoneToday ? "✓" : "990"}</span>
            <div><small>MORNING READING</small><h2>{readDoneToday ? "今天已经完整读过一遍。" : "读到这里，今天的 990 句完成。"}</h2><p>明天再从 001 开始，让这些表达变成不需要思考的语言反应。</p></div>
            <button className={readDoneToday ? "done" : ""} onClick={completeToday}>{readDoneToday ? "今日已完成 ✓" : "完成今日朗读"}</button>
          </section>
        </main> : <div className="phrase-no-result"><strong>没有找到相关句子</strong><p>缩短关键词，或把句型和状态恢复为“全部”。</p></div>}

        <aside className="phrase-reader-dock" aria-label="当前朗读位置">
          <button className={`phrase-auto-scroll-toggle ${autoScroll ? "active" : ""}`} onClick={toggleAutoScroll} aria-pressed={autoScroll}>{autoScroll ? "Ⅱ 暂停滚动" : "▶ 自动滚动"}</button>
          <label className="phrase-auto-scroll-speed">
            <span>慢</span>
            <input type="range" min={MIN_SCROLL_SPEED} max={MAX_SCROLL_SPEED} step="1" value={scrollSpeed} onChange={(event) => setScrollSpeed(Number(event.target.value))} aria-label="调节自动滚动速度" />
            <b>约 {(readerDensity === "compact" ? 59 : 78) / scrollSpeed < 10 ? ((readerDensity === "compact" ? 59 : 78) / scrollSpeed).toFixed(1) : Math.round((readerDensity === "compact" ? 59 : 78) / scrollSpeed)} 秒/句</b>
          </label>
          <button onClick={() => scrollToSentence(lastRead)} title="回到当前句">{String(lastRead).padStart(3, "0")}<small> / {library.sentences.length}</small></button>
          <i style={{ "--reader-progress": `${Math.round((lastRead / library.sentences.length) * 100)}%` } as CSSProperties} />
          {readingFocus && <button className="phrase-focus-exit" onClick={() => setReadingFocus(false)} aria-label="退出专注朗读">退出</button>}
          <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="回到页面顶部">↑</button>
        </aside>
      </> : currentRecall && <section className="phrase-recall-layout phrase-recall-standalone">
        <aside className="phrase-recall-intro"><span className="eyebrow coral">ACTIVE RECALL</span><h2>{difficultSentences.length ? "优先重练不熟的句子" : "从完整句库开始听写"}</h2><p>看中文写英文。大小写和标点不计错，写错的词会标出来。</p><button className="phrase-back-overview" onClick={() => setMode("overview")}>← 返回全览朗读</button><div><span>本轮题量</span><strong>{recallSentences.length}</strong><small>{difficultSentences.length ? "来自「需复习」清单" : "来自全部句库"}</small></div></aside>
        <article className="phrase-recall-card">
          <header><span>{Math.min(recallIndex + 1, recallSentences.length)} / {recallSentences.length}</span><div><button onClick={() => onSpeak(currentRecall.english, 0.75)}>▶ 只听英文</button><StatusPill status={progress[currentRecall.id]?.status} /></div></header>
          <div className="phrase-recall-prompt"><small>请写出对应英文</small><h2>{currentRecall.chinese}</h2><span>{currentRecall.pattern}</span></div>
          <label className="phrase-recall-input"><span className="sr-only">输入完整英文句子</span><textarea value={recallInput} onChange={(event) => { setRecallInput(event.target.value); if (recallFeedback?.accuracy !== 100) setRecallFeedback(null); }} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); checkRecall(); } }} placeholder="在这里写英文，按 Enter 检查…" spellCheck={false} /></label>
          {recallFeedback ? <div className={`phrase-recall-feedback ${recallFeedback.accuracy === 100 ? "correct" : "wrong"}`}><div><strong>{recallFeedback.accuracy}%</strong><span>{recallFeedback.accuracy === 100 ? "完全正确，已标记为掌握" : "对照标色修改，或查看答案"}</span></div><p>{recallFeedback.expected.map((token, index) => <mark key={`${token.text}-${index}`} className={token.status}>{token.text}</mark>)}</p>{recallFeedback.extra.length > 0 && <small>多写：{recallFeedback.extra.join(" · ")}</small>}</div> : recallRevealed ? <div className="phrase-recall-answer"><span>参考答案</span><strong>{currentRecall.english}</strong></div> : <div className="phrase-recall-rule"><b>判题规则</b><span>忽略大小写与标点；绿色正确，红色需修改，虚线为漏词。</span></div>}
          <footer><button className="recall-reveal" onClick={() => { setRecallRevealed(true); onUpdateProgress(currentRecall.id, "learning"); }}>显示答案</button><button className="recall-check" disabled={!recallInput.trim()} onClick={checkRecall}>检查默写</button><button className="recall-next" onClick={nextRecall}>下一句 →</button></footer>
        </article>
      </section>}

      <p className="phrase-source-note">原始文件标题为“口语密码1000句”，实际连续编号为 1–990；本页完整收录原稿全部 990 句。</p>
    </div>
  );
}
