export const SKILLS = ["listening", "speaking"] as const;
export type Skill = (typeof SKILLS)[number];
export type TaskKind = Skill;

export interface LearnerProfile {
  targetBand: number;
  examDate: string;
  dailyMinutes: 30 | 60 | 90;
  createdAt: string;
}

export interface StudyTask {
  id: string;
  kind: TaskKind;
  title: string;
  description: string;
  minutes: number;
  label: string;
}

export interface PracticeAttempt {
  id: string;
  skill: Skill | "reading" | "writing";
  date: string;
  score: number;
  maxScore: number;
  durationSeconds?: number;
  mode?: "drill" | "mock";
  band?: number;
  breakdown?: Record<string, number>;
}

export interface VocabularyReview {
  interval: number;
  nextReview: string;
  lastRating: "again" | "hard" | "good";
}

export interface DailyProgress {
  completedTaskIds: string[];
  vocabularyReviews: number;
}

export type WordDictationOrder = "sequential" | "random";
export interface WordDictationProgress {
  order: WordDictationOrder;
  queue: string[];
  completedWordIds: string[];
  correctWordIds: string[];
}

export interface StudySnapshot {
  version: 1;
  profile: LearnerProfile | null;
  daily: Record<string, DailyProgress>;
  attempts: PracticeAttempt[];
  vocabulary: Record<string, VocabularyReview>;
  savedWords: SavedVocabularyWord[];
  savedSentences: SavedSentence[];
  savedWordDeletions: Record<string, string>;
  savedSentenceDeletions: Record<string, string>;
  phraseProgress: Record<string, PhraseProgress>;
  phraseReaderPosition: PhraseReaderPosition;
  wordDictation: Record<string, WordDictationProgress>;
  learningProgress: LearningProgress;
  drafts: Record<string, string>;
}

export interface LearningItemProgress {
  status: "completed" | "not_started";
  updatedAt: string;
}

export interface LearningProgress {
  listeningSections: Record<string, LearningItemProgress>;
  speakingCloze: Record<string, LearningItemProgress>;
}

export function updateLearningItemProgress(
  current: Record<string, LearningItemProgress>,
  ids: string[],
  status: LearningItemProgress["status"],
  updatedAt = new Date().toISOString(),
): Record<string, LearningItemProgress> {
  const next = { ...current };
  for (const id of new Set(ids.filter(Boolean))) next[id] = { status, updatedAt };
  return next;
}

export function calculateBalancedLearningProgress(
  modules: { completed: number; total: number }[],
): number {
  const available = modules.filter((module) => module.total > 0);
  if (!available.length) return 0;
  return Math.round(available.reduce(
    (sum, module) => sum + Math.min(1, Math.max(0, module.completed / module.total)),
    0,
  ) / available.length * 100);
}

export interface PhraseProgress {
  status: "learning" | "mastered";
  updatedAt: string;
}

export interface PhraseReaderPosition {
  sentenceId: number;
  updatedAt: string;
}

export interface VocabularyWord {
  id: string;
  word: string;
  phonetic: string;
  meaning: string;
  example: string;
  family: string;
  partOfSpeech?: string;
  contextTranslation?: string;
}

export interface SavedVocabularyWord extends VocabularyWord {
  addedAt: string;
  source: "speaking" | "listening";
  dictationCorrectStreak?: number;
  dictationWrongCount?: number;
  dictationUpdatedAt?: string;
}

export interface SavedSentence {
  id: string;
  english: string;
  chinese: string;
  topic: string;
  part: "part1" | "part2" | "part3";
  sourceId: string;
  addedAt: string;
  source: "speaking";
}

export interface SentenceDictationToken {
  text: string;
  status: "correct" | "wrong" | "missing";
}

export interface SentenceDictationScore {
  accuracy: number;
  expected: SentenceDictationToken[];
  extra: string[];
}

export const STORAGE_KEY = "ielts-route:v1";

