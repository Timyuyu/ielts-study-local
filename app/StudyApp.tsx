"use client";

import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import {
  SKILLS,
  SKILL_META,
  STORAGE_KEY,
  addDays,
  applyWordDictationResult,
  calculateBalancedLearningProgress,
  calculateStreak,
  createEmptySnapshot,
  dateKey,
  daysUntil,
  formatClock,
  getCompletedTaskCount,
  getTasksForDate,
  hasStudyData,
  loadSnapshot,
  mergeStudySnapshots,
  nextVocabularyReview,
  normalizeDictationText,
  scoreSentenceDictation,
  recentDates,
  restartWordDictationProgress,
  resumeWordDictationProgress,
  skillAverage,
  updateLearningItemProgress,
  upsertSavedSentence,
  upsertSavedWord,
  type LearnerProfile,
  type PracticeAttempt,
  type SavedSentence,
  type SavedVocabularyWord,
  type Skill,
  type StudySnapshot,
  type TaskKind,
  type WordDictationOrder,
} from "./study";
import { dictionaryCandidates, formatPartOfSpeech, lookupDictionaryWord, normalizeDictionaryWord, type DictionaryExample, type DictionaryLookupContext, type DictionaryResult } from "./dictionary";
import { buildClozeExercise, getIncorrectClozeIndexes, normalizeClozeAnswer, type ClozeLevel } from "./cloze";
import { PART1_QUESTIONS, PART2_CUES } from "./speaking-bank";
import { SPEAKING_TRANSLATIONS } from "./speaking-translations";
import { PART3_QUESTIONS } from "./ielts-speaking-exam";
import { LISTENING_MOCKS } from "./ielts-exam-bank";
import { playWordAudio } from "./word-audio";

const FormalListeningExercise = lazy(() => import("./ExamPractice").then((module) => ({ default: module.FormalListeningExercise })));
const SpeakingMockExam = lazy(() => import("./ExamPractice").then((module) => ({ default: module.SpeakingMockExam })));
const Part2AudioPlayer = lazy(() => import("./Part2AudioPlayer").then((module) => ({ default: module.Part2AudioPlayer })));
const SentenceLibrary = lazy(() => import("./SentenceLibrary").then((module) => ({ default: module.SentenceLibrary })));

function ModuleLoader() {
  return <div className="brand-loader" aria-live="polite"><span className="loader-line" /><p>正在打开训练模块…</p></div>;
}

type NavKey = "today" | "practice" | "audio" | "phrases" | "vocabulary" | "progress" | "settings";
type SpeakingPart = "part1" | "part2" | "part3";
type ThemeKey = "eye" | "warm" | "mist" | "night";

const THEME_STORAGE_KEY = "ielts-route:theme";
const THEMES: { id: ThemeKey; label: string; description: string; marker: string }[] = [
  { id: "eye", label: "护眼绿", description: "低亮度鼠尾草纸色", marker: "护" },
  { id: "warm", label: "暖杏纸", description: "柔和米杏，适合白天", marker: "暖" },
  { id: "mist", label: "雾蓝灰", description: "低饱和冷灰蓝", marker: "雾" },
  { id: "night", label: "夜读灰", description: "低亮度石墨灰", marker: "夜" },
];

function isThemeKey(value: string | null): value is ThemeKey {
  return THEMES.some((theme) => theme.id === value);
}

function initialTheme(): ThemeKey {
  if (typeof window === "undefined") return "eye";
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeKey(stored) ? stored : "eye";
  } catch {
    return "eye";
  }
}

function initialNavigation(): NavKey {
  return typeof window !== "undefined" && window.location.hash.toLowerCase() === "#phrases"
    ? "phrases"
    : "today";
}

const NAV_ITEMS: { id: NavKey; label: string; marker: string; mobileLabel?: string }[] = [
  { id: "today", label: "今日", marker: "今" },
  { id: "practice", label: "听说", marker: "练" },
  { id: "audio", label: "范文听力", marker: "播" },
  { id: "phrases", label: "口语1000句", mobileLabel: "1000句", marker: "句" },
  { id: "vocabulary", label: "词句", marker: "记" },
  { id: "progress", label: "进度", marker: "势" },
  { id: "settings", label: "设置", marker: "设" },
];

const subscribeToHydration = () => () => {};
const ipaCache = new Map<string, string>();

