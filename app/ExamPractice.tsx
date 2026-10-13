"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  LISTENING_MOCKS,
  isListeningAnswerCorrect,
  listeningBandFromRaw,
  type ListeningExamQuestion,
  type ListeningExamSection,
} from "./ielts-exam-bank";
import {
  PART3_QUESTIONS,
  SPEAKING_BAND_ANCHORS,
  SPEAKING_MOCKS,
} from "./ielts-speaking-exam";
import { formatPartOfSpeech, lookupDictionaryWord, normalizeDictionaryWord, type DictionaryResult } from "./dictionary";
import { playWordAudio } from "./word-audio";
import { dateKey, formatClock, type LearningItemProgress, type PracticeAttempt, type SavedVocabularyWord } from "./study";

function naturalVoiceScore(voice: SpeechSynthesisVoice): number {
  const name = voice.name.toLowerCase();
  let score = 0;
  if (name.includes("natural") || name.includes("neural")) score += 100;
  if (/aria|jenny|guy|ava|andrew|emma|brian|samantha|sonia|ryan|natasha|william/.test(name)) score += 55;
  if (name.includes("microsoft")) score += 20;
  if (name.includes("online")) score += 10;
  if (name.includes("compact") || name.includes("mobile")) score -= 80;
  return score;
}

function pickVoice(accent: string, speakerIndex: number): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  const normalizedAccent = accent.toLowerCase().replace("_", "-");
  const language = voices
    .filter((voice) => voice.lang.toLowerCase().replace("_", "-").startsWith(normalizedAccent))
    .sort((left, right) => naturalVoiceScore(right) - naturalVoiceScore(left));
  const pool = language.length
    ? language
    : voices.filter((voice) => voice.lang.toLowerCase().startsWith("en")).sort((left, right) => naturalVoiceScore(right) - naturalVoiceScore(left));
  return pool[speakerIndex % Math.max(1, pool.length)];
}

function speakAmericanWord(word: string) {
  if (typeof window === "undefined") return;
  // 优先播放预生成的男声美音 mp3
  void playWordAudio(word, {}).then((audio) => {
    if (audio) {
      const cleanup = () => { audio.pause(); };
      audio.onended = cleanup;
      audio.onerror = cleanup;
      window.setTimeout(() => { if (!audio.paused) audio.pause(); }, 4000);
      return;
    }
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = "en-US";
    utterance.rate = 0.86;
    const voice = pickVoice("en-US", 0);
    if (voice) utterance.voice = voice;
    window.speechSynthesis.speak(utterance);
  });
}