export function hasStudyData(snapshot: StudySnapshot): boolean {
  return Boolean(
    snapshot.profile ||
      Object.keys(snapshot.daily).length ||
      snapshot.attempts.length ||
      Object.keys(snapshot.vocabulary).length ||
      snapshot.savedWords.length ||
      snapshot.savedSentences.length ||
      Object.keys(snapshot.savedWordDeletions).length ||
      Object.keys(snapshot.savedSentenceDeletions).length ||
      Object.keys(snapshot.phraseProgress).length ||
      snapshot.phraseReaderPosition.sentenceId > 1 ||
      Object.keys(snapshot.wordDictation).length ||
      Object.values(snapshot.learningProgress.listeningSections).some((item) => item.status === "completed") ||
      Object.values(snapshot.learningProgress.speakingCloze).some((item) => item.status === "completed") ||
      Object.values(snapshot.drafts).some((draft) => draft.trim()),
  );
}

function mergeLearningItemRecords(
  local: Record<string, LearningItemProgress>,
  remote: Record<string, LearningItemProgress>,
): Record<string, LearningItemProgress> {
  const merged = { ...remote };
  for (const [id, progress] of Object.entries(local)) {
    const existing = merged[id];
    if (!existing || progress.updatedAt > existing.updatedAt) merged[id] = progress;
  }
  return merged;
}

function mergeDeletionRecords(
  local: Record<string, string>,
  remote: Record<string, string>,
): Record<string, string> {
  const merged = { ...remote };
  for (const [key, deletedAt] of Object.entries(local)) {
    if (!merged[key] || deletedAt > merged[key]) merged[key] = deletedAt;
  }
  return merged;
}

function savedWordKey(word: Pick<SavedVocabularyWord, "word">): string {
  return word.word.trim().toLowerCase();
}

function savedWordUpdatedAt(word: SavedVocabularyWord): string {
  return word.dictationUpdatedAt ?? word.addedAt;
}