function PhoneticText({ text, existing = "" }: { text: string; existing?: string }) {
  const saved = existing.trim();
  const key = text.trim().toLowerCase();
  const fixed = saved && saved !== "/—/" ? saved : "";
  const [phonetic, setPhonetic] = useState(() => fixed || ipaCache.get(key) || "音标待生成");
  const [visible, setVisible] = useState(false);
  const phoneticRef = useRef<HTMLSpanElement | null>(null);
  const displayedPhonetic = fixed || ipaCache.get(key) || phonetic;

  useEffect(() => {
    if (fixed) return;
    const cached = ipaCache.get(key);
    if (cached) return;
    const node = phoneticRef.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setVisible(true);
      observer.disconnect();
    }, { rootMargin: "160px 0px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [fixed, key]);

  useEffect(() => {
    if (fixed || !visible) return;
    const cached = ipaCache.get(key);
    if (cached) return;
    let active = true;
    void fetch(`/api/phonetic?text=${encodeURIComponent(text)}`)
      .then((response) => {
        if (!response.ok) throw new Error("Unable to generate phonetic transcription");
        return response.json() as Promise<{ phonetic?: string }>;
      })
      .then(({ phonetic: result = "/—/" }) => {
      ipaCache.set(key, result);
      if (active) setPhonetic(result);
      })
      .catch(() => {
        if (active) setPhonetic("/—/");
      });
    return () => { active = false; };
  }, [fixed, key, text, visible]);

  return <span ref={phoneticRef}>{displayedPhonetic}</span>;
}

const LEGACY_OWNER_KEY = `${STORAGE_KEY}:legacy-owner`;

function scopedStorageKey(accountId: string) {
  return `${STORAGE_KEY}:account:${accountId}`;
}

function syncMarkerKey(accountId: string) {
  return `${STORAGE_KEY}:synced:${accountId}`;
}

function dirtyMarkerKey(accountId: string) {
  return `${STORAGE_KEY}:dirty:${accountId}`;
}

function readBrowserSnapshot(accountId: string) {
  if (typeof window === "undefined") return createEmptySnapshot();
  try {
    const scoped = window.localStorage.getItem(scopedStorageKey(accountId));
    if (scoped) return loadSnapshot(scoped);

    const legacy = window.localStorage.getItem(STORAGE_KEY);
    const legacyOwner = window.localStorage.getItem(LEGACY_OWNER_KEY);
    if (legacy && (!legacyOwner || legacyOwner === accountId)) {
      window.localStorage.setItem(LEGACY_OWNER_KEY, accountId);
      return loadSnapshot(legacy);
    }
    return createEmptySnapshot();
  } catch {
    return createEmptySnapshot();
  }
}

let cachedAmericanVoice: SpeechSynthesisVoice | undefined;

function americanVoiceScore(voice: SpeechSynthesisVoice): number {
  const name = voice.name.toLowerCase();
  let score = 0;
  if (name.includes("natural") || name.includes("neural")) score += 100;
  if (/aria|jenny|guy|ava|andrew|emma|brian|samantha/.test(name)) score += 60;
  if (name.includes("microsoft")) score += 25;
  if (name.includes("google us english")) score += 20;
  if (name.includes("online")) score += 12;
  if (name.includes("compact") || name.includes("mobile")) score -= 80;
  return score;
}

function refreshAmericanVoice(): SpeechSynthesisVoice | undefined {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return undefined;
  const americanVoices = window.speechSynthesis
    .getVoices()
    .filter((voice) => voice.lang.toLowerCase().replace("_", "-").startsWith("en-us"))
    .sort((left, right) => americanVoiceScore(right) - americanVoiceScore(left));
  cachedAmericanVoice = americanVoices[0];
  return cachedAmericanVoice;
}

function getAmericanVoice(): SpeechSynthesisVoice | undefined {
  return cachedAmericanVoice ?? refreshAmericanVoice();
}

function playAmericanEnglish(
  text: string,
  options: { rate?: number; onStart?: () => void; onEnd?: () => void } = {},
): boolean {
  if (
    typeof window === "undefined" ||
    !("speechSynthesis" in window) ||
    !("SpeechSynthesisUtterance" in window)
  ) return false;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const voice = getAmericanVoice();
  utterance.lang = "en-US";
  utterance.rate = options.rate ?? 0.9;
  utterance.pitch = 1;
  if (voice) utterance.voice = voice;
  utterance.onstart = () => options.onStart?.();
  utterance.onend = () => options.onEnd?.();
  utterance.onerror = () => options.onEnd?.();
  window.speechSynthesis.speak(utterance);
  return true;
}

type SyncState = "loading" | "syncing" | "synced" | "offline";

function syncStateLabel(syncState: SyncState, localMode = false): string {
  if (localMode) return "已保存在本机";
  if (syncState === "loading") return "正在读取账号记录";
  if (syncState === "syncing") return "正在同步";
  if (syncState === "offline") return "离线保存，联网后同步";
  return "已同步到账号";
}

function saveWordToSnapshot(snapshot: StudySnapshot, word: SavedVocabularyWord): StudySnapshot {
  const key = word.word.trim().toLowerCase();
  const savedWordDeletions = { ...snapshot.savedWordDeletions };
  delete savedWordDeletions[key];
  return {
    ...snapshot,
    savedWords: upsertSavedWord(snapshot.savedWords, word),
    savedWordDeletions,
  };
}

function saveSentenceToSnapshot(snapshot: StudySnapshot, sentence: SavedSentence): StudySnapshot {
  const key = normalizeDictationText(sentence.english);
  const savedSentenceDeletions = { ...snapshot.savedSentenceDeletions };
  delete savedSentenceDeletions[key];
  return {
    ...snapshot,
    savedSentences: upsertSavedSentence(snapshot.savedSentences, sentence),
    savedSentenceDeletions,
  };
}

export function StudyApp({ accountId, accountName, localMode = false }: { accountId: string; accountName: string; localMode?: boolean }) {
  const [snapshot, setSnapshot] = useState<StudySnapshot>(() => {
    const saved = readBrowserSnapshot(accountId);
    if (!localMode || saved.profile) return saved;
    return {
      ...saved,
      profile: {
        targetBand: 7,
        examDate: addDays(dateKey(), 90),
        dailyMinutes: 60,
        createdAt: new Date().toISOString(),
      },
    };
  });
  const ready = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );
  const [nav, setNav] = useState<NavKey>(initialNavigation);
  const [activeSkill, setActiveSkill] = useState<Skill | null>(null);
  const [toast, setToast] = useState("");
  const [syncReady, setSyncReady] = useState(localMode);
  const [syncState, setSyncState] = useState<SyncState>(localMode ? "synced" : "loading");
  const [retryNonce, setRetryNonce] = useState(0);
  const [theme, setTheme] = useState<ThemeKey>(initialTheme);
  const lastSyncedJson = useRef("");
  const saveSequence = useRef(0);

  const updateTheme = (nextTheme: ThemeKey) => {
    setTheme(nextTheme);
    if (typeof document !== "undefined") {
      document.documentElement.dataset.theme = nextTheme;
      document.documentElement.style.colorScheme = "light";
    }
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch {
      // Theme choice still applies for the current session when storage is unavailable.
    }
  };

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = "light";
  }, [theme]);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const refresh = () => { refreshAmericanVoice(); };
    refresh();
    window.speechSynthesis.addEventListener("voiceschanged", refresh);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", refresh);
  }, []);

  useEffect(() => {
    if (!ready || localMode) return;
    let active = true;

    async function restoreAccountSnapshot() {
      const local = readBrowserSnapshot(accountId);
      try {
        const response = await fetch("/api/study-snapshot", {
          cache: "no-store",
          credentials: "same-origin",
        });
        if (!response.ok) throw new Error("无法读取账号记录");
        const data = (await response.json()) as { snapshot: unknown | null };
        const remote = data.snapshot
          ? loadSnapshot(JSON.stringify(data.snapshot))
          : null;
        const wasSynced = window.localStorage.getItem(syncMarkerKey(accountId)) === "1";
        const hasUnsyncedChanges = window.localStorage.getItem(dirtyMarkerKey(accountId)) === "1";
        const restored = remote
          ? wasSynced && !hasUnsyncedChanges
            ? remote
            : mergeStudySnapshots(local, remote, { preferLocal: hasUnsyncedChanges })
          : local;
        if (!active) return;
        lastSyncedJson.current = remote
          ? JSON.stringify(remote)
          : hasStudyData(local)
            ? ""
            : JSON.stringify(local);
        setSnapshot(restored);
        setSyncReady(true);
        if (remote && JSON.stringify(restored) === JSON.stringify(remote)) {
          window.localStorage.setItem(syncMarkerKey(accountId), "1");
          window.localStorage.setItem(dirtyMarkerKey(accountId), "0");
        }
        setSyncState(
          JSON.stringify(restored) === lastSyncedJson.current
            ? "synced"
            : "syncing",
        );
      } catch {
        if (!active) return;
        setSnapshot(local);
        setSyncReady(true);
        setSyncState("offline");
      }
    }

    void restoreAccountSnapshot();
    return () => {
      active = false;
    };
  }, [accountId, localMode, ready]);
  useEffect(() => {
    if (!ready || !syncReady) return;
    const serialized = JSON.stringify(snapshot);
    try {
      window.localStorage.setItem(scopedStorageKey(accountId), serialized);
    } catch {
      // The account copy remains authoritative when browser storage is disabled.
    }
    if (localMode) {
      lastSyncedJson.current = serialized;
      return;
    }
    if (serialized === lastSyncedJson.current) {
      setSyncState("synced");
      return;
    }

    const sequence = ++saveSequence.current;
    setSyncState("syncing");
    try {
      window.localStorage.setItem(dirtyMarkerKey(accountId), "1");
    } catch {
      // Synchronization can continue without a local dirty marker.
    }
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/study-snapshot", {
          method: "PUT",
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ snapshot }),
        });
        if (!response.ok) throw new Error("无法保存账号记录");
        lastSyncedJson.current = serialized;
        try {
          window.localStorage.setItem(syncMarkerKey(accountId), "1");
          window.localStorage.setItem(dirtyMarkerKey(accountId), "0");
        } catch {
          // The server copy was saved even if local markers are unavailable.
        }
        if (sequence === saveSequence.current) setSyncState("synced");
      } catch {
        if (sequence === saveSequence.current) setSyncState("offline");
      }
    }, 650);
    return () => window.clearTimeout(timer);
  }, [accountId, localMode, ready, retryNonce, snapshot, syncReady]);
  useEffect(() => {
    const retry = () => setRetryNonce((current) => current + 1);
    window.addEventListener("online", retry);
    return () => window.removeEventListener("online", retry);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  if (!ready || !syncReady) {
    return <main className="brand-loader" aria-live="polite"><Brand /><span className="loader-line" /><p>正在整理你的学习航线…</p></main>;
  }
  if (!snapshot.profile) {
    return <Onboarding onComplete={(profile) => {
      setSnapshot((current) => ({ ...current, profile }));
      setToast("学习航线已经生成");
    }} theme={theme} onThemeChange={updateTheme} />;
  }

  const profile = snapshot.profile;
  const today = dateKey();
  const tasks = getTasksForDate(profile, today);
  const completedIds = snapshot.daily[today]?.completedTaskIds ?? [];

  const finishPractice = (attempt: PracticeAttempt) => {
    const taskId = `${today}:${attempt.skill}`;
    setSnapshot((current) => {
      const day = current.daily[today] ?? { completedTaskIds: [], vocabularyReviews: 0 };
      return {
        ...current,
        attempts: [...current.attempts, attempt],
        daily: {
          ...current.daily,
          [today]: {
            ...day,
            completedTaskIds: day.completedTaskIds.includes(taskId)
              ? day.completedTaskIds
              : [...day.completedTaskIds, taskId],
          },
        },
      };
    });
    setActiveSkill(null);
    setNav("today");
    setToast("练习已记录，今日航线前进一格");
  };

  const openTask = (kind: TaskKind) => {
    setActiveSkill(kind);
    setNav("practice");
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <AppNav nav={nav} onNavigate={(next) => { setNav(next); setActiveSkill(null); }} />
        <ThemeSwitcher theme={theme} onChange={updateTheme} compact />
        <div className="sidebar-note"><span className="eyebrow">TODAY’S NOTE</span><p>稳定的 30 分钟，比偶尔冲刺三小时更接近目标。</p></div>
        <div className="sidebar-profile"><div className="avatar">航</div><div><strong>目标 {profile.targetBand.toFixed(1)}</strong><span title={accountName}>{syncStateLabel(syncState, localMode)} · {accountName}</span></div></div>
      </aside>
      <header className="mobile-header"><Brand /><div className="mobile-header-actions"><button className="theme-quick-button" onClick={() => updateTheme(THEMES[(THEMES.findIndex((item) => item.id === theme) + 1) % THEMES.length].id)} aria-label={`当前${THEMES.find((item) => item.id === theme)?.label}，切换下一个主题`}>{THEMES.find((item) => item.id === theme)?.marker}</button><button className="target-pill" onClick={() => setNav("settings")}>目标 {profile.targetBand.toFixed(1)}</button></div></header>
      <main className="main-content">
        {nav === "today" && <TodayView profile={profile} snapshot={snapshot} tasks={tasks} completedIds={completedIds} onOpenTask={openTask} onNavigate={setNav} />}
        {nav === "practice" && !activeSkill && <PracticeHub snapshot={snapshot} onOpen={setActiveSkill} />}
        {nav === "practice" && activeSkill && (
          <PracticeView
            skill={activeSkill}
            snapshot={snapshot}
            onBack={() => setActiveSkill(null)}
            onFinish={finishPractice}
            onSaveWord={(word) => { setSnapshot((current) => saveWordToSnapshot(current, word)); setToast(`“${word.word}”已加入生词本`); }}
            onSaveWords={(words) => {
              setSnapshot((current) => words.reduce(saveWordToSnapshot, current));
              setToast(words.length === 1
                ? `“${words[0].word}”已自动加入生词本`
                : `${words.length} 个完形错词已自动加入生词本`);
            }}
            onSaveSentence={(sentence) => { setSnapshot((current) => saveSentenceToSnapshot(current, sentence)); setToast("这句话已加入精句本"); }}
            onCompleteListening={(ids) => setSnapshot((current) => ({
              ...current,
              learningProgress: {
                ...current.learningProgress,
                listeningSections: updateLearningItemProgress(current.learningProgress.listeningSections, ids, "completed"),
              },
            }))}
            onResetListening={(ids) => setSnapshot((current) => ({
              ...current,
              learningProgress: {
                ...current.learningProgress,
                listeningSections: updateLearningItemProgress(current.learningProgress.listeningSections, ids, "not_started"),
              },
            }))}
            onCompleteCloze={(id) => setSnapshot((current) => ({
              ...current,
              learningProgress: {
                ...current.learningProgress,
                speakingCloze: updateLearningItemProgress(current.learningProgress.speakingCloze, [id], "completed"),
              },
            }))}
            onResetCloze={(ids) => setSnapshot((current) => ({
              ...current,
              learningProgress: {
                ...current.learningProgress,
                speakingCloze: updateLearningItemProgress(current.learningProgress.speakingCloze, ids, "not_started"),
              },
            }))}
          />
        )}
        {nav === "audio" && <Suspense fallback={<ModuleLoader />}><Part2AudioPlayer /></Suspense>}
        {nav === "phrases" && <Suspense fallback={<ModuleLoader />}><SentenceLibrary
          progress={snapshot.phraseProgress}
          initialPosition={snapshot.phraseReaderPosition.sentenceId}
          savedSentences={snapshot.savedSentences}
          onUpdateProgress={(id, status) => {
            setSnapshot((current) => ({
              ...current,
              phraseProgress: {
                ...current.phraseProgress,
                [id]: { status, updatedAt: new Date().toISOString() },
              },
            }));
          }}
          onUpdatePosition={(id) => {
            setSnapshot((current) => current.phraseReaderPosition.sentenceId === id
              ? current
              : {
                  ...current,
                  phraseReaderPosition: { sentenceId: id, updatedAt: new Date().toISOString() },
                });
          }}
          onSaveSentence={(sentence) => {
            const alreadySaved = snapshot.savedSentences.some((item) => item.english.trim().toLowerCase() === sentence.english.trim().toLowerCase());
            setSnapshot((current) => saveSentenceToSnapshot(current, sentence));
            setToast(alreadySaved ? "这句话已经在精句本中" : "这句话已加入精句本");
          }}
          onSpeak={(text, rate) => { playAmericanEnglish(text, { rate }); }}
        /></Suspense>}
        {nav === "vocabulary" && <VocabularyCenter snapshot={snapshot} setSnapshot={setSnapshot} onOpenSpeaking={() => { setActiveSkill("speaking"); setNav("practice"); }} />}
        {nav === "progress" && <ProgressView profile={profile} snapshot={snapshot} />}
        {nav === "settings" && (
          <SettingsView
            profile={profile}
            accountName={accountName}
            syncState={syncState}
            localMode={localMode}
            theme={theme}
            onThemeChange={updateTheme}
            onSave={(next) => { setSnapshot((current) => ({ ...current, profile: next })); setToast("学习目标已更新"); }}
            onReset={() => { setSnapshot(createEmptySnapshot()); setNav("today"); }}
          />
        )}
      </main>
      <nav className="bottom-nav" aria-label="移动端导航">
        {NAV_ITEMS.map((item) => <button key={item.id} className={nav === item.id ? "active" : ""} onClick={() => { setNav(item.id); setActiveSkill(null); }} aria-current={nav === item.id ? "page" : undefined}><span aria-hidden="true">{item.marker}</span>{item.mobileLabel ?? item.label}</button>)}
      </nav>
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

function Brand() {
  return (
    <div className="brand" aria-label="雅思听说航线">
      <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
      <span><strong>雅思听说</strong><small>LISTEN & SPEAK</small></span>
    </div>
  );
}

function AppNav({ nav, onNavigate }: { nav: NavKey; onNavigate: (next: NavKey) => void }) {
  return (
    <nav className="side-nav" aria-label="主导航">
      {NAV_ITEMS.map((item) => (
        <button key={item.id} className={nav === item.id ? "nav-item active" : "nav-item"} onClick={() => onNavigate(item.id)} aria-current={nav === item.id ? "page" : undefined}>
          <span aria-hidden="true">{item.marker}</span>{item.label}
        </button>
      ))}
    </nav>
  );
}

function ThemeSwitcher({ theme, onChange, compact = false }: { theme: ThemeKey; onChange: (theme: ThemeKey) => void; compact?: boolean }) {
  return (
    <section className={compact ? "theme-switcher compact" : "theme-switcher"} aria-labelledby={compact ? "sidebar-theme-label" : undefined}>
      <div className="theme-switcher-copy">
        <span className="eyebrow" id={compact ? "sidebar-theme-label" : undefined}>READING THEME</span>
        {!compact && <><h3>选择更舒服的阅读底色</h3><p>主题只保存在这台设备，不影响学习记录。</p></>}
      </div>
      <div className="theme-options" role="group" aria-label="阅读主题">
        {THEMES.map((item) => (
          <button
            key={item.id}
            className={theme === item.id ? "theme-option active" : "theme-option"}
            data-theme-preview={item.id}
            onClick={() => onChange(item.id)}
            aria-pressed={theme === item.id}
            title={`${item.label}：${item.description}`}
          >
            <i aria-hidden="true" />
            <span><b>{item.label}</b>{!compact && <small>{item.description}</small>}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function Onboarding({ onComplete, theme, onThemeChange }: { onComplete: (profile: LearnerProfile) => void; theme: ThemeKey; onThemeChange: (theme: ThemeKey) => void }) {
  const [step, setStep] = useState(0);
  const [targetBand, setTargetBand] = useState(7);
  const [examDate, setExamDate] = useState(() => addDays(dateKey(), 30));
  const [dailyMinutes, setDailyMinutes] = useState<30 | 60 | 90>(60);
  const tomorrow = addDays(dateKey(), 1);
  const content = [
    <>
      <span className="eyebrow coral">01 / TARGET</span><h2>先确定你要抵达的分数</h2><p className="muted">目标会成为学习台的主坐标。之后你随时可以在设置里调整。</p>
      <div className="band-grid" role="group" aria-label="选择目标分">
        {[5.5, 6, 6.5, 7, 7.5, 8, 8.5].map((band) => <button key={band} className={targetBand === band ? "choice-card selected" : "choice-card"} onClick={() => setTargetBand(band)}><span>{band.toFixed(1)}</span><small>{band === 7 ? "热门目标" : "IELTS BAND"}</small></button>)}
      </div>
    </>,
    <>
      <span className="eyebrow coral">02 / DATE</span><h2>距离考试还有多久？</h2><p className="muted">用考试日期安排节奏，不制造焦虑，只让每天的下一步更清楚。</p>
      <div className="date-choice"><label htmlFor="exam-date">考试日期</label><input id="exam-date" type="date" min={tomorrow} value={examDate} onChange={(event) => setExamDate(event.target.value)} /><p>距离考试还有 <strong>{daysUntil(examDate)}</strong> 天</p></div>
    </>,
    <>
      <span className="eyebrow coral">03 / RHYTHM</span><h2>选择可长期坚持的节奏</h2><p className="muted">无需追求最长，真实可执行的学习时间才会积累成分数。</p>
      <div className="time-grid" role="group" aria-label="选择每日学习时长">
        {[
          { value: 30, label: "轻量", text: "听力 / 口语轮换" },
          { value: 60, label: "均衡", text: "听力 + 口语各 30 分钟" },
          { value: 90, label: "强化", text: "听力 + 口语各 45 分钟" },
        ].map((option) => <button key={option.value} className={dailyMinutes === option.value ? "time-card selected" : "time-card"} onClick={() => setDailyMinutes(option.value as 30 | 60 | 90)}><span>{option.label}</span><strong>{option.value}<small> MIN</small></strong><p>{option.text}</p></button>)}
      </div>
    </>,
  ];

  return (
    <main className="onboarding">
      <header><Brand /><div className="onboarding-theme"><span>建立你的备考坐标</span><ThemeSwitcher theme={theme} onChange={onThemeChange} compact /></div></header>
      <div className="onboarding-layout">
        <section className="onboarding-intro"><span className="eyebrow">YOUR ROUTE TO BAND {targetBand.toFixed(1)}</span><h1>每天都知道<br />下一步。</h1><p>一条把目标、计划、练习与复盘连接起来的雅思学习航线。</p><div className="route-visual" aria-hidden="true"><span className="route-dot" /><span className="route-line" /><span className="route-dot middle" /><span className="route-line accent" /><span className="route-flag">{targetBand.toFixed(1)}</span></div></section>
        <section className="onboarding-card">
          <div className="step-dots" aria-label={`第 ${step + 1} 步，共 3 步`}>{[0, 1, 2].map((index) => <span key={index} className={index <= step ? "active" : ""} />)}</div>
          <div className="step-content">{content[step]}</div>
          <div className="step-actions">
            {step > 0 ? <button className="button ghost" onClick={() => setStep(step - 1)}>上一步</button> : <span />}
            {step < 2 ? (
              <button className="button primary" disabled={step === 1 && (!examDate || examDate < tomorrow)} onClick={() => setStep(step + 1)}>继续</button>
            ) : (
              <button className="button primary" onClick={() => onComplete({ targetBand, examDate, dailyMinutes, createdAt: new Date().toISOString() })}>生成我的航线</button>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: ReactNode }) {
  return <header className="page-header"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{description && <p>{description}</p>}</div>{action}</header>;
}

function TodayView({ profile, snapshot, tasks, completedIds, onOpenTask, onNavigate }: {
  profile: LearnerProfile;
  snapshot: StudySnapshot;
  tasks: ReturnType<typeof getTasksForDate>;
  completedIds: string[];
  onOpenTask: (kind: TaskKind) => void;
  onNavigate: (nav: NavKey) => void;
}) {
  const dateLabel = new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "long" }).format(new Date());
  const completed = tasks.filter((task) => completedIds.includes(task.id)).length;
  const progress = Math.round((completed / tasks.length) * 100);
  const streak = calculateStreak(snapshot, profile);
  const nextTask = tasks.find((task) => !completedIds.includes(task.id)) ?? tasks[0];
  return (
    <div className="page">
      <PageHeader eyebrow={dateLabel} title="今天，沿着航线前进一步。" description="不用一次完成所有事，先从下一项开始。" action={<button className="quiet-link" onClick={() => onNavigate("progress")}>查看学习报告 <span>↗</span></button>} />
      <section className="hero-grid">
        <article className="route-hero">
          <div className="route-hero-copy"><span className="eyebrow light">EXAM COUNTDOWN</span><p>距离考试</p><strong>{daysUntil(profile.examDate)}</strong><span>天</span></div>
          <div className="route-map" aria-hidden="true"><div className="map-label">TODAY</div><div className="map-line one" /><div className="map-stop first">01</div><div className="map-line two" /><div className="map-stop second">02</div><div className="map-line three" /><div className="map-target">BAND<br /><b>{profile.targetBand.toFixed(1)}</b></div></div>
          <div className="route-hero-footer"><span>每日 {profile.dailyMinutes} 分钟</span><span>考试日 {profile.examDate.replaceAll("-", ".")}</span></div>
        </article>
        <article className="next-card">
          <div className="progress-ring" style={{ "--progress": `${progress * 3.6}deg` } as CSSProperties}><div><strong>{progress}%</strong><span>今日</span></div></div>
          <div><span className="eyebrow coral">NEXT UP</span><h2>{completed === tasks.length ? "今日航线已完成" : nextTask.title}</h2><p>{completed === tasks.length ? "做得好。现在可以轻松复盘，或再练一科。" : nextTask.description}</p><button className="button dark" onClick={() => onOpenTask(nextTask.kind)}>{completed === tasks.length ? "再练一次" : "开始下一项"} <span>→</span></button></div>
        </article>
      </section>
      <CourseProgressOverview snapshot={snapshot} compact />
      <section className="section-grid">
        <div className="task-panel">
          <div className="section-heading"><div><span className="eyebrow">TODAY’S ROUTE</span><h2>今日学习清单</h2></div><span>{completed} / {tasks.length} 完成</span></div>
          <div className="task-list">
            {tasks.map((task, index) => {
              const done = completedIds.includes(task.id);
              return <button className={done ? "task-row done" : "task-row"} key={task.id} onClick={() => onOpenTask(task.kind)}><span className="task-number">{done ? "✓" : String(index + 1).padStart(2, "0")}</span><span className="task-main"><small>{task.label}</small><strong>{task.title}</strong><span>{task.description}</span></span><span className="task-time">{task.minutes}<small>MIN</small></span><span className="task-arrow">{done ? "复习" : "→"}</span></button>;
            })}
          </div>
        </div>
        <aside className="insight-column">
          <article className="stat-card coral-card"><span className="eyebrow">CONSISTENCY</span><strong>{streak || 1}<small> 天</small></strong><p>{streak > 1 ? "连续学习正在形成节奏。" : "今天是建立连续学习的起点。"}</p><div className="mini-days" aria-label="最近七天学习情况">{recentDates(7).map((key) => <span key={key} className={getCompletedTaskCount(snapshot, profile, key).completed > 0 ? "filled" : ""} />)}</div></article>
          <article className="quote-card"><span className="quote-mark">“</span><blockquote>真正的进步，不是做了多少题，而是下一次知道该怎样做得更好。</blockquote><span>今日复盘提醒</span></article>
        </aside>
      </section>
    </div>
  );
}

function PracticeHub({ snapshot, onOpen }: { snapshot: StudySnapshot; onOpen: (skill: Skill) => void }) {
  const descriptions: Record<Skill, string> = {
    listening: "8 套40题完整模考 · 4个Section · 一次播放 · Band换算",
    speaking: "Part 1–3各150题 · 10套11–14分钟模考 · 录音与评分锚点",
  };
  return (
    <div className="page practice-hub">
      <PageHeader eyebrow="IELTS 6.5–7.0 PREPARATION" title="正式考试训练中心" description="按IELTS公开考试结构与评分标准训练；先诊断，再专项，最后用完整模考验证稳定性。" />
      <div className="skill-grid">{SKILLS.map((skill, index) => {
        const meta = SKILL_META[skill];
        const attempts = snapshot.attempts.filter((item) => item.skill === skill).length;
        return <article className={`skill-card skill-${skill}`} key={skill}><div className="skill-index">0{index + 1}</div><span className="skill-letter">{meta.short}</span><span className="eyebrow">{meta.english.toUpperCase()}</span><h2>{meta.name}</h2><p>{descriptions[skill]}</p><div className="skill-card-footer"><span>{attempts ? `已完成 ${attempts} 次` : "等待首次练习"}</span><button onClick={() => onOpen(skill)} aria-label={`开始${meta.name}练习`}>开始 <span>→</span></button></div></article>;
      })}</div>
      <section className="course-roadmap">
        <div className="section-heading"><div><span className="eyebrow">EXAM-READY CURRICULUM</span><h2>从基线到稳定6.5–7.0</h2></div><span>按顺序完成，不靠刷题碰运气</span></div>
        <div className="course-roadmap-grid">
          <article><span>01</span><b>基线诊断</b><p>先完成1套听力40题和1次口语完整模考，确定真实弱项。</p></article>
          <article><span>02</span><b>专项修复</b><p>听力按Section和错因复盘；口语按四项评分标准逐项训练。</p></article>
          <article><span>03</span><b>限时整合</b><p>听力只播放一次；口语连续完成Part 1–3并保留录音证据。</p></article>
          <article><span>04</span><b>稳定验证</b><p>连续3次不同套题达到目标线，再进入考前维持阶段。</p></article>
        </div>
      </section>
      <section className="practice-principle"><span className="eyebrow coral">6.5–7.0 ROUTE</span><h2>达到一次不算掌握，稳定达到才接近考场准备度。</h2><div><p><b>01</b> 完整模考建立真实基线</p><p><b>02</b> 按Section和评分项修复弱点</p><p><b>03</b> 连续3次不同套题达到目标线</p></div></section>
      <aside className="official-source-note"><span>依据IELTS官方公开资料构建</span><p>听力：4个部分、40题、录音只播放一次；口语：Part 1–3、11–14分钟，按流利与连贯、词汇、语法、发音四项标准评估。</p><div><a href="https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-listening" target="_blank" rel="noreferrer">听力考试结构 ↗</a><a href="https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-speaking" target="_blank" rel="noreferrer">口语考试结构 ↗</a><a href="https://ielts.org/cdn/ielts-guides/ielts-speaking-band-descriptors.pdf" target="_blank" rel="noreferrer">官方口语描述语 ↗</a></div></aside>
    </div>
  );
}

function PracticeView({ skill, snapshot, onBack, onFinish, onSaveWord, onSaveWords, onSaveSentence, onCompleteListening, onResetListening, onCompleteCloze, onResetCloze }: {
  skill: Skill;
  snapshot: StudySnapshot;
  onBack: () => void;
  onFinish: (attempt: PracticeAttempt) => void;
  onSaveWord: (word: SavedVocabularyWord) => void;
  onSaveWords: (words: SavedVocabularyWord[]) => void;
  onSaveSentence: (sentence: SavedSentence) => void;
  onCompleteListening: (ids: string[]) => void;
  onResetListening: (ids: string[]) => void;
  onCompleteCloze: (id: string) => void;
  onResetCloze: (ids: string[]) => void;
}) {
  const meta = SKILL_META[skill];
  return (
    <div className="page practice-page">
      <button className="back-button" onClick={onBack}>← 返回听说训练</button>
      <div className="practice-title"><span className={`practice-badge badge-${skill}`}>{meta.short}</span><div><span className="eyebrow">{meta.english.toUpperCase()} EXAM PREPARATION</span><h1>{meta.name}正式备考</h1></div></div>
      {skill === "listening" && <ListeningExercise snapshot={snapshot} savedWords={snapshot.savedWords} onSaveWord={onSaveWord} onFinish={onFinish} onCompleteListening={onCompleteListening} onResetListening={onResetListening} />}
      {skill === "speaking" && <SpeakingExercise snapshot={snapshot} savedWords={snapshot.savedWords} savedSentences={snapshot.savedSentences} onSaveWord={onSaveWord} onSaveWords={onSaveWords} onSaveSentence={onSaveSentence} onFinish={onFinish} onCompleteCloze={onCompleteCloze} onResetCloze={onResetCloze} />}
    </div>
  );
}

function ListeningExercise({ snapshot, savedWords, onSaveWord, onFinish, onCompleteListening, onResetListening }: {
  snapshot: StudySnapshot;
  savedWords: SavedVocabularyWord[];
  onSaveWord: (word: SavedVocabularyWord) => void;
  onFinish: (attempt: PracticeAttempt) => void;
  onCompleteListening: (ids: string[]) => void;
  onResetListening: (ids: string[]) => void;
}) {
  const allIds = LISTENING_MOCKS.flatMap((mock) => mock.sections.map((section) => `${mock.id}:section-${section.part}`));
  return <Suspense fallback={<ModuleLoader />}><FormalListeningExercise savedWords={savedWords} onSaveWord={onSaveWord} onFinish={onFinish} progress={snapshot.learningProgress.listeningSections} onCompleteSections={onCompleteListening} onResetSection={(id) => onResetListening([id])} onResetAllSections={() => onResetListening(allIds)} /></Suspense>;
}

function ClickableEnglish({ text, contextTranslation = "", selectedWord, onSelectWord }: {
  text: string;
  contextTranslation?: string;
  selectedWord: string | null;
  onSelectWord: (word: string, context: DictionaryLookupContext) => void;
}) {
  const pieces = text.split(/([A-Za-z]+(?:['’-][A-Za-z]+)*)/g).filter((piece) => piece.length > 0);
  return <>{pieces.map((piece, index) => {
    const normalized = normalizeDictionaryWord(piece);
    if (!normalized) return <span key={`${piece}-${index}`}>{piece}</span>;
    return <button type="button" key={`${piece}-${index}`} className={selectedWord === normalized ? "click-word selected" : "click-word"} onClick={() => onSelectWord(normalized, { english: text, chinese: contextTranslation })} aria-label={`查看 ${piece} 在本句中的释义、音标和发音`}>{piece}</button>;
  })}</>;
}

function splitEnglishSentences(text: string): string[] {
  return (text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [text]).map((sentence) => sentence.trim()).filter(Boolean);
}

function splitChineseSentences(text: string): string[] {
  return (text.match(/[^。！？]+[。！？]+|[^。！？]+$/g) ?? [text]).map((sentence) => sentence.trim()).filter(Boolean);
}

const SPEAKING_EXAMPLE_CORPUS: DictionaryExample[] = [
  ...PART1_QUESTIONS,
  ...PART2_CUES,
  ...PART3_QUESTIONS,
].flatMap((item) => {
  const englishSentences = splitEnglishSentences(item.answer);
  const chineseSentences = splitChineseSentences(SPEAKING_TRANSLATIONS[item.id] ?? "");
  return englishSentences.map((english, index) => ({
    english,
    chinese: chineseSentences[index] ?? "",
  }));
});

function speakingExamplesForWord(word: string, context: DictionaryLookupContext): DictionaryExample[] {
  const targetForms = new Set(dictionaryCandidates(word));
  const matchesWord = (sentence: string) => (sentence.match(/[A-Za-z]+(?:['’-][A-Za-z]+)*/g) ?? []).some((token) => {
    const tokenForms = dictionaryCandidates(normalizeDictionaryWord(token));
    return tokenForms.some((form) => targetForms.has(form));
  });
  const examples: DictionaryExample[] = [];
  const addExample = (example: DictionaryExample) => {
    if (!example.english || examples.some((item) => item.english.toLowerCase() === example.english.toLowerCase())) return;
    examples.push(example);
  };
  addExample({ english: context.english ?? "", chinese: context.chinese ?? "" });
  for (const example of SPEAKING_EXAMPLE_CORPUS) {
    if (examples.length >= 3) break;
    if (matchesWord(example.english)) addExample(example);
  }
  return examples.slice(0, 3);
}

function sentenceRole(part: SpeakingPart, index: number, total: number): string {
  if (part === "part3") return ["先给观点", "解释原因", "给出例子", "补充限定"][Math.min(index, 3)];
  if (part === "part1") {
    if (index === 0) return "直接回答";
    if (index === total - 1) return "自然收尾";
    return index === 1 ? "补充原因" : "加入细节";
  }
  if (index === 0) return "开场点题";
  if (index === total - 1) return "感受与意义";
  if (index <= Math.ceil(total / 3)) return "交代背景";
  if (index >= Math.floor(total * 0.7)) return "结果与影响";
  return "展开故事";
}

function SentenceStudy({ text, translation, part, sourceId, topic, savedSentences, selectedWord, playingKey, onSelectWord, onPlay, onSaveSentence }: {
  text: string;
  translation: string;
  part: SpeakingPart;
  sourceId: string;
  topic: string;
  savedSentences: SavedSentence[];
  selectedWord: string | null;
  playingKey: string;
  onSelectWord: (word: string, context: DictionaryLookupContext) => void;
  onPlay: (text: string, key: string, rate?: number, sentenceIndex?: number) => void;
  onSaveSentence: (sentence: SavedSentence) => void;
}) {
  const englishSentences = splitEnglishSentences(text);
  const chineseSentences = splitChineseSentences(translation);
  return (
    <div className={`sentence-study sentence-study-${part}`}>
      <div className="translation-overview"><span>完整中文理解</span><p>{translation}</p></div>
      <div className="sentence-study-list">
        {englishSentences.map((sentence, index) => {
          const key = `sentence:${index}`;
          const sentenceId = `saved-sentence:${sourceId}:${index}`;
          const chinese = chineseSentences[index] ?? "结合上方中文理解这句话的意思。";
          const saved = savedSentences.some((item) => item.id === sentenceId || item.english.trim().toLowerCase() === sentence.trim().toLowerCase());
          return <article key={`${sentence}-${index}`}>
            <div className="sentence-order"><b>{String(index + 1).padStart(2, "0")}</b><span>{sentenceRole(part, index, englishSentences.length)}</span></div>
            <div className="sentence-copy">
              <p><ClickableEnglish text={sentence} contextTranslation={chinese} selectedWord={selectedWord} onSelectWord={onSelectWord} /></p>
              <small>{chinese}</small>
            </div>
            <div className="sentence-actions">
              <button type="button" className={playingKey === key ? "sentence-audio playing" : "sentence-audio"} onClick={() => onPlay(sentence, key, 0.94, index)} aria-label={`用自然美式口音播放第 ${index + 1} 句`}>{playingKey === key ? "■" : "🔊"}</button>
              <button type="button" className={saved ? "save-sentence saved" : "save-sentence"} disabled={saved} onClick={() => onSaveSentence({ id: sentenceId, english: sentence, chinese, topic, part, sourceId, addedAt: new Date().toISOString(), source: "speaking" })}>{saved ? "✓ 已收藏" : "+ 精句"}</button>
            </div>
          </article>;
        })}
      </div>
    </div>
  );
}

function ClozePractice({ text, seed, completed, onComplete, onResetProgress, onIncorrectWords }: { text: string; seed: string; completed: boolean; onComplete: () => void; onResetProgress: () => void; onIncorrectWords: (words: string[]) => void }) {
  const [level, setLevel] = useState<ClozeLevel>("standard");
  const [round, setRound] = useState(0);
  const [entries, setEntries] = useState<Record<number, string>>({});
  const [checked, setChecked] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [autoSavedCount, setAutoSavedCount] = useState(0);
  const reportedMistakes = useRef<Set<string>>(new Set());
  const tokens = buildClozeExercise(text, `${seed}:${round}`, level);
  const blanks = tokens.filter((token) => token.blank);
  const blankOrder = new Map(blanks.map((token, index) => [token.index, index + 1]));
  const filled = blanks.filter((token) => entries[token.index]?.trim()).length;
  const correct = blanks.filter((token) => normalizeClozeAnswer(entries[token.index] ?? "") === normalizeClozeAnswer(token.text)).length;
  const mistakes = checked ? getIncorrectClozeIndexes(tokens, entries) : [];

  const reset = (nextLevel = level, nextRound = round) => {
    setLevel(nextLevel);
    setRound(nextRound);
    setEntries({});
    setChecked(false);
    setRevealed(false);
    setAutoSavedCount(0);
    reportedMistakes.current.clear();
  };
  const revealAnswers = () => {
    setEntries(Object.fromEntries(blanks.map((token) => [token.index, token.text])));
    setChecked(true);
    setRevealed(true);
  };
  const checkAnswers = () => {
    const newlyMissed = tokens.filter((token) => {
      const entry = entries[token.index]?.trim() ?? "";
      const word = normalizeClozeAnswer(token.text);
      return token.blank && entry.length > 0 &&
        normalizeClozeAnswer(entry) !== word &&
        !reportedMistakes.current.has(word);
    });
    const missedWords = Array.from(new Map(
      newlyMissed.map((token) => [normalizeClozeAnswer(token.text), token.text]),
    ).values());
    missedWords.forEach((word) => reportedMistakes.current.add(normalizeClozeAnswer(word)));
    if (missedWords.length > 0) {
      setAutoSavedCount((current) => current + missedWords.length);
      onIncorrectWords(missedWords);
    }
    if (correct === blanks.length) onComplete();
    setChecked(true);
    setRevealed(false);
  };

  return (
    <section className="cloze-panel beginner-cloze" aria-label="范文完形填空">
      <div className="cloze-heading"><div><span className="eyebrow coral">ACTIVE RECALL</span><h2>范文完形填空</h2></div><span>{filled} / {blanks.length} 已填</span></div>
      <div className={completed ? "item-progress-note completed" : "item-progress-note"}><span>{completed ? "✓ 本篇已完成，已计入总进度" : "本篇尚未完成"}</span>{completed && <button type="button" onClick={() => { onResetProgress(); reset(level, round + 1); }}>清空本篇，重新练习</button>}</div>
      <p className="cloze-intro">先在“背诵范文”里理解和跟读，再回来补全空格。拼写不区分大小写。</p>
      <div className="cloze-levels" role="group" aria-label="选择完形填空难度">
        {([[
          "standard", "初级 · 少量挖空"],
          ["intensive", "强化 · 重点挖空"],
          ["mastery", "熟练 · 大量挖空"],
        ] as [ClozeLevel, string][]).map(([value, label]) => <button type="button" key={value} className={level === value ? "active" : ""} onClick={() => reset(value, round)}>{label}</button>)}
      </div>
      <div className="cloze-copy">
        {tokens.map((token) => {
          if (!token.blank) return <span key={token.index}>{token.text}</span>;
          const value = entries[token.index] ?? "";
          const isCorrect = normalizeClozeAnswer(value) === normalizeClozeAnswer(token.text);
          const state = checked ? (isCorrect ? "correct" : "wrong") : "";
          return <input key={token.index} value={value} className={state} style={{ width: `${Math.max(5, Math.min(14, token.text.length + 1))}ch` }} onChange={(event) => { setEntries((current) => ({ ...current, [token.index]: event.target.value })); setChecked(false); setRevealed(false); }} aria-label={`第 ${blankOrder.get(token.index)} 空，共 ${blanks.length} 空`} autoComplete="off" autoCapitalize="none" spellCheck={false} />;
        })}
      </div>
      {checked && <div className={correct === blanks.length ? "cloze-result success" : "cloze-result"}><span>{revealed ? "答案已显示。建议朗读一遍后换一组空格。" : correct === blanks.length ? "全部正确，可以进入更高难度或开始开口练习。" : `答对 ${correct} / ${blanks.length}，还有 ${mistakes.length} 个空需要修改。`}</span>{autoSavedCount > 0 && <small>{autoSavedCount} 个填错单词已加入生词本</small>}</div>}
      <div className="cloze-actions"><button type="button" className="cloze-check" disabled={!filled} onClick={checkAnswers}>检查答案</button><button type="button" onClick={revealAnswers}>显示答案</button><button type="button" onClick={() => reset(level, round + 1)}>换一组空格</button></div>
    </section>
  );
}

function SpeakingExercise({ snapshot, savedWords, savedSentences, onSaveWord, onSaveWords, onSaveSentence, onFinish, onCompleteCloze, onResetCloze }: {
  snapshot: StudySnapshot;
  savedWords: SavedVocabularyWord[];
  savedSentences: SavedSentence[];
  onSaveWord: (word: SavedVocabularyWord) => void;
  onSaveWords: (words: SavedVocabularyWord[]) => void;
  onSaveSentence: (sentence: SavedSentence) => void;
  onFinish: (attempt: PracticeAttempt) => void;
  onCompleteCloze: (id: string) => void;
  onResetCloze: (ids: string[]) => void;
}) {
  type Phase = "idle" | "prep" | "speak" | "review";
  type StudyMode = "model" | "cloze" | "speak";
  const [practiceMode, setPracticeMode] = useState<"training" | "mock">("training");
  const [part, setPart] = useState<SpeakingPart>("part1");
  const [topicIndex, setTopicIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [notes, setNotes] = useState("");
  const [ratings, setRatings] = useState<Record<string, number>>({ fluency: 6, vocabulary: 6, grammar: 6, pronunciation: 6 });
  const [seconds, setSeconds] = useState(30);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [lookupContext, setLookupContext] = useState<DictionaryLookupContext>({});
  const [lookup, setLookup] = useState<DictionaryResult | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [playingKey, setPlayingKey] = useState("");
  const [studyMode, setStudyMode] = useState<StudyMode>("model");
  const [part2AudioTracks, setPart2AudioTracks] = useState<Record<string, {
    src: string;
    sentences: { start: number; duration: number }[];
  }>>({});
  const modelAudioRef = useRef<HTMLAudioElement | null>(null);
  const wordAudioRef = useRef<HTMLAudioElement | null>(null);
  const bank = part === "part1" ? PART1_QUESTIONS : part === "part2" ? PART2_CUES : PART3_QUESTIONS;
  const current = bank[topicIndex];
  const prompt = "question" in current ? current.question : current.prompt;
  const answer = current.answer;
  const translation = SPEAKING_TRANSLATIONS[current.id] ?? "这篇范文的中文翻译正在补充中，请先通过逐句结构和查词理解英文。";
  const phrases = current.phrases;
  const bullets = "bullets" in current ? current.bullets : [];
  const coaching = "coaching" in current && typeof current.coaching === "string"
    ? current.coaching
    : "回答后补充原因和具体细节，让表达自然展开。";
  const completedClozeCount = bank.filter((item) => snapshot.learningProgress.speakingCloze[item.id]?.status === "completed").length;
  const currentClozeCompleted = snapshot.learningProgress.speakingCloze[current.id]?.status === "completed";

  useEffect(() => {
    let active = true;
    fetch("/audio/part2/manifest.json")
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("audio manifest unavailable")))
      .then((manifest: { tracks?: { id: string; src: string; sentences: { start: number; duration: number }[] }[] }) => {
        if (!active) return;
        setPart2AudioTracks(Object.fromEntries((manifest.tracks ?? []).map((track) => [track.id, {
          src: track.src,
          sentences: track.sentences,
        }])));
      })
      .catch(() => {
        // The natural browser voice remains available when the neural MP3 library cannot load.
      });
    return () => {
      active = false;
      window.speechSynthesis?.cancel();
      modelAudioRef.current?.pause();
      modelAudioRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!selectedWord) return;
    let active = true;
    void lookupDictionaryWord(selectedWord, lookupContext).then((result) => {
      if (!active) return;
      setLookup(result);
      setLookupLoading(false);
    });
    return () => { active = false; };
  }, [lookupContext, selectedWord]);

  useEffect(() => {
    if (phase !== "prep" && phase !== "speak") return;
    const timer = window.setTimeout(() => {
      if (seconds > 1) {
        setSeconds(seconds - 1);
      } else if (phase === "prep") {
        setSeconds(120);
        setPhase("speak");
      } else {
        setPhase("review");
      }
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [phase, seconds]);

  const resetPractice = (nextPart = part, nextIndex = topicIndex) => {
    window.speechSynthesis?.cancel();
    modelAudioRef.current?.pause();
    modelAudioRef.current = null;
    setPart(nextPart);
    setTopicIndex(nextIndex);
    setPhase("idle");
    setSeconds(nextPart === "part1" ? 30 : 60);
    setNotes("");
    setSelectedWord(null);
    setLookupContext({});
    setLookup(null);
    setPlayingKey("");
    setStudyMode("model");
  };
  const startPractice = () => {
    window.speechSynthesis?.cancel();
    modelAudioRef.current?.pause();
    modelAudioRef.current = null;
    setPlayingKey("");
    if (part === "part2") {
      setSeconds(60);
      setPhase("prep");
    } else {
      setSeconds(part === "part1" ? 30 : 60);
      setPhase("speak");
    }
  };
  const startSpeak = () => { window.speechSynthesis?.cancel(); modelAudioRef.current?.pause(); modelAudioRef.current = null; setPlayingKey(""); setSeconds(120); setPhase("speak"); };
  const moveTopic = (offset: number) => {
    const next = (topicIndex + offset + bank.length) % bank.length;
    resetPractice(part, next);
  };
  const randomTopic = () => {
    const next = bank.length > 1
      ? (topicIndex + 1 + Math.floor(Math.random() * (bank.length - 1))) % bank.length
      : 0;
    resetPractice(part, next);
  };
  const toggleSpeech = (text: string, key: string, rate = 0.94, sentenceIndex?: number) => {
    if (playingKey === key) {
      window.speechSynthesis?.cancel();
      wordAudioRef.current?.pause();
      wordAudioRef.current = null;
      modelAudioRef.current?.pause();
      modelAudioRef.current = null;
      setPlayingKey("");
      return;
    }
    window.speechSynthesis?.cancel();
    wordAudioRef.current?.pause();
    wordAudioRef.current = null;
    modelAudioRef.current?.pause();
    modelAudioRef.current = null;
    if (key.startsWith("word:")) {
      // 单词发音优先使用预生成的男声美音 mp3，缺失时兜底到浏览器语音
      void playWordAudio(text, {
        onStart: () => setPlayingKey(key),
        onEnd: () => setPlayingKey(""),
      }).then((audio) => {
        if (audio) {
          wordAudioRef.current = audio;
        } else {
          const started = playAmericanEnglish(text, {
            rate,
            onStart: () => setPlayingKey(key),
            onEnd: () => setPlayingKey(""),
          });
          if (!started) setPlayingKey("");
        }
      });
      return;
    }
    const neuralTrack = part === "part2" && (key === "model:full" || key.startsWith("sentence:"))
      ? part2AudioTracks[current.id]
      : undefined;
    if (neuralTrack) {
      const segment = sentenceIndex === undefined ? undefined : neuralTrack.sentences[sentenceIndex];
      const audio = new Audio(neuralTrack.src);
      modelAudioRef.current = audio;
      audio.preload = "auto";
      const finish = () => {
        if (modelAudioRef.current !== audio) return;
        audio.pause();
        modelAudioRef.current = null;
        setPlayingKey("");
      };
      audio.onplay = () => setPlayingKey(key);
      audio.onended = finish;
      audio.onerror = () => {
        if (modelAudioRef.current === audio) modelAudioRef.current = null;
        const started = playAmericanEnglish(text, {
          rate,
          onStart: () => setPlayingKey(key),
          onEnd: () => setPlayingKey(""),
        });
        if (!started) setPlayingKey("");
      };
      if (segment) {
        const segmentEnd = segment.start + segment.duration;
        audio.ontimeupdate = () => {
          if (audio.currentTime >= segmentEnd - 0.04) finish();
        };
      }
      const begin = () => {
        if (segment) audio.currentTime = segment.start;
        void audio.play().catch(() => audio.onerror?.(new Event("error")));
      };
      if (audio.readyState >= 1) begin();
      else audio.onloadedmetadata = begin;
      return;
    }
    const started = playAmericanEnglish(text, {
      rate,
      onStart: () => setPlayingKey(key),
      onEnd: () => setPlayingKey(""),
    });
    if (!started) setPlayingKey("");
  };
  const chooseWord = (word: string, context: DictionaryLookupContext) => {
    window.speechSynthesis?.cancel();
    modelAudioRef.current?.pause();
    modelAudioRef.current = null;
    setPlayingKey("");
    setLookup(null);
    setLookupLoading(true);
    setLookupContext({ ...context, examples: speakingExamplesForWord(word, context) });
    setSelectedWord(word);
    setStudyMode("model");
    if (window.innerWidth <= 760) window.setTimeout(() => document.getElementById("speaking-word-lookup")?.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
  };
  const closeWordLookup = () => {
    setSelectedWord(null);
    setLookupContext({});
    setLookup(null);
    setLookupLoading(false);
  };
  const wordSaved = selectedWord
    ? savedWords.some((word) => normalizeDictionaryWord(word.word) === selectedWord)
    : false;
  const saveSelectedWord = () => {
    if (!selectedWord) return;
    onSaveWord({
      id: `saved:${selectedWord}`,
      word: selectedWord,
      phonetic: lookup?.phonetic || "/—/",
      meaning: lookup?.translation || lookup?.definition || "待补充释义",
      example: lookup?.contextEnglish || lookup?.example || answer,
      family: lookup?.partOfSpeech || "",
      partOfSpeech: lookup?.partOfSpeech || "",
      contextTranslation: lookup?.contextTranslation || "",
      addedAt: new Date().toISOString(),
      source: "speaking",
    });
  };
  const saveClozeMistakes = (missedWords: string[]) => {
    const words = Array.from(new Set(missedWords.map(normalizeDictionaryWord).filter(Boolean)));
    void Promise.all(words.map(async (word) => {
      const result = await lookupDictionaryWord(word, {
        english: answer,
        chinese: translation,
        examples: speakingExamplesForWord(word, { english: answer, chinese: translation }),
      });
      return {
        id: `saved:${word}`,
        word,
        phonetic: result.phonetic,
        meaning: result.translation || result.definition || "完形填空错词（释义待补充）",
        example: result.contextEnglish || result.example || answer,
        family: result.partOfSpeech || "完形填空自动收录",
        partOfSpeech: result.partOfSpeech || "",
        contextTranslation: result.contextTranslation || "",
        addedAt: new Date().toISOString(),
        source: "speaking" as const,
      };
    })).then(onSaveWords);
  };
  const average = Object.values(ratings).reduce((sum, value) => sum + value, 0) / 4;

  return (
    <div className={`speaking-bank-shell speaking-${part} speaking-phase-${phase} speaking-study-${studyMode}`}>
      <div className="exam-mode-bar speaking-mode-bar">
        <div className="exam-mode-tabs" role="tablist" aria-label="口语训练模式">
          <button role="tab" aria-selected={practiceMode === "training"} className={practiceMode === "training" ? "active" : ""} onClick={() => setPracticeMode("training")}>Part 1–3专项</button>
          <button role="tab" aria-selected={practiceMode === "mock"} className={practiceMode === "mock" ? "active" : ""} onClick={() => { window.speechSynthesis?.cancel(); setPracticeMode("mock"); }}>11–14分钟完整模考</button>
        </div>
        <div className="official-score-note"><b>官方四项标准</b><span>流利连贯 · 词汇 · 语法 · 发音</span></div>
      </div>
      {practiceMode === "mock" ? <Suspense fallback={<ModuleLoader />}><SpeakingMockExam onFinish={onFinish} /></Suspense> : <>
      <div className="speaking-bank-toolbar">
        <div className="part-tabs" role="tablist" aria-label="口语题库分区">
              <button role="tab" aria-selected={part === "part1"} className={part === "part1" ? "active" : ""} onClick={() => resetPractice("part1", 0)}>Part 1 <span>{PART1_QUESTIONS.length}题</span></button>
              <button role="tab" aria-selected={part === "part2"} className={part === "part2" ? "active" : ""} onClick={() => resetPractice("part2", 0)}>Part 2 <span>{PART2_CUES.length}题</span></button>
              <button role="tab" aria-selected={part === "part3"} className={part === "part3" ? "active" : ""} onClick={() => resetPractice("part3", 0)}>Part 3 <span>{PART3_QUESTIONS.length}题</span></button>
        </div>
        <div className="topic-controls">
          <button onClick={() => moveTopic(-1)} aria-label="上一题">←</button>
          <label className="sr-only" htmlFor="speaking-topic">选择口语题目</label>
          <select id="speaking-topic" value={topicIndex} onChange={(event) => resetPractice(part, Number(event.target.value))}>
            {bank.map((item, index) => <option value={index} key={item.id}>{String(index + 1).padStart(2, "0")} · {item.topic}</option>)}
          </select>
          <span>{String(topicIndex + 1).padStart(2, "0")} / {bank.length}</span>
          <button onClick={() => moveTopic(1)} aria-label="下一题">→</button>
          <button className="random-topic" onClick={randomTopic}>随机一题</button>
        </div>
      </div>
      <section className="module-progress-strip" aria-label={`口语 ${part.replace("part", "Part ")} 完形进度`}>
        <div><span>{part.replace("part", "Part ")} 完形总进度</span><strong>{completedClozeCount} / {bank.length} 篇</strong></div>
        <div className="module-progress-track"><i style={{ width: `${bank.length ? (completedClozeCount / bank.length) * 100 : 0}%` }} /></div>
        <button type="button" disabled={!completedClozeCount} onClick={() => onResetCloze(bank.map((item) => item.id))}>清空本 Part 全部进度</button>
      </section>

      <div className={phase === "idle" ? "speaking-layout speaking-study-layout" : "speaking-layout"}>
        <article className={part === "part1" ? "cue-card part1-cue" : "cue-card"}>
          <span className="eyebrow light">SPEAKING · {part === "part1" ? "PART 1" : part === "part2" ? "PART 2" : "PART 3"} · {String(topicIndex + 1).padStart(2, "0")}</span>
          <small>{current.topic}</small>
          <p className="clickable-question"><ClickableEnglish text={prompt} selectedWord={selectedWord} onSelectWord={chooseWord} /></p>
          {bullets.length > 0 ? <><span>You should say:</span><ul>{bullets.map((bullet) => <li key={bullet}><ClickableEnglish text={bullet} selectedWord={selectedWord} onSelectWord={chooseWord} /></li>)}</ul></> : <div className="part1-guidance"><b>{part === "part3" ? "Band 7展开结构" : "回答结构"}</b><span>{part === "part3" ? "观点 · 原因 · 例子 · 限定" : "直接回答 · 补充原因 · 给出细节"}</span></div>}
          {part === "part3" && <p className="part3-coaching">{coaching}</p>}
          <div className="cue-footer">{part === "part1" ? "建议回答 20–30 秒" : part === "part2" ? "准备 1 分钟 · 作答 1–2 分钟" : "建议回答 45–60 秒 · 展开抽象讨论"}</div>
        </article>

        <section className="speaking-workspace">
          {phase === "idle" && <div className="beginner-study-panel">
            <div className="study-route-head"><div><span className="eyebrow coral">BEGINNER LEARNING ROUTE</span><h2>先背会，再开口</h2><p>每道题都按理解、背诵和独立作答三个阶段学习，不要求你一上来就自己说。</p></div><div className="study-saved-counts"><strong>{savedWords.length}<small>生词</small></strong><strong>{savedSentences.length}<small>精句</small></strong></div></div>
            <div className="study-step-tabs" role="tablist" aria-label="口语学习步骤">
              <button role="tab" aria-selected={studyMode === "model"} className={studyMode === "model" ? "active" : ""} onClick={() => setStudyMode("model")}><b>01</b><span>背诵范文<small>中文 · 拆句 · 查词</small></span></button>
              <button role="tab" aria-selected={studyMode === "cloze"} className={studyMode === "cloze" ? "active" : ""} onClick={() => setStudyMode("cloze")}><b>02</b><span>完形填空<small>初级到熟练</small></span></button>
              <button role="tab" aria-selected={studyMode === "speak"} className={studyMode === "speak" ? "active" : ""} onClick={() => setStudyMode("speak")}><b>03</b><span>自己开口<small>计时练习</small></span></button>
            </div>

            {studyMode === "model" && <div className="model-learning-view">
              <div className="model-learning-head"><div><span className="eyebrow">BAND 6.5–7.0 MODEL</span><h3>可直接学习的参考范文</h3><p>先读中文，再按句子结构理解英文；点击任意英文单词可以查词。</p></div><button type="button" className={playingKey === "model:full" ? "model-play playing" : "model-play"} onClick={() => toggleSpeech(answer, "model:full", 0.94)}>{playingKey === "model:full" ? "■ 停止播放" : part === "part2" ? "🔊 美式真人感朗读" : "🔊 自然美式朗读"}</button></div>
              <div className="model-learning-grid">
                <SentenceStudy text={answer} translation={translation} part={part} sourceId={current.id} topic={current.topic} savedSentences={savedSentences} selectedWord={selectedWord} playingKey={playingKey} onSelectWord={chooseWord} onPlay={toggleSpeech} onSaveSentence={onSaveSentence} />
                <div className="model-side-tools">
                  {selectedWord ? <aside id="speaking-word-lookup" className="word-lookup compact-lookup" aria-live="polite">
                    <div className="word-lookup-head"><div><span>WORD LOOKUP</span><strong>{selectedWord}</strong>{lookup?.phonetic && <em>{lookup.phonetic}</em>}</div><div><button type="button" className={playingKey === `word:${selectedWord}` ? "word-sound playing" : "word-sound"} onClick={() => toggleSpeech(selectedWord, `word:${selectedWord}`, 0.78)} aria-label={`播放 ${selectedWord} 的美式发音`}>{playingKey === `word:${selectedWord}` ? "■" : "🔊"}</button><button type="button" className="lookup-close" onClick={closeWordLookup} aria-label="关闭单词释义">×</button></div></div>
                    {lookupLoading ? <div className="lookup-loading"><i /><span>正在结合本句查询释义…</span></div> : lookup?.found ? <div className="lookup-content">
                      {lookup.contextTranslation && <div className="lookup-context"><span>所在句中文</span><p>{lookup.contextEnglish}</p><strong>{lookup.contextTranslation}</strong></div>}
                      {lookup.translation && <div className="lookup-translation"><span>本句词性与释义</span><div><em>{formatPartOfSpeech(lookup.partOfSpeech)}</em><strong>{lookup.translation}</strong></div></div>}
                      {lookup.examples.length > 0 && <div className="lookup-examples"><span>例句 · {lookup.examples.length} 句</span>{lookup.examples.filter((example, index, all) => all.findIndex((item) => item.english.trim().toLowerCase() === example.english.trim().toLowerCase()) === index).map((example, index) => { const key = `lookup-example:${index}:${example.english}`; return <article key={`${key}:${index}`}><b>{String(index + 1).padStart(2, "0")}</b><div><p>{example.english}</p>{example.chinese && <small>{example.chinese}</small>}</div><button type="button" className={playingKey === key ? "playing" : ""} onClick={() => toggleSpeech(example.english, key, 0.92)} aria-label={`播放例句 ${index + 1}`}>{playingKey === key ? "■" : "🔊"}</button></article>; })}</div>}
                      <button type="button" className={wordSaved ? "save-word saved" : "save-word"} disabled={wordSaved} onClick={saveSelectedWord}>{wordSaved ? "✓ 已在生词本" : "+ 加入生词本"}</button>
                    </div> : <div className="lookup-empty lookup-empty-save"><p>暂时没有查到可靠释义，仍可听发音并先收藏到生词本。</p><button type="button" className={wordSaved ? "save-word saved" : "save-word"} disabled={wordSaved} onClick={saveSelectedWord}>{wordSaved ? "✓ 已在生词本" : "+ 加入生词本"}</button></div>}
                  </aside> : <div className="word-tool-empty model-word-empty"><span>ABC</span><div><b>点击范文里的单词</b><p>这里会显示中文释义、2–3 条例句、音标、发音和收藏按钮。</p></div></div>}
                  <div className="phrase-bank compact-phrases"><span>本题高频表达 · 点击跟读</span><div>{phrases.map((phrase) => <button key={phrase} type="button" onClick={() => toggleSpeech(phrase, `phrase:${phrase}`, 0.94)} className={playingKey === `phrase:${phrase}` ? "playing" : ""}>{playingKey === `phrase:${phrase}` ? "■ " : "🔊 "}{phrase}</button>)}</div></div>
                </div>
              </div>
              <div className="study-next-action"><span>理解并跟读几遍后，用填空检查自己是不是真的记住了。</span><button className="button dark" onClick={() => setStudyMode("cloze")}>下一步：完形填空 →</button></div>
            </div>}

            {studyMode === "cloze" && <div className="cloze-learning-view">
              <div className="cloze-translation-help"><span>中文提示</span><p>{translation}</p></div>
              <ClozePractice key={`${current.id}:cloze`} text={answer} seed={current.id} completed={currentClozeCompleted} onComplete={() => onCompleteCloze(current.id)} onResetProgress={() => onResetCloze([current.id])} onIncorrectWords={saveClozeMistakes} />
              <div className="study-next-action"><button className="button subtle" onClick={() => setStudyMode("model")}>← 返回范文学习</button><button className="button dark" onClick={() => setStudyMode("speak")}>熟练了：准备自己说 →</button></div>
            </div>}

            {studyMode === "speak" && <div className="speaking-ready-panel">
              <span className="ready-number">03</span><div><span className="eyebrow coral">NOW SPEAK</span><h3>合上范文，自己组织答案</h3><p>{part === "part1" ? "先直接回答，再说原因，最后补一个具体细节。" : part === "part2" ? "只写关键词，按人物/地点、经过、结果和感受连续说1–2分钟。" : "按观点、原因、例子、限定四步展开，不必逐字复制范文。"}</p><ul><li>卡住时先用已经背过的句型开头</li><li>允许替换人物、地点和经历，让答案变成你自己的</li><li>完成后再按雅思四项标准自评</li></ul></div><button className="button primary" onClick={startPractice}>{part === "part1" ? "开始 30 秒作答" : part === "part2" ? "开始 1 分钟准备" : "开始 60 秒讨论"}</button>
            </div>}
          </div>}

          {(phase === "prep" || phase === "speak") && <>
            <div className="speaking-timer"><span className="eyebrow coral">{phase === "prep" ? "PREPARATION" : "SPEAKING"}</span><strong>{formatClock(seconds)}</strong><p>{phase === "prep" ? "只记关键词，不写完整句。" : part === "part1" ? "用完整句直接作答，并补充一个具体细节。" : part === "part2" ? "尽量持续说满两分钟，保持自然节奏。" : "从社会层面展开，给出原因、例子并作适当限定。"}</p></div>
            <label htmlFor="speaking-notes">准备提纲</label><textarea id="speaking-notes" value={notes} placeholder={part === "part1" ? "answer / reason / detail…" : part === "part2" ? "who / where / what / why…" : "position / reason / example / caveat…"} onChange={(event) => setNotes(event.target.value)} />
            <div className="speaking-actions">{phase === "prep" && <button className="button dark" onClick={startSpeak}>提前开始作答</button>}{phase === "speak" && <button className="button dark" onClick={() => setPhase("review")}>完成作答</button>}</div>
          </>}

          {phase === "review" && <div className="rating-panel">
          <span className="eyebrow coral">SELF REVIEW</span><h2>根据刚才的表现完成自评</h2>
          {[
            ["fluency", "Fluency & Coherence", "流利度与连贯性"],
            ["vocabulary", "Lexical Resource", "词汇丰富度"],
            ["grammar", "Grammatical Range", "语法多样性"],
            ["pronunciation", "Pronunciation", "发音清晰度"],
          ].map(([key, english, chinese]) => <label className="rating-row" key={key}><span><b>{english}</b><small>{chinese}</small></span><input type="range" min="4" max="9" step="0.5" value={ratings[key]} onChange={(event) => setRatings((current) => ({ ...current, [key]: Number(event.target.value) }))} /><strong>{ratings[key].toFixed(1)}</strong></label>)}
          <div className="rating-total"><span>本次自评</span><strong>{average.toFixed(1)}</strong></div>
          <button className="button primary full" onClick={() => onFinish({ id: crypto.randomUUID(), skill: "speaking", date: dateKey(), score: average, maxScore: 9 })}>保存自评并完成练习</button>
        </div>}
        </section>
      </div>
      </>}
    </div>
  );
}

function VocabularyCenter({ snapshot, setSnapshot, onOpenSpeaking }: {
  snapshot: StudySnapshot;
  setSnapshot: Dispatch<SetStateAction<StudySnapshot>>;
  onOpenSpeaking: () => void;
}) {
  type Library = "words" | "sentences";
  type CenterMode = "collection" | "review" | "dictation";
  type AnswerState = "idle" | "wrong" | "correct" | "revealed";
  const [library, setLibrary] = useState<Library>("words");
  const [mode, setMode] = useState<CenterMode>("collection");
  const [search, setSearch] = useState("");
  const [collectionPage, setCollectionPage] = useState(0);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [wordInput, setWordInput] = useState("");
  const [wordState, setWordState] = useState<AnswerState>("idle");
  const [wordMastered, setWordMastered] = useState(false);
  const [wordHadError, setWordHadError] = useState(false);
  const [sentenceQueue, setSentenceQueue] = useState<SavedSentence[]>([]);
  const [sentenceIndex, setSentenceIndex] = useState(0);
  const [sentenceInput, setSentenceInput] = useState("");
  const [sentenceState, setSentenceState] = useState<AnswerState>("idle");
  const [sentenceFeedback, setSentenceFeedback] = useState<ReturnType<typeof scoreSentenceDictation> | null>(null);
  const [sentenceCorrectIds, setSentenceCorrectIds] = useState<string[]>([]);
  const [sentenceRetryIds, setSentenceRetryIds] = useState<string[]>([]);
  const wordTimer = useRef<number | null>(null);
  const wordInputRef = useRef<HTMLInputElement | null>(null);
  const sentenceInputRef = useRef<HTMLTextAreaElement | null>(null);
  const today = dateKey();
  const words = snapshot.savedWords;
  const sentences = snapshot.savedSentences;
  const [wordOrder, setWordOrder] = useState<WordDictationOrder>(
    () => snapshot.wordDictation[today]?.order ?? "sequential",
  );
  const dueWords = words.filter((word) => !snapshot.vocabulary[word.id] || snapshot.vocabulary[word.id].nextReview <= today);
  const reviewWord = words[reviewIndex];
  const wordProgress = snapshot.wordDictation[today];
  const dictationWord = wordProgress
    ? wordProgress.queue.map((id) => words.find((word) => word.id === id)).find(Boolean)
    : undefined;
  const wordCorrect = wordProgress?.correctWordIds.length ?? 0;
  const wordSessionTotal = wordProgress
    ? new Set([...wordProgress.completedWordIds, ...wordProgress.queue]).size
    : words.length;
  const retryableWordCount = wordProgress
    ? words.filter((word) => !wordProgress.correctWordIds.includes(word.id)).length
    : words.length;
  const dictationSentence = sentenceQueue[sentenceIndex];
  const reviewedToday = snapshot.daily[today]?.vocabularyReviews ?? 0;
  const query = search.trim().toLowerCase();
  const filteredWords = words.filter((word) => !query || word.word.toLowerCase().includes(query) || word.meaning.toLowerCase().includes(query));
  const filteredSentences = sentences.filter((sentence) => !query || sentence.english.toLowerCase().includes(query) || sentence.chinese.toLowerCase().includes(query) || sentence.topic.toLowerCase().includes(query));
  const wordsPerPage = 100;
  const sentencesPerPage = 12;
  const wordPageCount = Math.max(1, Math.ceil(filteredWords.length / wordsPerPage));
  const sentencePageCount = Math.max(1, Math.ceil(filteredSentences.length / sentencesPerPage));
  const activePageCount = library === "words" ? wordPageCount : sentencePageCount;
  const safeCollectionPage = Math.min(collectionPage, activePageCount - 1);
  const visibleWords = filteredWords.slice(safeCollectionPage * wordsPerPage, (safeCollectionPage + 1) * wordsPerPage);
  const visibleSentences = filteredSentences.slice(safeCollectionPage * sentencesPerPage, (safeCollectionPage + 1) * sentencesPerPage);
  const refreshedWordKeys = useRef(new Set<string>());

  useEffect(() => {
    if (library !== "words" || mode !== "collection") return;
    const candidates = [];
    for (const word of visibleWords) {
      if (candidates.length >= 6) break;
      const refreshKey = `${word.id}|${word.example}|${word.meaning}|${word.partOfSpeech ?? ""}`;
      if (refreshedWordKeys.current.has(refreshKey)) continue;
      refreshedWordKeys.current.add(refreshKey);
      candidates.push(word);
    }
    if (!candidates.length) return;
    let active = true;
    void Promise.all(candidates.map(async (word) => ({
      word,
      result: await lookupDictionaryWord(word.word, {
        english: word.example,
        chinese: word.contextTranslation,
      }),
    }))).then((updates) => {
      if (!active) return;
      setSnapshot((current) => {
        let changed = false;
        const savedWords = current.savedWords.map((saved) => {
          const update = updates.find(({ word }) => word.id === saved.id)?.result;
          if (!update?.found) return saved;
          const next = {
            ...saved,
            phonetic: update.phonetic || saved.phonetic,
            meaning: update.translation || saved.meaning,
            partOfSpeech: update.partOfSpeech || saved.partOfSpeech,
            family: update.partOfSpeech || saved.family,
            contextTranslation: update.contextTranslation || saved.contextTranslation,
          };
          if (next.phonetic === saved.phonetic && next.meaning === saved.meaning && next.partOfSpeech === saved.partOfSpeech && next.family === saved.family && next.contextTranslation === saved.contextTranslation) return saved;
          changed = true;
          return next;
        });
        return changed ? { ...current, savedWords } : current;
      });
    });
    return () => { active = false; };
  }, [library, mode, setSnapshot, visibleWords]);

  useEffect(() => () => {
    if (wordTimer.current) window.clearTimeout(wordTimer.current);
    window.speechSynthesis?.cancel();
  }, []);

  useEffect(() => {
    if (mode !== "dictation") return;
    if (library === "words") {
      if (wordState !== "idle") return;
      const focusFrame = window.requestAnimationFrame(() => {
        wordInputRef.current?.focus({ preventScroll: true });
      });
      return () => window.cancelAnimationFrame(focusFrame);
    }
    sentenceInputRef.current?.focus();
  }, [dictationWord?.id, library, mode, sentenceIndex, wordState]);

  const resetSession = () => {
    if (wordTimer.current) window.clearTimeout(wordTimer.current);
    setReviewIndex(0);
    setWordInput("");
    setWordState("idle");
    setWordMastered(false);
    setWordHadError(false);
    setSentenceQueue([]);
    setSentenceIndex(0);
    setSentenceInput("");
    setSentenceState("idle");
    setSentenceFeedback(null);
    setSentenceCorrectIds([]);
    setSentenceRetryIds([]);
    setCollectionPage(0);
  };

  const chooseLibrary = (next: Library) => {
    window.speechSynthesis?.cancel();
    resetSession();
    setLibrary(next);
    setMode("collection");
    setSearch("");
  };

  const chooseMode = (next: CenterMode) => {
    window.speechSynthesis?.cancel();
    resetSession();
    setMode(next);
    if (library === "sentences" && next === "dictation") setSentenceQueue([...sentences]);
    if (library === "words" && next === "dictation") {
      const order = snapshot.wordDictation[today]?.order ?? wordOrder;
      setWordOrder(order);
      setSnapshot((current) => ({
        ...current,
        wordDictation: {
          ...current.wordDictation,
          [today]: resumeWordDictationProgress(
            current.savedWords.map((word) => word.id),
            order,
            current.wordDictation[today],
          ),
        },
      }));
    }
  };

  const chooseWordOrder = (order: WordDictationOrder) => {
    setWordOrder(order);
    setWordInput("");
    setWordState("idle");
    setWordMastered(false);
    setWordHadError(false);
    setSnapshot((current) => ({
      ...current,
      wordDictation: {
        ...current.wordDictation,
        [today]: resumeWordDictationProgress(
          current.savedWords.map((word) => word.id),
          order,
          current.wordDictation[today],
        ),
      },
    }));
  };

  const markReviewed = (word: SavedVocabularyWord, rating: "again" | "hard" | "good") => {
    setSnapshot((current) => {
      const day = current.daily[today] ?? { completedTaskIds: [], vocabularyReviews: 0 };
      return {
        ...current,
        vocabulary: { ...current.vocabulary, [word.id]: nextVocabularyReview(current.vocabulary[word.id], rating, today) },
        daily: { ...current.daily, [today]: { ...day, vocabularyReviews: day.vocabularyReviews + 1 } },
      };
    });
  };

  const removeWord = (id: string) => {
    setSnapshot((current) => {
      const removedWord = current.savedWords.find((word) => word.id === id);
      const vocabulary = { ...current.vocabulary };
      delete vocabulary[id];
      const wordDictation = Object.fromEntries(
        Object.entries(current.wordDictation).map(([key, progress]) => [key, {
          ...progress,
          queue: progress.queue.filter((wordId) => wordId !== id),
          completedWordIds: progress.completedWordIds.filter((wordId) => wordId !== id),
          correctWordIds: progress.correctWordIds.filter((wordId) => wordId !== id),
        }]),
      );
      return {
        ...current,
        vocabulary,
        wordDictation,
        savedWords: current.savedWords.filter((word) => word.id !== id),
        savedWordDeletions: removedWord
          ? { ...current.savedWordDeletions, [removedWord.word.trim().toLowerCase()]: new Date().toISOString() }
          : current.savedWordDeletions,
      };
    });
    resetSession();
  };

  const removeSentence = (id: string) => {
    setSnapshot((current) => {
      const removedSentence = current.savedSentences.find((sentence) => sentence.id === id);
      return {
        ...current,
        savedSentences: current.savedSentences.filter((sentence) => sentence.id !== id),
        savedSentenceDeletions: removedSentence
          ? { ...current.savedSentenceDeletions, [normalizeDictationText(removedSentence.english)]: new Date().toISOString() }
          : current.savedSentenceDeletions,
      };
    });
    resetSession();
  };

  const nextWord = () => {
    setWordInput("");
    setWordState("idle");
    setWordMastered(false);
    setWordHadError(false);
  };

  const handleWordInput = (value: string) => {
    setWordInput(value);
    if (!dictationWord || wordState === "correct" || wordState === "revealed") return;
    if (value.trim().toLowerCase().replaceAll("’", "'") === dictationWord.word.trim().toLowerCase().replaceAll("’", "'")) {
      setWordState("correct");
      setWordMastered((dictationWord.dictationCorrectStreak ?? 0) + 1 >= 5);
      setSnapshot((current) => applyWordDictationResult(current, dictationWord.id, "correct", today).snapshot);
      wordTimer.current = window.setTimeout(nextWord, 650);
    } else if (wordState === "wrong") {
      setWordState("idle");
    }
  };

  const markWordWrong = () => {
    if (!dictationWord || !wordInput.trim() || wordState !== "idle") return;
    setWordState("wrong");
    setWordHadError(true);
    setSnapshot((current) => applyWordDictationResult(current, dictationWord.id, "wrong", today).snapshot);
  };

  const revealWord = () => {
    if (!dictationWord) return;
    setWordState("revealed");
    setWordMastered(false);
    if (!wordHadError) {
      setWordHadError(true);
      setSnapshot((current) => applyWordDictationResult(current, dictationWord.id, "wrong", today).snapshot);
    }
  };

  const clearRevealedWord = () => {
    setWordInput("");
    setWordState("idle");
    window.setTimeout(() => wordInputRef.current?.focus(), 0);
  };

  const restartWords = () => {
    setWordInput("");
    setWordState("idle");
    setWordMastered(false);
    setWordHadError(false);
    setSnapshot((current) => ({
      ...current,
      wordDictation: {
        ...current.wordDictation,
        [today]: restartWordDictationProgress(
          current.savedWords.map((word) => word.id),
          wordOrder,
          current.wordDictation[today],
        ),
      },
    }));
  };

  const scheduleSentenceRetry = (sentence: SavedSentence) => {
    if (sentenceRetryIds.includes(sentence.id)) return;
    setSentenceRetryIds((current) => [...current, sentence.id]);
    setSentenceQueue((current) => [...current, sentence]);
  };

  const checkSentence = () => {
    if (!dictationSentence || !sentenceInput.trim()) return;
    const feedback = scoreSentenceDictation(dictationSentence.english, sentenceInput);
    setSentenceFeedback(feedback);
    if (feedback.accuracy === 100) {
      setSentenceState("correct");
      setSentenceCorrectIds((current) => current.includes(dictationSentence.id) ? current : [...current, dictationSentence.id]);
    } else {
      setSentenceState("wrong");
      scheduleSentenceRetry(dictationSentence);
    }
  };

  const revealSentence = () => {
    if (!dictationSentence) return;
    setSentenceFeedback(scoreSentenceDictation(dictationSentence.english, sentenceInput));
    setSentenceInput(dictationSentence.english);
    setSentenceState("revealed");
    scheduleSentenceRetry(dictationSentence);
  };

  const nextSentence = () => {
    setSentenceIndex((current) => current + 1);
    setSentenceInput("");
    setSentenceState("idle");
    setSentenceFeedback(null);
  };

  const restartSentences = () => {
    resetSession();
    setSentenceQueue([...sentences]);
  };

  const emptyState = library === "words"
    ? <section className="empty-vocabulary-state"><span>Aa</span><h2>生词本还是空的</h2><p>进入口语专项，点击范文里的英文单词，查看中文释义、音标和发音后加入生词本。</p><button className="button primary" onClick={onOpenSpeaking}>去口语练习添加单词</button></section>
    : <section className="empty-vocabulary-state"><span>“ ”</span><h2>精句本还是空的</h2><p>进入口语专项，在逐句范文旁点击“+ 精句”，把值得背下来的表达收藏到这里。</p><button className="button primary" onClick={onOpenSpeaking}>去口语范文收藏精句</button></section>;

  const activeItemCount = library === "words" ? filteredWords.length : filteredSentences.length;
  const activePageSize = library === "words" ? wordsPerPage : sentencesPerPage;
  const rangeStart = activeItemCount ? safeCollectionPage * activePageSize + 1 : 0;
  const rangeEnd = Math.min((safeCollectionPage + 1) * activePageSize, activeItemCount);
  const notebookPagination = (library === "words" || activePageCount > 1) ? <div className="notebook-pagination" aria-label="收藏本翻页">
    <button type="button" disabled={safeCollectionPage === 0} onClick={() => setCollectionPage((current) => Math.max(0, current - 1))}>← 上一页</button>
    <span>第 <b>{safeCollectionPage + 1}</b> / {activePageCount} 页 <i>·</i> 本页 {rangeStart}–{rangeEnd}，共 {activeItemCount}</span>
    <button type="button" disabled={safeCollectionPage >= activePageCount - 1} onClick={() => setCollectionPage((current) => Math.min(activePageCount - 1, current + 1))}>下一页 →</button>
  </div> : null;

  return <div className="page vocabulary-center-page">
    <PageHeader eyebrow="WORDS & SENTENCES" title="词句收藏与默写" description="把生词和好句分开收藏，再用主动回忆和错题重练把它们真正记住。" action={<span className="review-count">今日单词复习 <b>{reviewedToday}</b> 个</span>} />
    <div className="library-switch" role="tablist" aria-label="选择收藏本">
      <button role="tab" aria-selected={library === "words"} className={library === "words" ? "active" : ""} onClick={() => chooseLibrary("words")}><span>Aa</span><b>生词本</b><small>{words.length} 个单词</small></button>
      <button role="tab" aria-selected={library === "sentences"} className={library === "sentences" ? "active" : ""} onClick={() => chooseLibrary("sentences")}><span>“ ”</span><b>精句本</b><small>{sentences.length} 句话</small></button>
    </div>
    <div className={`vocabulary-mode-tabs ${library === "sentences" ? "two-tabs" : ""}`} role="tablist" aria-label={library === "words" ? "生词学习模式" : "精句学习模式"}>
      <button role="tab" aria-selected={mode === "collection"} className={mode === "collection" ? "active" : ""} onClick={() => chooseMode("collection")}><span>01</span><b>{library === "words" ? "我的生词" : "我的精句"}</b><small>{library === "words" ? `${words.length} 个已收藏` : `${sentences.length} 句已收藏`}</small></button>
      {library === "words" && <button role="tab" aria-selected={mode === "review"} className={mode === "review" ? "active" : ""} onClick={() => chooseMode("review")}><span>02</span><b>单词复习</b><small>{dueWords.length} 个待复习</small></button>}
      <button role="tab" aria-selected={mode === "dictation"} className={mode === "dictation" ? "active" : ""} onClick={() => chooseMode("dictation")}><span>{library === "words" ? "03" : "02"}</span><b>{library === "words" ? "单词默写" : "整句默写"}</b><small>{library === "words" ? "看中文写英文" : "看中文 / 听音写整句"}</small></button>
    </div>

    {library === "words" && words.length === 0 && mode === "collection" ? emptyState : library === "sentences" && sentences.length === 0 ? emptyState : mode === "collection" && library === "words" ? <section className="wordbook-module">
      <div className="wordbook-toolbar"><div><span className="eyebrow coral natural-case">Vocabulary notebook</span><h2>我的生词</h2><p>每页固定 100 词，按收藏顺序排列；最后一页显示剩余单词。</p></div><label><span className="sr-only">搜索生词</span><input value={search} onChange={(event) => { setSearch(event.target.value); setCollectionPage(0); }} placeholder="搜索英文或中文释义" /></label></div>
      {filteredWords.length ? <><div className="wordbook-page-meta"><span>第 {safeCollectionPage + 1} 页</span><b>{rangeStart}–{rangeEnd}</b><small>每页 100 词</small></div><div className="wordbook-card-grid compact-word-grid">{visibleWords.map((word, index) => <article key={word.id}>
        <span className="wordbook-card-number">{String(safeCollectionPage * wordsPerPage + index + 1).padStart(3, "0")}</span>
        <div className="wordbook-card-head"><div><strong className="word-text" data-length={word.word.length > 18 ? "very-long" : word.word.length > 12 ? "long" : "normal"}>{word.word}</strong><span><PhoneticText text={word.word} existing={word.phonetic} /></span></div><em className="word-pos-badge">{formatPartOfSpeech(word.partOfSpeech || (/^(noun|verb|adjective|adverb)$/i.test(word.family) ? word.family : ""))}</em></div>
        <div className="wordbook-meaning"><span>中文释义</span><b>{word.meaning}</b></div>
        <div className="wordbook-mastery"><span>连续正确 <b>{word.dictationCorrectStreak ?? 0}/5</b></span><span className={(word.dictationWrongCount ?? 0) > 0 ? "has-errors" : ""}>默错 <b>{word.dictationWrongCount ?? 0}</b> 次</span></div>
        <div className="compact-notebook-actions"><button type="button" onClick={() => playAmericanEnglish(word.word, { rate: 0.82 })}>🔊 发音</button><button type="button" onClick={() => removeWord(word.id)}>移除</button></div>
      </article>)}</div>{notebookPagination}</> : <div className="wordbook-no-result">没有找到“{search}”</div>}
    </section> : mode === "collection" ? <section className="wordbook-module sentencebook-module">
      <div className="wordbook-toolbar"><div><span className="eyebrow coral">SAVED SENTENCES</span><h2>我的精句</h2></div><label><span className="sr-only">搜索精句</span><input value={search} onChange={(event) => { setSearch(event.target.value); setCollectionPage(0); }} placeholder="搜索英文或中文" /></label></div>
      {filteredSentences.length ? <><div className="sentencebook-list">{visibleSentences.map((sentence, index) => <article key={sentence.id}>
        <div className="sentencebook-index"><span>{String(safeCollectionPage * sentencesPerPage + index + 1).padStart(2, "0")}</span></div>
        <div className="sentencebook-copy"><p>{sentence.english}</p><em><PhoneticText text={sentence.english} /></em><small>{sentence.chinese}</small></div>
        <div className="sentencebook-actions"><button type="button" onClick={() => playAmericanEnglish(sentence.english, { rate: 0.78 })}>🔊 跟读</button><button type="button" onClick={() => removeSentence(sentence.id)}>移除</button></div>
      </article>)}</div>{notebookPagination}</> : <div className="wordbook-no-result">没有找到“{search}”</div>}
    </section> : mode === "review" ? <section className="review-module">
      {reviewWord ? <>
        <div className="vocab-session-line"><span>复习进度</span><div><i style={{ width: `${Math.min(100, ((reviewIndex + 1) / words.length) * 100)}%` }} /></div><b>{reviewIndex + 1} / {words.length}</b></div>
        <article className="review-word-card"><span className="eyebrow coral natural-case">Review word</span><div className="review-word-title"><div><h2 className="word-text" data-length={reviewWord.word.length > 18 ? "very-long" : reviewWord.word.length > 12 ? "long" : "normal"}>{reviewWord.word}</h2><p>{reviewWord.phonetic || "/—/"}</p><em className="word-pos-badge">{formatPartOfSpeech(reviewWord.partOfSpeech || (/^(noun|verb|adjective|adverb)$/i.test(reviewWord.family) ? reviewWord.family : ""))}</em></div><button type="button" onClick={() => playAmericanEnglish(reviewWord.word, { rate: 0.82 })}>🔊 播放发音</button></div><div className="review-word-detail"><div><span>中文释义</span><strong>{reviewWord.meaning}</strong></div></div></article>
        <div className="review-rating-actions"><button onClick={() => { markReviewed(reviewWord, "again"); setReviewIndex((current) => current + 1); }}><b>忘记了</b><span>今天再次复习</span></button><button onClick={() => { markReviewed(reviewWord, "hard"); setReviewIndex((current) => current + 1); }}><b>有点难</b><span>1 天后再见</span></button><button className="mastered" onClick={() => { markReviewed(reviewWord, "good"); setReviewIndex((current) => current + 1); }}><b>记住了</b><span>延长复习间隔</span></button></div>
      </> : <section className="dictation-complete"><span>✓</span><h2>本轮复习完成</h2><p>已经复习 {words.length} 个生词，间隔计划已同步到账号。</p><button className="button dark" onClick={() => setReviewIndex(0)}>再复习一轮</button></section>}
    </section> : library === "words" ? <section className="dictation-module">
      <div className="dictation-session-toolbar"><div className="dictation-order" role="group" aria-label="选择单词默写顺序"><span>出题顺序</span><button type="button" className={wordOrder === "sequential" ? "active" : ""} onClick={() => chooseWordOrder("sequential")}>顺序</button><button type="button" className={wordOrder === "random" ? "active" : ""} onClick={() => chooseWordOrder("random")}>随机</button></div><small>进度自动保存 · 今天写对后不再出现</small></div>
      {dictationWord ? <><div className="dictation-progress"><span>中文 → 英文</span><b>{(wordProgress?.completedWordIds.length ?? 0) + 1} / {wordSessionTotal}</b></div><article className="dictation-card"><span className="eyebrow coral natural-case">Write the English word</span><small>连续正确 {dictationWord.dictationCorrectStreak ?? 0}/5 · 累计默错 {dictationWord.dictationWrongCount ?? 0} 次</small><em className="word-pos-badge">{formatPartOfSpeech(dictationWord.partOfSpeech || (/^(noun|verb|adjective|adverb)$/i.test(dictationWord.family) ? dictationWord.family : ""))}</em><h2>{dictationWord.meaning}</h2><div className="dictation-answer-row"><label><span className="sr-only">输入对应英文单词</span><input ref={wordInputRef} value={wordInput} disabled={wordState === "correct"} onChange={(event) => handleWordInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); revealWord(); } else if (event.key === " ") { event.preventDefault(); playAmericanEnglish(dictationWord.word, { rate: 0.78 }); } }} autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder="输入英文 · 回车看答案 · 空格听发音" className={wordState} /></label>{wordState === "revealed" && <aside className="dictation-inline-answer" aria-live="polite"><span>正确答案</span><strong className="word-text" data-length={dictationWord.word.length > 18 ? "very-long" : dictationWord.word.length > 12 ? "long" : "normal"}>{dictationWord.word}</strong></aside>}</div><div className={`dictation-feedback ${wordState}`}>{wordState === "correct" ? wordMastered ? "✓ 连续正确 5 次，已移出生词本" : "✓ 正确，今天不再出现" : wordState === "wrong" ? "已记录一次默错，再检查拼写" : wordState === "revealed" ? "答案显示在输入框旁边；清空后可继续默写本词" : `${dictationWord.word.length} 个字母 · Enter 显示答案 · Space 听发音`}</div><div className="dictation-tools"><button type="button" onClick={markWordWrong} disabled={!wordInput.trim() || wordState !== "idle"}>检查拼写</button><button type="button" onClick={() => playAmericanEnglish(dictationWord.word, { rate: 0.78 })}>🔊 听发音 <kbd>Space</kbd></button><button type="button" onClick={revealWord}>显示答案 <kbd>Enter</kbd></button>{wordState === "revealed" && <button type="button" className="dictation-clear-answer" onClick={clearRevealedWord}>清空答案，继续默写</button>}</div></article><p className="dictation-note">回车只显示本词答案，不会跳到下一个；清空答案后可继续输入。已正确 {wordCorrect} 个。</p></> : <section className="dictation-complete"><span>✓</span><h2>今日默写已完成</h2><p>今天已正确默写 {wordCorrect} 个单词；正确词今天不会再次出题，进度已同步到账户。</p>{retryableWordCount > 0 && <button className="button dark" onClick={restartWords}>重练今日错词</button>}</section>}
    </section> : <section className="dictation-module sentence-dictation-module">
      {dictationSentence ? <><div className="dictation-progress"><span>{sentenceIndex >= sentences.length ? "错句再练" : "中文 / 听音 → 英文整句"}</span><b>{sentenceIndex + 1} / {sentenceQueue.length}</b></div><article className="dictation-card sentence-dictation-card">
        <span className="eyebrow coral">WRITE THE COMPLETE SENTENCE</span><small>{dictationSentence.topic} · {dictationSentence.part.replace("part", "Part ")}</small><h2>{dictationSentence.chinese}</h2><button type="button" className="sentence-dictation-audio" onClick={() => playAmericanEnglish(dictationSentence.english, { rate: 0.74 })}>🔊 只听英文发音</button>
        <label><span className="sr-only">输入完整英文句子</span><textarea ref={sentenceInputRef} value={sentenceInput} disabled={sentenceState === "correct" || sentenceState === "revealed"} onChange={(event) => { setSentenceInput(event.target.value); setSentenceState("idle"); setSentenceFeedback(null); }} autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder="写出完整英文句子；大小写和标点不计错" className={sentenceState} /></label>
        {sentenceFeedback ? <div className={`sentence-dictation-feedback ${sentenceState}`}><div><strong>{sentenceFeedback.accuracy}%</strong><span>{sentenceState === "correct" ? "完全正确" : sentenceState === "revealed" ? "已显示答案，这句会再练一次" : "对照标色修改后再检查"}</span></div><p>{sentenceFeedback.expected.map((token, index) => <mark className={token.status} key={`${token.text}-${index}`}>{token.text}</mark>)}</p>{sentenceFeedback.extra.length > 0 && <small>多写：{sentenceFeedback.extra.join(" · ")}</small>}</div> : <div className="sentence-dictation-hint"><span>判题规则</span><p>忽略大小写和标点；绿色正确，红色写错，虚线表示漏词，多写的词会单独列出。</p></div>}
        <div className="dictation-tools sentence-dictation-tools"><button type="button" className="sentence-check" disabled={!sentenceInput.trim() || sentenceState === "correct" || sentenceState === "revealed"} onClick={checkSentence}>检查默写</button><button type="button" onClick={revealSentence}>显示答案</button>{sentenceState !== "idle" && <button type="button" className="sentence-next" onClick={nextSentence}>下一句 →</button>}</div>
      </article><p className="dictation-note">第一次写错或看答案的句子会自动排到本轮末尾再练。已掌握 {sentenceCorrectIds.length} / {sentences.length} 句。</p></> : <section className="dictation-complete"><span>✓</span><h2>本轮精句默写完成</h2><p>已独立写对 {sentenceCorrectIds.length} / {sentences.length} 句；本轮出现过的错句也已经安排重练。</p><button className="button dark" onClick={restartSentences}>再默写一轮</button></section>}
    </section>}
  </div>;
}

function ProgressView({ profile, snapshot }: { profile: LearnerProfile; snapshot: StudySnapshot }) {
  const week = recentDates(7).map((key) => ({ key, ...getCompletedTaskCount(snapshot, profile, key) }));
  const totalDone = week.reduce((sum, day) => sum + day.completed, 0);
  const totalTasks = week.reduce((sum, day) => sum + day.total, 0);
  const listeningMocks = snapshot.attempts.filter((attempt) => attempt.skill === "listening" && attempt.mode === "mock");
  const speakingMocks = snapshot.attempts.filter((attempt) => attempt.skill === "speaking" && attempt.mode === "mock");
  const latestListeningBand = listeningMocks.at(-1)?.band;
  const latestSpeakingBand = speakingMocks.at(-1)?.band;
  const targetFloor = Math.min(7, Math.max(6.5, profile.targetBand));
  const listeningReady = listeningMocks.slice(-3).length === 3 && listeningMocks.slice(-3).every((attempt) => (attempt.band ?? 0) >= targetFloor);
  const speakingReady = speakingMocks.slice(-3).length === 3 && speakingMocks.slice(-3).every((attempt) => (attempt.band ?? 0) >= targetFloor);
  return (
    <div className="page">
      <PageHeader eyebrow="EXAM READINESS REPORT" title="看分数，更看是否稳定。" description="目标不是偶尔达到一次，而是在不同套题中连续达到6.5–7.0参考线。" />
      <CourseProgressOverview snapshot={snapshot} />
      <section className="readiness-board">
        <div><span className="eyebrow coral">TARGET READINESS</span><h2>考场准备度</h2><p>每科最近3次完整模考均达到目标线，才标记为“稳定”。</p></div>
        <article className={listeningReady ? "ready" : ""}><span>L</span><div><b>听力</b><small>{listeningMocks.length ? `${listeningMocks.length}次完整模考` : "等待基线诊断"}</small></div><strong>{latestListeningBand ? latestListeningBand.toFixed(1) : "–"}</strong><em>{listeningReady ? "稳定" : "验证中"}</em></article>
        <article className={speakingReady ? "ready" : ""}><span>S</span><div><b>口语</b><small>{speakingMocks.length ? `${speakingMocks.length}次完整模考` : "等待基线诊断"}</small></div><strong>{latestSpeakingBand ? latestSpeakingBand.toFixed(1) : "–"}</strong><em>{speakingReady ? "稳定" : "验证中"}</em></article>
      </section>
      <div className="report-summary">
        <article><span>本周完成</span><strong>{totalDone}<small> / {totalTasks} 项</small></strong><p>完成率 {totalTasks ? Math.round((totalDone / totalTasks) * 100) : 0}%</p></article>
        <article><span>连续学习</span><strong>{calculateStreak(snapshot, profile)}<small> 天</small></strong><p>从完成第一项任务开始计算</p></article>
        <article><span>练习记录</span><strong>{snapshot.attempts.filter((attempt) => attempt.skill === "listening" || attempt.skill === "speaking").length}<small> 次</small></strong><p>听力与口语的有效提交</p></article>
        <article><span>考试倒计时</span><strong>{daysUntil(profile.examDate)}<small> 天</small></strong><p>目标 Band {profile.targetBand.toFixed(1)}</p></article>
      </div>
      <section className="weekly-card">
        <div className="section-heading"><div><span className="eyebrow">LAST 7 DAYS</span><h2>七日学习节奏</h2></div><span>每一格代表当日完成比例</span></div>
        <div className="week-chart">{week.map((day) => {
          const percent = day.total ? (day.completed / day.total) * 100 : 0;
          const date = new Date(`${day.key}T12:00:00`);
          return <div className="day-bar" key={day.key}><span className="bar-value">{day.completed || "–"}</span><div><i style={{ height: `${Math.max(5, percent)}%` }} /></div><b>{new Intl.DateTimeFormat("zh-CN", { weekday: "short" }).format(date)}</b><small>{day.key.slice(5).replace("-", ".")}</small></div>;
        })}</div>
      </section>
      <section className="skill-report">
        <div className="section-heading"><div><span className="eyebrow">SKILL SIGNALS</span><h2>听说练习信号</h2></div></div>
        <div className="skill-report-grid">{SKILLS.map((skill) => {
          const average = skillAverage(snapshot, skill);
          const count = snapshot.attempts.filter((item) => item.skill === skill).length;
          return <article key={skill}><span className={`mini-skill badge-${skill}`}>{SKILL_META[skill].short}</span><div><b>{SKILL_META[skill].name}</b><small>{count} 次记录</small></div><strong>{count ? average : "–"}{count ? <small>%</small> : null}</strong><div className="signal-line"><i style={{ width: `${average}%` }} /></div></article>;
        })}</div>
      </section>
    </div>
  );
}

function CourseProgressOverview({ snapshot, compact = false }: { snapshot: StudySnapshot; compact?: boolean }) {
  const modules = [
    {
      id: "listening",
      label: "听力 Sections",
      completed: LISTENING_MOCKS.flatMap((mock) => mock.sections.map((section) => `${mock.id}:section-${section.part}`)).filter((id) => snapshot.learningProgress.listeningSections[id]?.status === "completed").length,
      total: LISTENING_MOCKS.reduce((sum, mock) => sum + mock.sections.length, 0),
    },
    ...(["part1", "part2", "part3"] as SpeakingPart[]).map((part) => {
      const bank = part === "part1" ? PART1_QUESTIONS : part === "part2" ? PART2_CUES : PART3_QUESTIONS;
      return {
        id: part,
        label: `口语 ${part.replace("part", "Part ")} 完形`,
        completed: bank.filter((item) => snapshot.learningProgress.speakingCloze[item.id]?.status === "completed").length,
        total: bank.length,
      };
    }),
    {
      id: "phrases",
      label: "口语 1000 句",
      completed: Object.values(snapshot.phraseProgress).filter((item) => item.status === "mastered").length,
      total: 990,
    },
  ];
  const overall = calculateBalancedLearningProgress(modules);
  return <section className={compact ? "course-progress-overview compact" : "course-progress-overview"}>
    <header><div><span className="eyebrow coral">COURSE PROGRESS</span><h2>我的完整学习进度</h2><p>综合进度按五个模块等权计算，既看到总量，也不会让 990 句盖住其他训练。</p></div><strong>{overall}<small>%</small></strong></header>
    <div className="course-progress-total"><i style={{ width: `${overall}%` }} /></div>
    <div className="course-progress-modules">{modules.map((module) => {
      const percent = module.total ? Math.round((module.completed / module.total) * 100) : 0;
      return <article key={module.id}><div><b>{module.label}</b><span>{module.completed} / {module.total}</span></div><div><i style={{ width: `${percent}%` }} /></div><small>{percent}%</small></article>;
    })}</div>
  </section>;
}

function SettingsView({ profile, accountName, syncState, localMode, theme, onThemeChange, onSave, onReset }: { profile: LearnerProfile; accountName: string; syncState: SyncState; localMode: boolean; theme: ThemeKey; onThemeChange: (theme: ThemeKey) => void; onSave: (profile: LearnerProfile) => void; onReset: () => void }) {
  const [targetBand, setTargetBand] = useState(profile.targetBand);
  const [examDate, setExamDate] = useState(profile.examDate);
  const [dailyMinutes, setDailyMinutes] = useState(profile.dailyMinutes);
  const tomorrow = addDays(dateKey(), 1);
  return (
    <div className="page settings-page">
      <PageHeader eyebrow="ROUTE SETTINGS" title="调整你的学习坐标" description="计划应该服务于你。考试日期或可用时间改变时，随时重新校准。" />
      <ThemeSwitcher theme={theme} onChange={onThemeChange} />
      <div className="settings-layout">
        <section className="settings-card">
          <div className="setting-row"><div><span className="eyebrow">TARGET BAND</span><h2>目标分数</h2><p>作为学习台的长期目标坐标。</p></div><select value={targetBand} onChange={(event) => setTargetBand(Number(event.target.value))}>{[5.5, 6, 6.5, 7, 7.5, 8, 8.5].map((band) => <option key={band} value={band}>{band.toFixed(1)}</option>)}</select></div>
          <div className="setting-row"><div><span className="eyebrow">EXAM DATE</span><h2>考试日期</h2><p>用于计算倒计时和每日节奏。</p></div><input type="date" min={tomorrow} value={examDate} onChange={(event) => setExamDate(event.target.value)} /></div>
          <div className="setting-row time-setting"><div><span className="eyebrow">DAILY RHYTHM</span><h2>每日时长</h2><p>决定每天轮换几科微练习。</p></div><div className="segmented">{[30, 60, 90].map((minutes) => <button key={minutes} className={dailyMinutes === minutes ? "active" : ""} onClick={() => setDailyMinutes(minutes as 30 | 60 | 90)}>{minutes} 分钟</button>)}</div></div>
          <button className="button primary save-settings" disabled={!examDate || examDate < tomorrow} onClick={() => onSave({ ...profile, targetBand, examDate, dailyMinutes })}>保存学习设置</button>
        </section>
        <aside className="data-card"><span className="eyebrow coral">{localMode ? "LOCAL STORAGE" : "ACCOUNT SYNC"}</span><h2>{localMode ? "学习记录保存在本机。" : "学习记录跟着账号走。"}</h2><p>{localMode ? `当前为本地预览模式，目标、生词本和听说练习进度只保存在这台设备。当前状态：${syncStateLabel(syncState, true)}。` : `目标、生词本和听说练习进度会保存到 ${accountName}，换浏览器登录同一账号后自动恢复。当前状态：${syncStateLabel(syncState)}。`}</p><div className="privacy-lines"><span /><span /><span /></div><button className="danger-button" onClick={() => { if (window.confirm(localMode ? "确定清除这台设备上的全部学习记录吗？此操作无法恢复。" : "确定清除账号下的全部学习记录吗？此操作会同步到其他浏览器且无法恢复。")) onReset(); }}>清除全部学习数据</button></aside>
      </div>
    </div>
  );
}