function TranscriptWords({ text, selectedWord, onSelect }: {
  text: string;
  selectedWord: string | null;
  onSelect: (word: string, context: string) => void;
}) {
  const pieces = text.split(/([A-Za-z]+(?:['’-][A-Za-z]+)*)/g).filter(Boolean);
  return <>{pieces.map((piece, index) => {
    const word = normalizeDictionaryWord(piece);
    if (!word) return <span key={`${piece}:${index}`}>{piece}</span>;
    return <button type="button" key={`${piece}:${index}`} className={selectedWord === word ? "transcript-word selected" : "transcript-word"} onClick={() => onSelect(word, text)}>{piece}</button>;
  })}</>;
}

function playSection(
  section: ListeningExamSection,
  onStart: () => void,
  onEnd: () => void,
) {
  window.speechSynthesis.cancel();
  let index = 0;
  const speakers = Array.from(new Set(section.turns.map((turn) => turn.speaker)));
  const playNext = () => {
    const turn = section.turns[index];
    if (!turn) {
      onEnd();
      return;
    }
    const utterance = new SpeechSynthesisUtterance(turn.text);
    utterance.lang = turn.accent;
    utterance.rate = 0.9;
    utterance.pitch = speakers.indexOf(turn.speaker) % 2 ? 0.96 : 1.04;
    const voice = pickVoice(turn.accent, speakers.indexOf(turn.speaker));
    if (voice) utterance.voice = voice;
    utterance.onend = () => {
      index += 1;
      playNext();
    };
    utterance.onerror = onEnd;
    window.speechSynthesis.speak(utterance);
  };
  onStart();
  playNext();
}

function ExamQuestion({
  question,
  value,
  submitted,
  onChange,
}: {
  question: ListeningExamQuestion;
  value: string;
  submitted: boolean;
  onChange: (value: string) => void;
}) {
  const correct = submitted && isListeningAnswerCorrect(question, value);
  return (
    <fieldset className={submitted ? (correct ? "formal-question correct" : "formal-question wrong") : "formal-question"}>
      <legend><span>{question.number}</span>{question.prompt}</legend>
      {question.kind === "choice" ? (
        <div className="formal-options">
          {question.options?.map((option, index) => (
            <button
              type="button"
              key={option}
              disabled={submitted}
              className={value === option ? "selected" : ""}
              onClick={() => onChange(option)}
            ><b>{String.fromCharCode(65 + index)}</b>{option}</button>
          ))}
        </div>
      ) : (
        <label className="formal-gap"><span className="sr-only">Question {question.number}</span><input value={value} disabled={submitted} onChange={(event) => onChange(event.target.value)} autoComplete="off" spellCheck={false} placeholder="Type your answer" /></label>
      )}
      {submitted && <div className="formal-explanation"><b>{correct ? "✓ 正确" : `正确答案：${question.answers[0]}`}</b><span>{question.explanation}</span></div>}
    </fieldset>
  );
}

export function FormalListeningExercise({ savedWords, onSaveWord, onFinish, progress, onCompleteSections, onResetSection, onResetAllSections }: {
  savedWords: SavedVocabularyWord[];
  onSaveWord: (word: SavedVocabularyWord) => void;
  onFinish: (attempt: PracticeAttempt) => void;
  progress: Record<string, LearningItemProgress>;
  onCompleteSections: (ids: string[]) => void;
  onResetSection: (id: string) => void;
  onResetAllSections: () => void;
}) {
  const [mode, setMode] = useState<"mock" | "section">("mock");
  const [mockIndex, setMockIndex] = useState(0);
  const [sectionIndex, setSectionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [played, setPlayed] = useState<Record<number, boolean>>({});
  const [playing, setPlaying] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [seconds, setSeconds] = useState(1800);
  const [started, setStarted] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [selectedTranscriptWord, setSelectedTranscriptWord] = useState<string | null>(null);
  const [transcriptContext, setTranscriptContext] = useState("");
  const [transcriptLookup, setTranscriptLookup] = useState<DictionaryResult | null>(null);
  const [transcriptLookupLoading, setTranscriptLookupLoading] = useState(false);
  const mock = LISTENING_MOCKS[mockIndex];
  const section = mock.sections[sectionIndex];
  const activeQuestions = mode === "mock" ? mock.sections.flatMap((item) => item.questions) : section.questions;
  const answeredInSection = section.questions.filter((question) => answers[question.number]?.trim()).length;
  const score = activeQuestions.filter((question) => isListeningAnswerCorrect(question, answers[question.number] ?? "")).length;
  const equivalentRaw = mode === "mock" ? score : score * 4;
  const estimatedBand = listeningBandFromRaw(equivalentRaw);
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  const transcriptWordSaved = selectedTranscriptWord
    ? savedWords.some((word) => normalizeDictionaryWord(word.word) === selectedTranscriptWord)
    : false;
  const allSectionIds = LISTENING_MOCKS.flatMap((item) => item.sections.map((mockSection) => `${item.id}:section-${mockSection.part}`));
  const completedSectionCount = allSectionIds.filter((id) => progress[id]?.status === "completed").length;
  const currentSectionId = `${mock.id}:section-${section.part}`;
  const completionIds = useMemo(
    () => mode === "mock"
      ? mock.sections.map((item) => `${mock.id}:section-${item.part}`)
      : [currentSectionId],
    [currentSectionId, mock.id, mock.sections, mode],
  );

  useEffect(() => {
    if (!started || submitted || seconds <= 0) return;
    const timer = window.setTimeout(() => {
      if (seconds === 1) {
        window.speechSynthesis?.cancel();
        setPlaying(false);
        setSubmitted(true);
        setSeconds(0);
        onCompleteSections(completionIds);
      } else {
        setSeconds(seconds - 1);
      }
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [completionIds, onCompleteSections, seconds, started, submitted]);

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  useEffect(() => {
    if (!selectedTranscriptWord) return;
    let active = true;
    void lookupDictionaryWord(selectedTranscriptWord, { english: transcriptContext }).then((result) => {
      if (!active) return;
      setTranscriptLookup(result);
      setTranscriptLookupLoading(false);
    });
    return () => { active = false; };
  }, [selectedTranscriptWord, transcriptContext]);

  const closeTranscript = () => {
    setShowTranscript(false);
    setSelectedTranscriptWord(null);
    setTranscriptContext("");
    setTranscriptLookup(null);
    setTranscriptLookupLoading(false);
  };

  const openSection = (index: number) => {
    closeTranscript();
    if (mode === "section" && submitted && index !== sectionIndex) {
      window.speechSynthesis?.cancel();
      setAnswers({});
      setPlayed({});
      setPlaying(false);
      setSubmitted(false);
      setSeconds(600);
      setStarted(false);
    }
    setSectionIndex(index);
  };

  const chooseTranscriptWord = (word: string, context: string) => {
    setSelectedTranscriptWord(word);
    setTranscriptContext(context);
    setTranscriptLookup(null);
    setTranscriptLookupLoading(true);
  };

  const saveTranscriptWord = () => {
    if (!selectedTranscriptWord) return;
    onSaveWord({
      id: `saved:${selectedTranscriptWord}`,
      word: selectedTranscriptWord,
      phonetic: transcriptLookup?.phonetic || "/—/",
      meaning: transcriptLookup?.translation || transcriptLookup?.definition || "待补充释义",
      example: transcriptLookup?.contextEnglish || transcriptContext,
      family: transcriptLookup?.partOfSpeech || "",
      partOfSpeech: transcriptLookup?.partOfSpeech || "",
      contextTranslation: transcriptLookup?.contextTranslation || "",
      addedAt: new Date().toISOString(),
      source: "listening",
    });
  };

  const reset = (nextMock = mockIndex, nextMode = mode) => {
    window.speechSynthesis?.cancel();
    setMockIndex(nextMock);
    setMode(nextMode);
    setSectionIndex(0);
    setAnswers({});
    setPlayed({});
    setPlaying(false);
    setSubmitted(false);
    setSeconds(nextMode === "mock" ? 1800 : 600);
    setStarted(false);
    closeTranscript();
  };

  const startAudio = () => {
    if (!supported || playing || played[section.part]) return;
    setStarted(true);
    setPlayed((current) => ({ ...current, [section.part]: true }));
    playSection(section, () => setPlaying(true), () => setPlaying(false));
  };

  const submit = () => {
    window.speechSynthesis?.cancel();
    setPlaying(false);
    setSubmitted(true);
    onCompleteSections(completionIds);
  };

  const complete = () => onFinish({
    id: crypto.randomUUID(),
    skill: "listening",
    date: dateKey(),
    score,
    maxScore: activeQuestions.length,
    durationSeconds: (mode === "mock" ? 1800 : 600) - seconds,
    mode: mode === "mock" ? "mock" : "drill",
    band: estimatedBand,
  });

  return (
    <div className={submitted ? "formal-exam-shell formal-exam-submitted" : "formal-exam-shell"}>
      <div className="exam-mode-bar">
        <div className="exam-mode-tabs" role="tablist" aria-label="听力训练模式">
          <button role="tab" aria-selected={mode === "mock"} className={mode === "mock" ? "active" : ""} onClick={() => reset(mockIndex, "mock")}>40题完整模考</button>
          <button role="tab" aria-selected={mode === "section"} className={mode === "section" ? "active" : ""} onClick={() => reset(mockIndex, "section")}>Section专项</button>
        </div>
        <label>试卷<select value={mockIndex} onChange={(event) => reset(Number(event.target.value), mode)}>{LISTENING_MOCKS.map((item, index) => <option value={index} key={item.id}>{item.title}</option>)}</select></label>
        <div className={seconds < 300 ? "exam-clock danger" : "exam-clock"}><span>TIME</span><strong>{formatClock(seconds)}</strong></div>
      </div>

      <section className="module-progress-strip" aria-label="听力课程完成进度">
        <div><span>听力总进度</span><strong>{completedSectionCount} / {allSectionIds.length} Sections</strong></div>
        <div className="module-progress-track"><i style={{ width: `${allSectionIds.length ? (completedSectionCount / allSectionIds.length) * 100 : 0}%` }} /></div>
        <button type="button" disabled={!completedSectionCount} onClick={onResetAllSections}>清空全部听力进度</button>
      </section>

      <section className="official-standard-card">
        <span>IELTS FORMAT</span>
        <div><b>4 Sections</b><small>每部分10题</small></div>
        <div><b>40 Questions</b><small>每题1分</small></div>
        <div><b>Once Only</b><small>提交前只播放一次</small></div>
        <div><b>Band 7</b><small>官方参考约30/40</small></div>
      </section>

      <div className="section-progress" role="tablist" aria-label="听力试卷分区">
        {mock.sections.map((item, index) => (
          <button key={item.part} role="tab" disabled={mode === "mock" && index > sectionIndex && !submitted} aria-selected={sectionIndex === index} className={sectionIndex === index ? "active" : ""} onClick={() => openSection(index)}>
            <span>SECTION {item.part}</span><b>{item.part < 3 ? "SOCIAL" : "ACADEMIC"}</b><small>{Object.keys(answers).filter((key) => item.questions.some((q) => q.number === Number(key)) && answers[Number(key)]?.trim()).length}/10</small>
          </button>
        ))}
      </div>

      <div className="formal-listening-layout">
        <aside className="formal-audio-panel">
          <span className="eyebrow light">SECTION {section.part} · {section.context}</span>
          <h2>{section.title}</h2>
          <p>{section.instruction}</p>
          <div className={playing ? "audio-wave active" : "audio-wave"} aria-hidden="true">{Array.from({ length: 28 }, (_, index) => <span key={index} />)}</div>
          {!submitted ? (
            <button className="audio-button" disabled={!supported || playing || played[section.part]} onClick={startAudio}><span>{playing ? "■" : "▶"}</span>{playing ? "正在播放" : played[section.part] ? "本Section已播放" : "播放一次"}</button>
          ) : (
            <button className="audio-button review" disabled={!supported || playing} onClick={() => playSection(section, () => setPlaying(true), () => setPlaying(false))}><span>↻</span>{playing ? "正在复盘" : "复盘重听"}</button>
          )}
          {!supported && <p className="audio-fallback">当前浏览器没有可用的英语语音。请使用最新版Edge、Chrome或Safari。</p>}
          <button type="button" className={showTranscript ? "transcript-toggle active" : "transcript-toggle"} aria-expanded={showTranscript} onClick={() => showTranscript ? closeTranscript() : setShowTranscript(true)}><span>文</span>{showTranscript ? "关闭听力文本" : "打开听力文本"}<small>单词可点击收藏</small></button>
          <div className="audio-rule"><b>考场规则</b><span>播放前先审题；信息与题号顺序一致；注意拼写、单复数和字数限制。</span></div>
        </aside>

        <section className="formal-question-panel">
          <div className="formal-question-head"><div><span className="eyebrow coral">QUESTIONS {section.questions[0].number}–{section.questions.at(-1)?.number}</span><h2>{section.instruction.split(" · ").at(-1)}</h2></div><strong>{answeredInSection}/10</strong></div>
          {progress[currentSectionId]?.status === "completed" && <div className="item-progress-note"><span>✓ 这个 Section 已计入总进度</span><button type="button" onClick={() => onResetSection(currentSectionId)}>清空本 Section 记录</button></div>}
          {section.questions.map((question) => <ExamQuestion key={question.number} question={question} value={answers[question.number] ?? ""} submitted={submitted} onChange={(value) => setAnswers((current) => ({ ...current, [question.number]: value }))} />)}
          {!submitted && mode === "mock" && sectionIndex < 3 && <button className="button primary full formal-section-action" disabled={answeredInSection < 10 || playing} onClick={() => openSection(sectionIndex + 1)}>进入 Section {sectionIndex + 2} →</button>}
          {!submitted && (mode === "section" || sectionIndex === 3) && <button className="button primary full formal-section-action" disabled={mode === "mock" ? Object.values(answers).filter((value) => value.trim()).length < 40 || playing : answeredInSection < 10 || playing} onClick={submit}>{mode === "mock" ? "提交40题完整试卷" : "提交本Section"}</button>}
        </section>

        {showTranscript && <aside className="listening-transcript-drawer" aria-label={`Section ${section.part} 听力文本`}>
          <header><div><span>SECTION {section.part} · TRANSCRIPT</span><h2>听力文本</h2><p>点击文本内任意英文单词，可查看中文和音标并加入生词本。</p></div><button type="button" onClick={closeTranscript} aria-label="关闭听力文本">×</button></header>
          <div className="listening-transcript-copy">
            {section.turns.map((turn, index) => <p key={`${turn.speaker}-${index}`}><b>{turn.speaker}</b><TranscriptWords text={turn.text} selectedWord={selectedTranscriptWord} onSelect={chooseTranscriptWord} /></p>)}
          </div>
          {selectedTranscriptWord && <section className="transcript-word-card" aria-live="polite">
            <div><span>SELECTED WORD</span><strong>{selectedTranscriptWord}</strong><em>{transcriptLookup?.phonetic || (transcriptLookupLoading ? "正在查询音标…" : "/—/")}</em></div>
            <p>{transcriptLookupLoading ? "正在结合所在句查询准确中文…" : transcriptLookup?.translation || transcriptLookup?.definition || "暂未查到可靠中文释义"}</p>
            {!transcriptLookupLoading && transcriptLookup?.partOfSpeech && <em className="word-pos-badge">{formatPartOfSpeech(transcriptLookup.partOfSpeech)}</em>}
            <div><button type="button" onClick={() => speakAmericanWord(selectedTranscriptWord)}>🔊 美式发音</button><button type="button" className={transcriptWordSaved ? "saved" : ""} disabled={transcriptWordSaved} onClick={saveTranscriptWord}>{transcriptWordSaved ? "✓ 已在生词本" : "+ 加入生词本"}</button></div>
          </section>}
        </aside>}
      </div>

      {submitted && <section className="exam-result-card">
        <div><span>RAW SCORE</span><strong>{score}<small> / {activeQuestions.length}</small></strong></div>
        <div><span>ESTIMATED BAND</span><strong>{estimatedBand.toFixed(1)}</strong></div>
        <p>{estimatedBand >= 7 ? "达到Band 7参考线。正式考试前仍需用不同试卷连续验证稳定性。" : estimatedBand >= 6.5 ? "达到Band 6.5参考区间。下一步重点复盘拼写、干扰项和Section 3–4。" : "尚未达到6.5参考线。先按错题所在Section做专项，再返回完整模考。"}<small>换算为近似参考；IELTS官方说明不同试卷的精确换算可能略有变化。</small></p>
        <button className="button dark" onClick={complete}>保存成绩并返回今日</button>
      </section>}
    </div>
  );
}

function speakExaminer(text: string) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-GB";
  utterance.rate = 0.92;
  const voice = pickVoice("en-GB", 0);
  if (voice) utterance.voice = voice;
  window.speechSynthesis.speak(utterance);
}

type SpeakingStage = "intro" | "part1" | "part2prep" | "part2speak" | "part3" | "review";

export function SpeakingMockExam({ onFinish }: { onFinish: (attempt: PracticeAttempt) => void }) {
  const [mockIndex, setMockIndex] = useState(0);
  const [stage, setStage] = useState<SpeakingStage>("intro");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [notes, setNotes] = useState("");
  const [ratings, setRatings] = useState<Record<string, number>>({ fluency: 6, vocabulary: 6, grammar: 6, pronunciation: 6 });
  const [evidence, setEvidence] = useState<Record<string, boolean>>({});
  const [recording, setRecording] = useState(false);
  const [starting, setStarting] = useState(false);
  const [recordingUrl, setRecordingUrl] = useState("");
  const [micMessage, setMicMessage] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mock = SPEAKING_MOCKS[mockIndex];
  const part3 = useMemo(() => mock.part3Ids.map((id) => PART3_QUESTIONS.find((item) => item.id === id)!).filter(Boolean), [mock]);
  const average = Object.values(ratings).reduce((sum, value) => sum + value, 0) / 4;

  const currentQuestion = stage === "part1"
    ? mock.part1Questions[questionIndex]
    : stage === "part2prep" || stage === "part2speak"
      ? mock.part2.prompt
      : stage === "part3"
        ? part3[questionIndex]?.question
        : "";

  const stopRecording = () => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setRecording(false);
  };

  useEffect(() => () => {
    window.speechSynthesis?.cancel();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (recordingUrl) URL.revokeObjectURL(recordingUrl);
  }, [recordingUrl]);

  const beginRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || !("MediaRecorder" in window)) {
      setMicMessage("当前浏览器不支持录音；仍可完成计时模考和评分复盘。");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = () => {
        const url = URL.createObjectURL(new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" }));
        setRecordingUrl((previous) => { if (previous) URL.revokeObjectURL(previous); return url; });
      };
      recorder.start();
      setRecording(true);
      setMicMessage("整场录音中；音频仅保留在当前浏览器页面供复盘。");
    } catch {
      setMicMessage("没有获得麦克风权限；请允许录音后重试，或继续无录音模考。");
    }
  };

  const startTest = async () => {
    if (starting) return;
    setStarting(true);
    await beginRecording();
    setQuestionIndex(0);
    setStage("part1");
    setSeconds(60);
    speakExaminer(mock.part1Questions[0]);
    setStarting(false);
  };

  const advancePart1 = () => {
    if (questionIndex < mock.part1Questions.length - 1) {
      const next = questionIndex + 1;
      setQuestionIndex(next);
      setSeconds(60);
      speakExaminer(mock.part1Questions[next]);
    } else {
      setQuestionIndex(0);
      setStage("part2prep");
      setSeconds(60);
      speakExaminer(mock.part2.prompt);
    }
  };

  const beginPart2Speech = () => {
    setStage("part2speak");
    setSeconds(120);
    speakExaminer("All right. Remember, you have one to two minutes for this, so do not worry if I stop you. Please start speaking now.");
  };

  const beginPart3 = () => {
    setStage("part3");
    setQuestionIndex(0);
    setSeconds(54);
    speakExaminer(part3[0].question);
  };

  const advancePart3 = () => {
    if (questionIndex < part3.length - 1) {
      const next = questionIndex + 1;
      setQuestionIndex(next);
      setSeconds(54);
      speakExaminer(part3[next].question);
    } else {
      stopRecording();
      setStage("review");
      setQuestionIndex(0);
    }
  };

  useEffect(() => {
    if (!["part1", "part2prep", "part2speak", "part3"].includes(stage) || seconds <= 0) return;
    const timer = window.setTimeout(() => {
      if (seconds > 1) {
        setSeconds(seconds - 1);
      } else if (stage === "part1") {
        advancePart1();
      } else if (stage === "part2prep") {
        beginPart2Speech();
      } else if (stage === "part2speak") {
        beginPart3();
      } else {
        advancePart3();
      }
    }, 1000);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds, stage]);

  const skip = () => {
    if (stage === "part1") advancePart1();
    if (stage === "part2prep") beginPart2Speech();
    if (stage === "part2speak") beginPart3();
    if (stage === "part3") advancePart3();
  };

  const reset = (nextMock = mockIndex) => {
    stopRecording();
    window.speechSynthesis?.cancel();
    setMockIndex(nextMock);
    setStage("intro");
    setQuestionIndex(0);
    setSeconds(0);
    setNotes("");
    setEvidence({});
    setRecordingUrl((previous) => { if (previous) URL.revokeObjectURL(previous); return ""; });
    setMicMessage("");
    setStarting(false);
  };

  return (
    <div className="speaking-mock-shell">
      <div className="speaking-mock-head">
        <div><span className="eyebrow coral">FULL SPEAKING MOCK · 11–14 MIN</span><h2>Part 1–3 连续模考</h2><p>考官语音提问、严格计时、整场录音；完成后依据官方四项标准复盘。</p></div>
        <label>套题<select value={mockIndex} disabled={stage !== "intro"} onChange={(event) => reset(Number(event.target.value))}>{SPEAKING_MOCKS.map((item, index) => <option value={index} key={item.id}>{item.title}</option>)}</select></label>
      </div>

      {stage === "intro" && <section className="speaking-start-card">
        <div className="speaking-stage-map"><div><b>Part 1</b><span>4–5 min</span><small>熟悉话题问答</small></div><i /><div><b>Part 2</b><span>3–4 min</span><small>1分钟准备 + 2分钟陈述</small></div><i /><div><b>Part 3</b><span>4–5 min</span><small>抽象讨论与分析</small></div></div>
        <p><b>开始前：</b>进入安静环境并允许麦克风。不要预先阅读参考答案；整场保持英文作答。</p>
        <button className="button primary" onClick={startTest} disabled={starting}>{starting ? "正在准备麦克风…" : "开始完整口语模考"}</button>
        {micMessage && <small>{micMessage}</small>}
      </section>}

      {["part1", "part2prep", "part2speak", "part3"].includes(stage) && <div className="live-speaking-test">
        <div className="live-stage"><span>{stage === "part1" ? "PART 1 · INTERVIEW" : stage.startsWith("part2") ? "PART 2 · LONG TURN" : "PART 3 · DISCUSSION"}</span><b>{recording ? "● RECORDING" : "NO RECORDING"}</b></div>
        <strong className="live-clock">{formatClock(seconds)}</strong>
        <div className="examiner-prompt"><span>EXAMINER</span><h2>{currentQuestion}</h2>{stage.startsWith("part2") && <ul>{mock.part2.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>}</div>
        {stage === "part2prep" && <label className="mock-notes">1分钟笔记（只写关键词）<textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="who / where / what / why…" /></label>}
        {stage === "part2speak" && notes && <div className="note-strip"><b>YOUR NOTES</b><span>{notes}</span></div>}
        <div className="live-actions"><span>{stage === "part1" ? `Question ${questionIndex + 1} / ${mock.part1Questions.length}` : stage === "part3" ? `Question ${questionIndex + 1} / ${part3.length}` : stage === "part2prep" ? "准备时间到后自动开始" : "尽量持续说满两分钟"}</span><button className="button dark" onClick={skip}>{stage === "part2prep" ? "提前开始作答" : "完成本题 →"}</button></div>
      </div>}

      {stage === "review" && <div className="speaking-review">
        <section className="recording-review"><span className="eyebrow coral">RECORDING REVIEW</span><h2>先听录音，再评分</h2>{recordingUrl ? <audio controls src={recordingUrl} /> : <p>本次没有可用录音。仍可依据记忆完成证据核对，但可信度较低。</p>}<div className="evidence-checks">{[
          ["long", "Part 2基本持续到2分钟，Part 3能展开而非只给一句话"],
          ["paraphrase", "至少两次在想不起词时成功换一种说法"],
          ["complex", "使用了多种复杂句，而且多数句子没有基础错误"],
          ["clear", "整段录音无需费力即可听懂，重音与分段基本自然"],
        ].map(([key, label]) => <label key={key}><input type="checkbox" checked={Boolean(evidence[key])} onChange={(event) => setEvidence((current) => ({ ...current, [key]: event.target.checked }))} /><span>{label}</span></label>)}</div></section>
        <section className="anchored-rubric"><span className="eyebrow coral">OFFICIAL CRITERIA</span><h2>Band 6 / 7 锚点评分</h2>{Object.entries(SPEAKING_BAND_ANCHORS).map(([key, anchor]) => <div className="anchor-row" key={key}><div><b>{anchor.name}</b><small>{anchor.zh}</small><p><span>6</span>{anchor.band6}</p><p><span>7</span>{anchor.band7}</p></div><label><input type="range" min="4" max="9" step="0.5" value={ratings[key]} onChange={(event) => setRatings((current) => ({ ...current, [key]: Number(event.target.value) }))} /><strong>{ratings[key].toFixed(1)}</strong></label></div>)}
          <div className="speaking-estimate"><div><span>本次自评估分</span><strong>{average.toFixed(1)}</strong></div><p>{average >= 7 && Object.values(evidence).filter(Boolean).length >= 3 ? "表现接近Band 7锚点。用至少3次不同套题验证稳定性。" : average >= 6.5 ? "处于6.5附近。对照未勾选证据，下一次只修一个最弱环节。" : "尚未稳定达到6.5。先完成Part 3展开训练与录音纠错，再做整套。"}</p></div>
          <button className="button primary full" onClick={() => onFinish({ id: crypto.randomUUID(), skill: "speaking", date: dateKey(), score: average, maxScore: 9, durationSeconds: 690, mode: "mock", band: average, breakdown: ratings })}>保存估分并完成模考</button>
          <small className="score-disclaimer">这是依据官方公开描述语制作的自我校准结果，不等同于认证IELTS考官评分。</small>
        </section>
      </div>}
    </div>
  );
}