export function mergeStudySnapshots(
  local: StudySnapshot,
  remote: StudySnapshot,
  options: { preferLocal?: boolean } = {},
): StudySnapshot {
  const preferLocal = options.preferLocal ?? false;
  const dailyKeys = new Set([
    ...Object.keys(local.daily),
    ...Object.keys(remote.daily),
  ]);
  const daily: StudySnapshot["daily"] = {};
  for (const key of dailyKeys) {
    const localDay = local.daily[key];
    const remoteDay = remote.daily[key];
    daily[key] = {
      completedTaskIds: Array.from(
        new Set([
          ...(remoteDay?.completedTaskIds ?? []),
          ...(localDay?.completedTaskIds ?? []),
        ]),
      ),
      vocabularyReviews: Math.max(
        remoteDay?.vocabularyReviews ?? 0,
        localDay?.vocabularyReviews ?? 0,
      ),
    };
  }

  const attempts = new Map<string, PracticeAttempt>();
  for (const attempt of [...remote.attempts, ...local.attempts]) {
    attempts.set(attempt.id, attempt);
  }

  const savedWordDeletions = mergeDeletionRecords(local.savedWordDeletions, remote.savedWordDeletions);
  const savedWords = new Map<string, SavedVocabularyWord>();
  for (const word of [...remote.savedWords, ...local.savedWords]) {
    const key = savedWordKey(word);
    const existing = savedWords.get(key);
    if (!existing) {
      savedWords.set(key, word);
      continue;
    }
    const nextIsNewest = savedWordUpdatedAt(word) >= savedWordUpdatedAt(existing);
    const newest = nextIsNewest ? word : existing;
    const oldest = nextIsNewest ? existing : word;
    savedWords.set(key, {
      ...oldest,
      ...newest,
      id: newest.id,
      addedAt: oldest.addedAt < newest.addedAt ? oldest.addedAt : newest.addedAt,
      dictationCorrectStreak: newest.dictationCorrectStreak ?? 0,
      dictationWrongCount: newest.dictationWrongCount ?? 0,
      dictationUpdatedAt: newest.dictationUpdatedAt,
    });
  }
  for (const [key, word] of savedWords) {
    const deletedAt = savedWordDeletions[key];
    if (deletedAt && deletedAt >= savedWordUpdatedAt(word)) savedWords.delete(key);
    else if (deletedAt) delete savedWordDeletions[key];
  }

  const savedSentenceDeletions = mergeDeletionRecords(local.savedSentenceDeletions, remote.savedSentenceDeletions);
  const savedSentences = new Map<string, SavedSentence>();
  for (const sentence of [...remote.savedSentences, ...local.savedSentences]) {
    const key = normalizeDictationText(sentence.english);
    const existing = savedSentences.get(key);
    if (!existing || sentence.addedAt >= existing.addedAt) savedSentences.set(key, sentence);
  }
  for (const [key, sentence] of savedSentences) {
    const deletedAt = savedSentenceDeletions[key];
    if (deletedAt && deletedAt >= sentence.addedAt) savedSentences.delete(key);
    else if (deletedAt) delete savedSentenceDeletions[key];
  }

  const phraseProgress: StudySnapshot["phraseProgress"] = { ...remote.phraseProgress };
  for (const [id, progress] of Object.entries(local.phraseProgress)) {
    const remoteProgress = phraseProgress[id];
    if (!remoteProgress || progress.updatedAt > remoteProgress.updatedAt) {
      phraseProgress[id] = progress;
    }
  }

  const localReaderPosition = local.phraseReaderPosition ?? { sentenceId: 1, updatedAt: "" };
  const remoteReaderPosition = remote.phraseReaderPosition ?? { sentenceId: 1, updatedAt: "" };
  const phraseReaderPosition = localReaderPosition.updatedAt > remoteReaderPosition.updatedAt
    ? localReaderPosition
    : remoteReaderPosition;

  const wordDictation: StudySnapshot["wordDictation"] = {};
  const dictationDates = new Set([
    ...Object.keys(remote.wordDictation),
    ...Object.keys(local.wordDictation),
  ]);
  for (const key of dictationDates) {
    const remoteProgress = remote.wordDictation[key];
    const localProgress = local.wordDictation[key];
    if (!remoteProgress || !localProgress) {
      wordDictation[key] = remoteProgress ?? localProgress;
      continue;
    }
    const primary = localProgress.completedWordIds.length > remoteProgress.completedWordIds.length
      ? localProgress
      : remoteProgress;
    const completedWordIds = Array.from(new Set([
      ...remoteProgress.completedWordIds,
      ...localProgress.completedWordIds,
    ]));
    const correctWordIds = Array.from(new Set([
      ...remoteProgress.correctWordIds,
      ...localProgress.correctWordIds,
    ]));
    const completed = new Set(completedWordIds);
    wordDictation[key] = {
      order: primary.order,
      queue: primary.queue.filter((id) => !completed.has(id)),
      completedWordIds,
      correctWordIds,
    };
  }

  const mergedSavedWords = Array.from(savedWords.values());
  const savedWordIds = new Set(mergedSavedWords.map((word) => word.id));
  for (const [key, progress] of Object.entries(wordDictation)) {
    wordDictation[key] = {
      ...progress,
      queue: progress.queue.filter((id) => savedWordIds.has(id)),
      completedWordIds: progress.completedWordIds.filter((id) => savedWordIds.has(id)),
      correctWordIds: progress.correctWordIds.filter((id) => savedWordIds.has(id)),
    };
  }
  const vocabulary = Object.fromEntries(
    Object.entries(preferLocal
      ? { ...remote.vocabulary, ...local.vocabulary }
      : { ...local.vocabulary, ...remote.vocabulary })
      .filter(([id]) => savedWordIds.has(id)),
  );

  return {
    version: 1,
    profile: preferLocal
      ? local.profile ?? remote.profile
      : remote.profile ?? local.profile,
    daily,
    attempts: Array.from(attempts.values()),
    vocabulary,
    savedWords: mergedSavedWords,
    savedSentences: Array.from(savedSentences.values()),
    savedWordDeletions,
    savedSentenceDeletions,
    phraseProgress,
    phraseReaderPosition,
    wordDictation,
    learningProgress: {
      listeningSections: mergeLearningItemRecords(
        local.learningProgress.listeningSections,
        remote.learningProgress.listeningSections,
      ),
      speakingCloze: mergeLearningItemRecords(
        local.learningProgress.speakingCloze,
        remote.learningProgress.speakingCloze,
      ),
    },
    drafts: preferLocal
      ? { ...remote.drafts, ...local.drafts }
      : { ...local.drafts, ...remote.drafts },
  };
}

export const SKILL_META: Record<
  Skill,
  { name: string; english: string; short: string; color: string }
> = {
  listening: { name: "听力", english: "Listening", short: "L", color: "var(--listening)" },
  speaking: { name: "口语", english: "Speaking", short: "S", color: "var(--speaking)" },
};

export const VOCABULARY: VocabularyWord[] = [
  { id: "allocate", word: "allocate", phonetic: "/ˈæləkeɪt/", meaning: "分配；拨出", example: "Cities should allocate more funding to public transport.", family: "allocation · allocated" },
  { id: "compelling", word: "compelling", phonetic: "/kəmˈpelɪŋ/", meaning: "令人信服的；引人入胜的", example: "The report presents a compelling case for early education.", family: "compel · compellingly" },
  { id: "feasible", word: "feasible", phonetic: "/ˈfiːzəbəl/", meaning: "可行的；行得通的", example: "Remote work is not feasible for every profession.", family: "feasibility · feasibly" },
  { id: "mitigate", word: "mitigate", phonetic: "/ˈmɪtɪɡeɪt/", meaning: "缓解；减轻", example: "Green spaces can mitigate the effects of urban heat.", family: "mitigation · mitigating" },
  { id: "prevalent", word: "prevalent", phonetic: "/ˈprevələnt/", meaning: "普遍存在的；盛行的", example: "Screen fatigue is increasingly prevalent among teenagers.", family: "prevalence · prevail" },
  { id: "substantial", word: "substantial", phonetic: "/səbˈstænʃəl/", meaning: "大量的；重大的", example: "The policy led to a substantial reduction in waste.", family: "substantially" },
  { id: "sustain", word: "sustain", phonetic: "/səˈsteɪn/", meaning: "维持；支撑", example: "Local businesses help sustain a diverse community.", family: "sustainable · sustainability" },
  { id: "incentive", word: "incentive", phonetic: "/ɪnˈsentɪv/", meaning: "激励；刺激因素", example: "Tax reductions may provide an incentive to innovate.", family: "incentivise · incentivisation" },
  { id: "inevitable", word: "inevitable", phonetic: "/ɪnˈevɪtəbəl/", meaning: "不可避免的", example: "Some degree of change is inevitable in growing cities.", family: "inevitably" },
  { id: "consecutive", word: "consecutive", phonetic: "/kənˈsekjətɪv/", meaning: "连续的；不间断的", example: "Attendance rose for three consecutive years.", family: "consecutively" },
  { id: "disparity", word: "disparity", phonetic: "/dɪˈspærəti/", meaning: "差异；悬殊", example: "The scheme aims to reduce regional disparities.", family: "disparate" },
  { id: "advocate", word: "advocate", phonetic: "/ˈædvəkeɪt/", meaning: "提倡；拥护", example: "Many experts advocate a balanced approach to assessment.", family: "advocacy · advocate (n.)" },
];

export function createEmptySnapshot(): StudySnapshot {
  return {
    version: 1,
    profile: null,
    daily: {},
    attempts: [],
    vocabulary: {},
    savedWords: [],
    savedSentences: [],
    savedWordDeletions: {},
    savedSentenceDeletions: {},
    phraseProgress: {},
    phraseReaderPosition: { sentenceId: 1, updatedAt: "" },
    wordDictation: {},
    learningProgress: { listeningSections: {}, speakingCloze: {} },
    drafts: {},
  };
}

export function dateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDays(date: string, amount: number): string {
  const next = new Date(`${date}T12:00:00`);
  next.setDate(next.getDate() + amount);
  return dateKey(next);
}

export function daysUntil(examDate: string, now = new Date()): number {
  const current = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const exam = new Date(`${examDate}T00:00:00`);
  return Math.max(0, Math.ceil((exam.getTime() - current.getTime()) / 86_400_000));
}

export function getTasksForDate(
  profile: LearnerProfile,
  targetDate: string,
): StudyTask[] {
  const created = new Date(`${profile.createdAt.slice(0, 10)}T12:00:00`);
  const target = new Date(`${targetDate}T12:00:00`);
  const dayIndex = Math.max(
    0,
    Math.floor((target.getTime() - created.getTime()) / 86_400_000),
  );
  const focusSkills: Skill[] =
    profile.dailyMinutes === 30
      ? [SKILLS[dayIndex % SKILLS.length]]
      : [...SKILLS];
  const descriptions: Record<Skill, string> = {
    listening: "四个 Section · 题型专项与 40 题模考",
    speaking: "Part 1–3 · 录音、复盘与 Band 6/7 评分锚点",
  };
  const duration =
    profile.dailyMinutes === 30 ? 30 : profile.dailyMinutes === 60 ? 30 : 45;

  return focusSkills.map((skill) => ({
      id: `${targetDate}:${skill}`,
      kind: skill,
      title: `${SKILL_META[skill].name}专项训练`,
      description: descriptions[skill],
      minutes: duration,
      label: SKILL_META[skill].english.toUpperCase(),
    }));
}

export function loadSnapshot(raw: string | null): StudySnapshot {
  if (!raw) return createEmptySnapshot();
  try {
    const value = JSON.parse(raw) as Partial<StudySnapshot>;
    if (
      value.version !== 1 ||
      !Array.isArray(value.attempts) ||
      typeof value.daily !== "object" ||
      typeof value.vocabulary !== "object" ||
      typeof value.drafts !== "object"
    ) {
      return createEmptySnapshot();
    }
    return {
      version: 1,
      profile: value.profile ?? null,
      daily: value.daily ?? {},
      attempts: value.attempts,
      vocabulary: value.vocabulary ?? {},
      savedWords: Array.isArray(value.savedWords)
        ? value.savedWords.map((word) => ({
            ...word,
            partOfSpeech: word.partOfSpeech || (/^(noun|verb|adjective|adverb|pronoun|preposition|conjunction|determiner|interjection|auxiliary)$/i.test(word.family ?? "") ? word.family : ""),
            dictationCorrectStreak: word.dictationCorrectStreak ?? 0,
            dictationWrongCount: word.dictationWrongCount ?? 0,
          }))
        : [],
      savedSentences: Array.isArray(value.savedSentences) ? value.savedSentences : [],
      savedWordDeletions: value.savedWordDeletions && typeof value.savedWordDeletions === "object"
        ? value.savedWordDeletions
        : {},
      savedSentenceDeletions: value.savedSentenceDeletions && typeof value.savedSentenceDeletions === "object"
        ? value.savedSentenceDeletions
        : {},
      phraseProgress: value.phraseProgress && typeof value.phraseProgress === "object"
        ? value.phraseProgress
        : {},
      phraseReaderPosition: value.phraseReaderPosition &&
          Number.isInteger(value.phraseReaderPosition.sentenceId) &&
          value.phraseReaderPosition.sentenceId >= 1
        ? {
            sentenceId: Math.min(value.phraseReaderPosition.sentenceId, 990),
            updatedAt: typeof value.phraseReaderPosition.updatedAt === "string"
              ? value.phraseReaderPosition.updatedAt
              : "",
          }
        : { sentenceId: 1, updatedAt: "" },
      wordDictation: value.wordDictation && typeof value.wordDictation === "object"
        ? value.wordDictation
        : {},
      learningProgress: value.learningProgress && typeof value.learningProgress === "object"
        ? {
            listeningSections: value.learningProgress.listeningSections && typeof value.learningProgress.listeningSections === "object"
              ? value.learningProgress.listeningSections
              : {},
            speakingCloze: value.learningProgress.speakingCloze && typeof value.learningProgress.speakingCloze === "object"
              ? value.learningProgress.speakingCloze
              : {},
          }
        : { listeningSections: {}, speakingCloze: {} },
      drafts: value.drafts ?? {},
    };
  } catch {
    return createEmptySnapshot();
  }
}

export function upsertSavedWord(
  current: SavedVocabularyWord[],
  next: SavedVocabularyWord,
): SavedVocabularyWord[] {
  const normalized = next.word.trim().toLowerCase();
  const existing = current.findIndex(
    (item) => item.word.trim().toLowerCase() === normalized,
  );
  if (existing < 0) {
    return [{ ...next, dictationCorrectStreak: next.dictationCorrectStreak ?? 0, dictationWrongCount: next.dictationWrongCount ?? 0 }, ...current];
  }
  return current.map((item, index) =>
    index === existing
      ? {
          ...next,
          id: item.id,
          addedAt: item.addedAt,
          dictationCorrectStreak: item.dictationCorrectStreak ?? next.dictationCorrectStreak ?? 0,
          dictationWrongCount: item.dictationWrongCount ?? next.dictationWrongCount ?? 0,
          dictationUpdatedAt: item.dictationUpdatedAt ?? next.dictationUpdatedAt,
        }
      : item,
  );
}

function uniqueWordIds(ids: string[]): string[] {
  return Array.from(new Set(ids.filter(Boolean)));
}

export function shuffleWordIds(
  ids: string[],
  random: () => number = Math.random,
): string[] {
  const shuffled = [...ids];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

export function resumeWordDictationProgress(
  wordIds: string[],
  order: WordDictationOrder,
  current?: WordDictationProgress,
  random: () => number = Math.random,
): WordDictationProgress {
  const available = uniqueWordIds(wordIds);
  const availableSet = new Set(available);
  const completedWordIds = uniqueWordIds(current?.completedWordIds ?? [])
    .filter((id) => availableSet.has(id));
  const completed = new Set(completedWordIds);
  const correctWordIds = uniqueWordIds(current?.correctWordIds ?? [])
    .filter((id) => availableSet.has(id));
  const queued = (current?.queue ?? [])
    .filter((id) => availableSet.has(id) && !completed.has(id));
  const queuedSet = new Set(queued);
  const newIds = available.filter((id) => !completed.has(id) && !queuedSet.has(id));
  const remaining = [...queued, ...newIds];
  const queue = current?.order === order
    ? remaining
    : order === "random"
      ? shuffleWordIds(remaining, random)
      : available.filter((id) => remaining.includes(id));
  return { order, queue, completedWordIds, correctWordIds };
}

export function restartWordDictationProgress(
  wordIds: string[],
  order: WordDictationOrder,
  current?: WordDictationProgress,
  random: () => number = Math.random,
): WordDictationProgress {
  const available = uniqueWordIds(wordIds);
  const availableSet = new Set(available);
  const correctWordIds = uniqueWordIds(current?.correctWordIds ?? [])
    .filter((id) => availableSet.has(id));
  const correct = new Set(correctWordIds);
  const remaining = available.filter((id) => !correct.has(id));
  return {
    order,
    queue: order === "random" ? shuffleWordIds(remaining, random) : remaining,
    completedWordIds: [...correctWordIds],
    correctWordIds,
  };
}

export function applyWordDictationResult(
  snapshot: StudySnapshot,
  wordId: string,
  result: "correct" | "wrong" | "revealed" | "skipped",
  today: string,
  attemptedAt = new Date().toISOString(),
): { snapshot: StudySnapshot; mastered: boolean } {
  const word = snapshot.savedWords.find((item) => item.id === wordId);
  if (!word) return { snapshot, mastered: false };

  const currentProgress = resumeWordDictationProgress(
    snapshot.savedWords.map((item) => item.id),
    snapshot.wordDictation[today]?.order ?? "sequential",
    snapshot.wordDictation[today],
  );
  const isCorrect = result === "correct";
  const advances = result !== "wrong";
  const nextStreak = isCorrect ? (word.dictationCorrectStreak ?? 0) + 1 : 0;
  const mastered = isCorrect && nextStreak >= 5;
  const nextWord = {
    ...word,
    dictationCorrectStreak: nextStreak,
    dictationWrongCount: (word.dictationWrongCount ?? 0) +
      (result === "wrong" || result === "revealed" ? 1 : 0),
    dictationUpdatedAt: attemptedAt,
  };
  const queue = advances
    ? currentProgress.queue.filter((id) => id !== wordId)
    : currentProgress.queue;
  const completedWordIds = advances
    ? uniqueWordIds([...currentProgress.completedWordIds, wordId])
    : currentProgress.completedWordIds;
  const correctWordIds = isCorrect
    ? uniqueWordIds([...currentProgress.correctWordIds, wordId])
    : currentProgress.correctWordIds;
  const vocabulary = { ...snapshot.vocabulary };
  if (mastered) {
    delete vocabulary[wordId];
  } else if (result === "correct" || result === "revealed" || result === "skipped") {
    vocabulary[wordId] = nextVocabularyReview(
      snapshot.vocabulary[wordId],
      isCorrect ? "good" : "again",
      today,
    );
  }
  const day = snapshot.daily[today] ?? { completedTaskIds: [], vocabularyReviews: 0 };
  return {
    mastered,
    snapshot: {
      ...snapshot,
      savedWords: mastered
        ? snapshot.savedWords.filter((item) => item.id !== wordId)
        : snapshot.savedWords.map((item) => item.id === wordId ? nextWord : item),
      vocabulary,
      daily: result === "wrong"
        ? snapshot.daily
        : {
            ...snapshot.daily,
            [today]: { ...day, vocabularyReviews: day.vocabularyReviews + 1 },
          },
      wordDictation: {
        ...snapshot.wordDictation,
        [today]: {
          ...currentProgress,
          queue,
          completedWordIds,
          correctWordIds,
        },
      },
    },
  };
}

export function upsertSavedSentence(
  current: SavedSentence[],
  next: SavedSentence,
): SavedSentence[] {
  const normalized = normalizeDictationText(next.english);
  const existing = current.findIndex(
    (item) => normalizeDictationText(item.english) === normalized,
  );
  if (existing < 0) return [next, ...current];
  return current.map((item, index) =>
    index === existing ? { ...next, addedAt: item.addedAt } : item,
  );
}

function dictationTokens(value: string): string[] {
  return (
    value
      .normalize("NFKC")
      .replace(/[‘’]/g, "'")
      .toLowerCase()
      .match(/[a-z0-9]+(?:'[a-z0-9]+)*/g) ?? []
  );
}

export function normalizeDictationText(value: string): string {
  return dictationTokens(value).join(" ");
}

export function scoreSentenceDictation(
  expectedText: string,
  actualText: string,
): SentenceDictationScore {
  const expected = dictationTokens(expectedText);
  const actual = dictationTokens(actualText);
  const matrix = Array.from({ length: expected.length + 1 }, () =>
    Array<number>(actual.length + 1).fill(0),
  );

  for (let row = 0; row <= expected.length; row += 1) matrix[row][0] = row;
  for (let column = 0; column <= actual.length; column += 1) matrix[0][column] = column;

  for (let row = 1; row <= expected.length; row += 1) {
    for (let column = 1; column <= actual.length; column += 1) {
      const substitution = matrix[row - 1][column - 1] + (expected[row - 1] === actual[column - 1] ? 0 : 1);
      matrix[row][column] = Math.min(
        substitution,
        matrix[row - 1][column] + 1,
        matrix[row][column - 1] + 1,
      );
    }
  }

  const aligned: SentenceDictationToken[] = [];
  const extra: string[] = [];
  let row = expected.length;
  let column = actual.length;

  while (row > 0 || column > 0) {
    if (
      row > 0 &&
      column > 0 &&
      expected[row - 1] === actual[column - 1] &&
      matrix[row][column] === matrix[row - 1][column - 1]
    ) {
      aligned.unshift({ text: expected[row - 1], status: "correct" });
      row -= 1;
      column -= 1;
    } else if (
      row > 0 &&
      column > 0 &&
      matrix[row][column] === matrix[row - 1][column - 1] + 1
    ) {
      aligned.unshift({ text: expected[row - 1], status: "wrong" });
      row -= 1;
      column -= 1;
    } else if (row > 0 && matrix[row][column] === matrix[row - 1][column] + 1) {
      aligned.unshift({ text: expected[row - 1], status: "missing" });
      row -= 1;
    } else {
      extra.unshift(actual[column - 1]);
      column -= 1;
    }
  }

  const distance = matrix[expected.length][actual.length];
  const total = Math.max(expected.length, actual.length, 1);
  return {
    accuracy: Math.max(0, Math.round((1 - distance / total) * 100)),
    expected: aligned,
    extra,
  };
}

export function nextVocabularyReview(
  current: VocabularyReview | undefined,
  rating: VocabularyReview["lastRating"],
  today: string,
): VocabularyReview {
  if (rating === "again") {
    return { interval: 0, nextReview: today, lastRating: rating };
  }
  if (rating === "hard") {
    return { interval: 1, nextReview: addDays(today, 1), lastRating: rating };
  }
  const interval = current?.interval
    ? Math.min(14, Math.max(3, current.interval * 2))
    : 3;
  return { interval, nextReview: addDays(today, interval), lastRating: rating };
}

export function getCompletedTaskCount(
  snapshot: StudySnapshot,
  profile: LearnerProfile,
  targetDate: string,
): { completed: number; total: number } {
  const tasks = getTasksForDate(profile, targetDate);
  const completedIds = snapshot.daily[targetDate]?.completedTaskIds ?? [];
  return {
    completed: tasks.filter((task) => completedIds.includes(task.id)).length,
    total: tasks.length,
  };
}

export function calculateStreak(
  snapshot: StudySnapshot,
  profile: LearnerProfile,
  now = new Date(),
): number {
  let streak = 0;
  for (let offset = 0; offset < 365; offset += 1) {
    const current = new Date(now);
    current.setDate(now.getDate() - offset);
    const key = dateKey(current);
    const { completed } = getCompletedTaskCount(snapshot, profile, key);
    if (completed === 0) break;
    streak += 1;
  }
  return streak;
}

export function recentDates(count: number, now = new Date()): string[] {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() - (count - index - 1));
    return dateKey(date);
  });
}

export function formatClock(seconds: number): string {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  return `${String(minutes).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

export function skillAverage(snapshot: StudySnapshot, skill: Skill): number {
  const attempts = snapshot.attempts.filter((attempt) => attempt.skill === skill);
  if (!attempts.length) return 0;
  const total = attempts.reduce(
    (sum, attempt) => sum + (attempt.score / attempt.maxScore) * 100,
    0,
  );
  return Math.round(total / attempts.length);
}
