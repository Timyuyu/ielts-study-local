export interface DictionaryResult {
  query: string;
  word: string;
  phonetic: string;
  translation: string;
  definition: string;
  partOfSpeech: string;
  example: string;
  examples: DictionaryExample[];
  senses: DictionarySense[];
  contextEnglish: string;
  contextTranslation: string;
  found: boolean;
}

export interface DictionarySense {
  partOfSpeech: string;
  translation: string;
  definition: string;
  example: string;
}

export interface DictionaryExample {
  english: string;
  chinese: string;
}

export interface DictionaryLookupContext {
  english?: string;
  chinese?: string;
  examples?: DictionaryExample[];
}

interface DictionaryApiEntry {
  word?: string;
  phonetic?: string;
  phonetics?: { text?: string; audio?: string }[];
  meanings?: {
    partOfSpeech?: string;
    definitions?: { definition?: string; example?: string }[];
  }[];
}

interface TranslationApiResult {
  responseData?: { translatedText?: string };
  responseStatus?: number;
  matches?: { translation?: string; quality?: string | number; match?: number }[];
}

interface GoogleTranslationLookup {
  translatedText: string;
  dictionary: Record<string, string[]>;
}

const EMPTY_GOOGLE_TRANSLATION: GoogleTranslationLookup = {
  translatedText: "",
  dictionary: {},
};

const CURATED_TRANSLATIONS: Record<string, string> = {
  demanding: "苛刻的；要求高的；费力的",
  shallow: "浅的；肤浅的",
  social: "社会的；社交的",
};

// ==================== 离线词典（ECDICT 核心词库，本地 /dict/ecdict.json）====================
interface OfflineDictEntry {
  p?: string; // 音标
  t: string;  // 中文释义（词典式，可含多行：n. …\nvt. …）
  c?: string; // 柯林斯星级
  o?: number; // 牛津 3000 核心词标记
  g?: string; // 考试标签（zk/gk/cet4/cet6/ky/toefl/ielts/gre）
}
interface OfflineLookupResult {
  word: string;
  entry: OfflineDictEntry;
}

let offlineDictPromise: Promise<Record<string, OfflineDictEntry> | null> | null = null;

function loadOfflineDictionary(): Promise<Record<string, OfflineDictEntry> | null> {
  if (!offlineDictPromise) {
    offlineDictPromise = fetch("/dict/ecdict.json", { cache: "force-cache" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { w?: Record<string, OfflineDictEntry> } | null) => data?.w ?? null)
      .catch(() => null);
  }
  return offlineDictPromise;
}

async function lookupOfflineDictionary(word: string): Promise<OfflineLookupResult | null> {
  const dict = await loadOfflineDictionary();
  if (!dict) return null;
  for (const candidate of dictionaryCandidates(word)) {
    const entry = dict[candidate];
    if (entry) return { word: candidate, entry };
  }
  return null;
}

const OFFLINE_POS_MAP: Record<string, string> = {
  n: "noun", v: "verb", vt: "verb", vi: "verb", a: "adjective", adj: "adjective",
  ad: "adverb", adv: "adverb", prep: "preposition", conj: "conjunction",
  pron: "pronoun", num: "numeral", art: "article", int: "interjection",
  aux: "auxiliary", det: "determiner", abbr: "abbreviation",
};

function parseOfflineSenses(translation: string): DictionarySense[] {
  const senses: DictionarySense[] = [];
  // ECDICT 的释义行之间是字面 \n（反斜杠 + n），先转为真实换行再按行解析
  const lines = translation.replace(/\\n/g, "\n").split("\n");
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const match = line.match(/^([a-z]{1,4})\.\s+(.+)$/i);
    if (match) {
      const partOfSpeech = OFFLINE_POS_MAP[match[1].toLowerCase()] ?? "";
      senses.push({ partOfSpeech, translation: match[2].trim(), definition: "", example: "" });
    } else {
      senses.push({ partOfSpeech: "", translation: line, definition: "", example: "" });
    }
  }
  const seen = new Set<string>();
  return senses
    .filter((sense) => {
      const key = `${sense.partOfSpeech}|${sense.translation}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 4);
}

interface ContextualSense {
  partOfSpeech: string;
  translation: string;
  pattern: RegExp;
}

const CONTEXTUAL_SENSES: Record<string, ContextualSense[]> = {
  social: [
    { partOfSpeech: "adjective", translation: "社交的（social media：社交媒体）", pattern: /\bsocial\s+media\b/i },
    { partOfSpeech: "adjective", translation: "社会的；社会层面的", pattern: /\bsocial\s+(change|costs?|history|pressure|responsibility|effects?|issues?|problems?)\b/i },
    { partOfSpeech: "adjective", translation: "社交的；人际交往的", pattern: /\bsocial\s+(life|occasions?|connections?|contact|isolation|activities|skills?)\b/i },
    { partOfSpeech: "adjective", translation: "人际互动的；社会的", pattern: /\bsocial\s+dynamics\b/i },
  ],
  shallow: [
    { partOfSpeech: "adjective", translation: "肤浅的；浅薄的", pattern: /\b(?:being|seem|seems|appear|appears|sound|sounds)\s+(?:\w+\s+){0,2}shallow\b|\bshallow\s+(?:story|stories|thinking|argument|person|people)\b/i },
    { partOfSpeech: "adjective", translation: "浅的；深度较小的", pattern: /\bshallow\s+(?:water|waters|pool|pools|river|rivers|channel|channels|garden|gardens|dish|dishes|breathing|grave|graves)\b/i },
  ],
};

const PART_OF_SPEECH_LABELS: Record<string, string> = {
  noun: "n. 名词",
  verb: "v. 动词",
  adjective: "adj. 形容词",
  adverb: "adv. 副词",
  pronoun: "pron. 代词",
  preposition: "prep. 介词",
  conjunction: "conj. 连词",
  determiner: "det. 限定词",
  interjection: "int. 感叹词",
  auxiliary: "aux. 助动词",
  exclamation: "int. 感叹词",
};

export function formatPartOfSpeech(value: string): string {
  const normalized = value.trim().toLowerCase();
  return PART_OF_SPEECH_LABELS[normalized] ?? (normalized ? value : "词性待确认");
}

function contextualSenseFor(word: string, sentence: string): ContextualSense | null {
  return (CONTEXTUAL_SENSES[word] ?? []).find((sense) => sense.pattern.test(sentence)) ?? null;
}

const COMMON_TRANSLATIONS: Record<string, string> = {
  a: "一个；一（不定冠词）", an: "一个；一（用于元音前）", the: "这；那（定冠词）",
  and: "和；而且", but: "但是", or: "或者", because: "因为", so: "所以；因此",
  if: "如果", although: "虽然；尽管", while: "当……时；然而", than: "比；与……相比",
  to: "到；向；用于构成不定式", of: "……的", in: "在……里面", on: "在……上；关于",
  at: "在；于", for: "为了；给；持续", with: "和；带有；用", from: "从；来自",
  by: "由；通过；在……旁", about: "关于；大约", as: "作为；像；当……时",
  i: "我", you: "你；你们", he: "他", she: "她", it: "它；这件事", we: "我们", they: "他们；它们",
  my: "我的", your: "你的；你们的", his: "他的", her: "她的；她", our: "我们的", their: "他们的",
  me: "我（宾格）", him: "他（宾格）", us: "我们（宾格）", them: "他们（宾格）",
  this: "这个；这", that: "那个；那；引导从句", these: "这些", those: "那些",
  is: "是；处于", are: "是；处于", was: "是；曾经是", were: "是；曾经是", be: "是；成为",
  been: "be 的过去分词", being: "存在；处于；be 的现在分词", have: "有；已经", has: "有；已经", had: "有过；已经",
  do: "做；确实", does: "做；确实", did: "做了；确实", can: "能够；可以", could: "能够；可能；可以",
  will: "将会；愿意", would: "会；愿意；过去常常", should: "应该", may: "可能；可以", might: "可能", must: "必须；一定",
  not: "不；没有", no: "不；没有", yes: "是；对", very: "非常", really: "真正地；确实",
  more: "更多；更加", most: "最多；大多数", less: "更少；较不", only: "只；仅仅", just: "只是；刚刚；正好",
  time: "时间；次数", people: "人们", useful: "有用的", simple: "简单的", often: "经常",
  usually: "通常", different: "不同的", important: "重要的", experience: "经历；体验；经验",
  practical: "实用的；实际的", meaningful: "有意义的", personal: "个人的；私人的", memorable: "难忘的",
  comfortable: "舒适的；自在的", difficult: "困难的", clear: "清楚的；明确的", quiet: "安静的",
  crowded: "拥挤的", ordinary: "普通的", local: "当地的；本地的", public: "公共的；公众的",
  family: "家庭；家人", friend: "朋友", friends: "朋友们", city: "城市", place: "地方；地点",
  home: "家；在家", study: "学习；研究", work: "工作；起作用", learn: "学习；学会", learned: "学会了；博学的",
  english: "英语；英国的", conversation: "交谈；对话", presentation: "演示；陈述", process: "过程；处理",
  plan: "计划；规划", result: "结果", reason: "原因；理由", detail: "细节", example: "例子；实例",
  day: "一天；白天", week: "星期；周", year: "年", morning: "早晨；上午", minute: "分钟", minutes: "分钟（复数）",
  food: "食物", meal: "一餐；饭", phone: "电话；手机", book: "书；预订", film: "电影；拍摄",
  travel: "旅行；出行", transport: "交通；运输", weather: "天气", park: "公园；停车", room: "房间；空间",
  address: "地址；处理；演说", approach: "方法；接近；着手处理", benefit: "益处；使受益",
  challenge: "挑战；质疑", course: "课程；过程；路线", issue: "问题；议题；发布", matter: "事情；要紧",
  point: "要点；观点；指向", subject: "主题；学科；使遭受", value: "价值；重视", support: "支持；支撑",
  develop: "发展；培养；形成", improve: "改善；提高", provide: "提供", affect: "影响",
  community: "社区；群体", environment: "环境", opportunity: "机会", convenient: "方便的",
  effective: "有效的", ability: "能力", skill: "技能；技巧",
  visit: "参观；拜访", walking: "步行；走路", reading: "阅读", learning: "学习", studying: "学习；研究",
  focus: "专注；重点", concentrate: "集中注意力", remember: "记得；想起", enjoy: "享受；喜欢",
  prefer: "更喜欢", choose: "选择", help: "帮助", change: "改变；变化", share: "分享；共同使用",
  spend: "花费；度过", feel: "感觉；认为", felt: "感觉到；觉得", make: "制作；使得", made: "制作了；使得",
  keep: "保持；保留", use: "使用；用途", need: "需要", know: "知道；了解", think: "认为；思考",
  try: "尝试；努力", take: "拿；花费；乘坐", give: "给；提供", gives: "给予；提供", leave: "离开；留下",
  first: "第一；首先", before: "在……之前", after: "在……之后", during: "在……期间", together: "一起",
  around: "周围；大约", near: "靠近；附近", close: "近的；关闭", down: "向下；减少", out: "出去；在外",
  own: "自己的；拥有", enough: "足够的；足够地", several: "几个；若干", few: "少数；几个", many: "许多",
  every: "每一个", each: "每一个；各自", another: "另一个", something: "某事；某物", without: "没有；不带",
};

const IRREGULAR_BASES: Record<string, string> = {
  was: "be", were: "be", went: "go", gone: "go", felt: "feel", made: "make",
  had: "have", did: "do", taught: "teach", thought: "think", bought: "buy",
  brought: "bring", took: "take", given: "give", gave: "give", learned: "learn",
  children: "child", men: "man", women: "woman", people: "person", feet: "foot",
  teeth: "tooth", mice: "mouse", better: "good", best: "good", worse: "bad", worst: "bad",
  written: "write", wrote: "write", spoken: "speak", spoke: "speak", seen: "see", saw: "see",
  known: "know", knew: "know", found: "find", left: "leave", kept: "keep", spent: "spend",
  // 常用不规则动词过去式 / 过去分词（提升离线查词命中）
  met: "meet", came: "come", told: "tell", been: "be", swam: "swim", grew: "grow",
  got: "get", said: "say", sat: "sit", ran: "run", stood: "stand", slept: "sleep",
  ate: "eat", drank: "drink", rode: "ride", drove: "drive", wore: "wear",
  broke: "break", stole: "steal", flew: "fly", drew: "draw", threw: "throw",
  sang: "sing", rang: "ring", began: "begin", woke: "wake", chose: "choose",
  rose: "rise", fell: "fall", held: "hold", sold: "sell", sent: "send",
  lent: "lend", built: "build", meant: "mean", paid: "pay", laid: "lay",
  arisen: "arise", driven: "drive", worn: "wear", broken: "break",
  stolen: "steal", flown: "fly", drawn: "draw", thrown: "throw", sung: "sing",
  rung: "ring", begun: "begin", woken: "wake", chosen: "choose", risen: "rise",
  fallen: "fall",
};

const lookupCache = new Map<string, DictionaryResult>();
const translationCache = new Map<string, string>();
const googleTranslationCache = new Map<string, GoogleTranslationLookup>();
const myMemoryTranslationCache = new Map<string, string>();

export function normalizeDictionaryWord(value: string): string {
  return value
    .toLowerCase()
    .replace(/[’]/g, "'")
    .replace(/^[^a-z]+|[^a-z']+$/g, "")
    .trim();
}

export function dictionaryCandidates(word: string): string[] {
  const candidates = [word, IRREGULAR_BASES[word]];
  if (word.endsWith("ies") && word.length > 4) candidates.push(`${word.slice(0, -3)}y`);
  if (word.endsWith("ing") && word.length > 4) {
    const stem = word.slice(0, -3);
    candidates.push(stem, `${stem}e`);
    if (stem.at(-1) === stem.at(-2)) candidates.push(stem.slice(0, -1));
  }
  if (word.endsWith("ed") && word.length > 4) {
    const stem = word.slice(0, -2);
    candidates.push(stem, word.slice(0, -1));
    if (stem.endsWith("i")) candidates.push(`${stem.slice(0, -1)}y`);
    if (stem.at(-1) === stem.at(-2)) candidates.push(stem.slice(0, -1));
  }
  if (word.endsWith("ves") && word.length > 4) candidates.push(`${word.slice(0, -3)}f`, `${word.slice(0, -3)}fe`);
  if (word.endsWith("es") && word.length > 4) candidates.push(word.slice(0, -2));
  if (word.endsWith("s") && word.length > 3) candidates.push(word.slice(0, -1));
  // 比较级 / 最高级
  if (word.endsWith("est") && word.length > 5) {
    candidates.push(word.slice(0, -3), `${word.slice(0, -3)}e`);
  }
  if (word.endsWith("er") && word.length > 4) {
    candidates.push(word.slice(0, -2), `${word.slice(0, -2)}e`);
  }
  // 缩略形式（'s / 'll / 'd / 've / 're / n't）
  const apostrophe = word.match(/^([a-z]+)'(s|ll|d|ve|re|t)$/i);
  if (apostrophe) candidates.push(apostrophe[1]);
  return [...new Set(candidates.filter(Boolean) as string[])].slice(0, 10);
}

export function likelyPartsOfSpeech(word: string, sentence = ""): string[] {
  const scores: Record<string, number> = { noun: 0, verb: 0, adjective: 0, adverb: 0 };
  const tokens = sentence.toLowerCase().match(/[a-z]+(?:['’-][a-z]+)*/g) ?? [];
  const index = tokens.findIndex((token) => normalizeDictionaryWord(token) === word);
  const previous = index > 0 ? normalizeDictionaryWord(tokens[index - 1]) : "";
  const next = index >= 0 && index < tokens.length - 1 ? normalizeDictionaryWord(tokens[index + 1]) : "";

  if (previous === "to" || /^(can|could|will|would|shall|should|may|might|must|do|does|did)$/.test(previous)) scores.verb += 8;
  if (/^(a|an|the|this|that|these|those|my|your|his|her|our|their|each|every)$/.test(previous)) {
    scores.noun += 6;
    scores.adjective += 3;
  }
  if (/^(am|is|are|was|were|be|been|being|seem|seems|feel|feels|look|looks|become|becomes)$/.test(previous)) {
    scores.adjective += 5;
    scores.verb += 2;
  }
  if (/^(very|really|quite|rather|too|so|more|most|less|extremely)$/.test(previous)) {
    scores.adjective += 6;
    scores.adverb += 3;
  }
  if (/^(to|for|of|with|about|from|at|in|on|by)$/.test(previous)) scores.noun += 3;
  if (/^(is|are|was|were|has|have|had)$/.test(next) && word.endsWith("ing")) scores.noun += 2;
  if (next && !/^(and|or|but|to|of|in|on|at|for|with|from|by|as|than|is|are|was|were|be|been|being|has|have|had|do|does|did|can|could|will|would|should|may|might|must)$/.test(next)) {
    scores.adjective += 2;
  }
  if (word.endsWith("ly")) scores.adverb += 8;
  if (/(tion|sion|ment|ness|ity|ance|ence|ship)$/.test(word)) scores.noun += 6;
  if (/(ous|ful|less|able|ible|ive|al|ic)$/.test(word)) scores.adjective += 6;
  if (/(ing|ed)$/.test(word)) {
    scores.verb += 4;
    scores.adjective += 2;
  }

  return Object.entries(scores)
    .sort((left, right) => right[1] - left[1])
    .map(([part]) => part);
}

async function fetchWithTimeout(url: string, timeout = 6500): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    window.clearTimeout(timer);
  }
}

async function fetchDictionary(word: string): Promise<DictionaryApiEntry | null> {
  for (const candidate of dictionaryCandidates(word)) {
    try {
      const response = await fetchWithTimeout(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(candidate)}`,
      );
      if (!response.ok) continue;
      const data = await response.json() as DictionaryApiEntry[];
      if (Array.isArray(data) && data[0]) return data[0];
    } catch {
      // Try the translation result or a simpler word form below.
    }
  }
  return null;
}

function decodeTranslation(value: string): string {
  const named: Record<string, string> = { amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " " };
  return value
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (entity, name: string) => named[name.toLowerCase()] ?? entity)
    .replace(/\s+/g, " ")
    .trim();
}

function isUsefulChineseTranslation(value: string, source: string): boolean {
  return /[\u3400-\u9fff]/.test(value) && value.toLowerCase() !== source.toLowerCase() && value.length <= 240;
}

function parseGoogleTranslation(data: unknown): GoogleTranslationLookup {
  if (!Array.isArray(data)) return EMPTY_GOOGLE_TRANSLATION;
  const translatedText = (Array.isArray(data[0]) ? data[0] : [])
    .map((segment) => Array.isArray(segment) && typeof segment[0] === "string" ? segment[0] : "")
    .join("")
    .replace(/\s+/g, " ")
    .trim();
  const dictionary: Record<string, string[]> = {};
  for (const row of Array.isArray(data[1]) ? data[1] : []) {
    if (!Array.isArray(row) || typeof row[0] !== "string" || !Array.isArray(row[1])) continue;
    dictionary[row[0].toLowerCase()] = row[1]
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim())
      .filter((value) => isUsefulChineseTranslation(value, ""));
  }
  return { translatedText, dictionary };
}

async function fetchGoogleTranslation(text: string): Promise<GoogleTranslationLookup> {
  const source = text.trim();
  if (!source) return EMPTY_GOOGLE_TRANSLATION;
  const cached = googleTranslationCache.get(source);
  if (cached) return cached;
  try {
    const query = new URLSearchParams({ client: "gtx", sl: "en", tl: "zh-CN", q: source });
    query.append("dt", "t");
    query.append("dt", "bd");
    const response = await fetchWithTimeout(
      `https://translate.googleapis.com/translate_a/single?${query.toString()}`,
    );
    if (!response.ok) return EMPTY_GOOGLE_TRANSLATION;
    const lookup = parseGoogleTranslation(await response.json());
    googleTranslationCache.set(source, lookup);
    return lookup;
  } catch {
    return EMPTY_GOOGLE_TRANSLATION;
  }
}

async function fetchMyMemoryTranslation(text: string): Promise<string> {
  const source = text.trim();
  if (!source) return "";
  const cached = myMemoryTranslationCache.get(source);
  if (cached !== undefined) return cached;
  try {
    const query = new URLSearchParams({ q: source, langpair: "en|zh-CN" });
    const response = await fetchWithTimeout(
      `https://api.mymemory.translated.net/get?${query.toString()}`,
    );
    if (!response.ok) return "";
    const data = await response.json() as TranslationApiResult;
    const options = [
      { value: data.responseData?.translatedText ?? "", score: 100 },
      ...(data.matches ?? []).map((match) => ({
        value: match.translation ?? "",
        score: Number(match.quality ?? 0) + Number(match.match ?? 0) * 20,
      })),
    ]
      .map((option) => ({ ...option, value: decodeTranslation(option.value) }))
      .filter((option) => isUsefulChineseTranslation(option.value, source))
      .sort((left, right) => right.score - left.score);
    const translated = options[0]?.value ?? "";
    myMemoryTranslationCache.set(source, translated);
    return translated;
  } catch {
    return "";
  }
}

async function fetchMachineTranslation(text: string): Promise<string> {
  const source = text.trim();
  if (!source) return "";
  const cached = translationCache.get(source);
  if (cached !== undefined) return cached;
  const google = await fetchGoogleTranslation(source);
  const googleText = decodeTranslation(google.translatedText);
  const translated = isUsefulChineseTranslation(googleText, source)
    ? googleText
    : await fetchMyMemoryTranslation(source);
  translationCache.set(source, translated);
  return translated;
}

function firstDictionaryTranslation(lookup: GoogleTranslationLookup, partOfSpeech: string): string {
  return (lookup.dictionary[partOfSpeech.toLowerCase()] ?? [])
    .find((value) => isUsefulChineseTranslation(value, "") && value.length <= 18) ?? "";
}

async function fetchWordTranslation(
  query: string,
  resolvedWord: string,
  partOfSpeech: string,
  fallback: string,
): Promise<string> {
  const curated = CURATED_TRANSLATIONS[query];
  if (curated) return curated;
  const common = COMMON_TRANSLATIONS[query]
    || COMMON_TRANSLATIONS[normalizeDictionaryWord(resolvedWord)]
    || "";
  if (partOfSpeech !== "verb" && common) return common;

  const google = await fetchGoogleTranslation(query);
  if (partOfSpeech === "verb") {
    const baseVerb = normalizeDictionaryWord(resolvedWord) || query;
    const verbPrompt = /(?:ing|ed)$/.test(query) && baseVerb === query ? query : `to ${baseVerb}`;
    const verbTranslation = (await fetchGoogleTranslation(verbPrompt)).translatedText;
    if (isUsefulChineseTranslation(verbTranslation, verbPrompt) && verbTranslation.length <= 24) {
      return decodeTranslation(verbTranslation);
    }
    const myMemoryVerb = await fetchMyMemoryTranslation(verbPrompt);
    if (isUsefulChineseTranslation(myMemoryVerb, verbPrompt) && myMemoryVerb.length <= 24) {
      return myMemoryVerb;
    }
  }

  const googleText = decodeTranslation(google.translatedText);
  if (isUsefulChineseTranslation(googleText, query) && googleText.length <= 36) return googleText;
  const dictionaryTranslation = firstDictionaryTranslation(google, partOfSpeech);
  if (dictionaryTranslation) return dictionaryTranslation;
  if (partOfSpeech === "verb" && fallback) return fallback;
  const myMemory = await fetchMyMemoryTranslation(query);
  return myMemory || common || fallback;
}

function rankedMeanings(entry: DictionaryApiEntry | null, word: string, context: DictionaryLookupContext) {
  const order = likelyPartsOfSpeech(word, context.english);
  return [...(entry?.meanings ?? [])].sort((left, right) => {
    const leftIndex = order.indexOf(left.partOfSpeech ?? "");
    const rightIndex = order.indexOf(right.partOfSpeech ?? "");
    return (leftIndex < 0 ? 99 : leftIndex) - (rightIndex < 0 ? 99 : rightIndex);
  });
}

export async function lookupDictionaryWord(value: string, context: DictionaryLookupContext = {}): Promise<DictionaryResult> {
  const query = normalizeDictionaryWord(value);
  const contextEnglish = context.english?.replace(/\s+/g, " ").trim() ?? "";
  const contextTranslation = context.chinese?.replace(/\s+/g, " ").trim() ?? "";
  const suppliedExamples = (context.examples ?? [])
    .map((example) => ({
      english: example.english.replace(/\s+/g, " ").trim(),
      chinese: example.chinese.replace(/\s+/g, " ").trim(),
    }))
    .filter((example) => example.english);
  const cacheKey = `${query}|${contextEnglish.toLowerCase()}|${contextTranslation}|${suppliedExamples.map((example) => example.english.toLowerCase()).join("~")}`;
  const cached = lookupCache.get(cacheKey);
  if (cached) return cached;

  const [offline, entry, directTranslation] = await Promise.all([
    lookupOfflineDictionary(query),
    fetchDictionary(query),
    COMMON_TRANSLATIONS[query] ? Promise.resolve(COMMON_TRANSLATIONS[query]) : fetchMachineTranslation(query),
  ]);
  if (offline) {
    // 离线核心词库命中：词典式释义优先，不再依赖在线翻译
    const result = await buildOfflineResult(query, offline, contextEnglish, contextTranslation, suppliedExamples);
    lookupCache.set(cacheKey, result);
    return result;
  }
  const contextualSense = contextualSenseFor(query, contextEnglish);
  const meanings = rankedMeanings(entry, query, context);
  const rawSenses = meanings
    .flatMap((meaning) => (meaning.definitions ?? []).slice(0, 1).map((definition) => ({
      partOfSpeech: meaning.partOfSpeech ?? "",
      definition: definition.definition ?? "",
      example: definition.example ?? "",
    })))
    .filter((sense, index, senses) => sense.definition && senses.findIndex((item) => item.definition === sense.definition) === index)
    .slice(0, 3);
  const senses: DictionarySense[] = await Promise.all(rawSenses.map(async (sense) => ({
    ...sense,
    translation: await fetchMachineTranslation(sense.definition),
  })));
  const primarySense = contextualSense
    ? senses.find((sense) => sense.partOfSpeech === contextualSense.partOfSpeech) ?? senses[0]
    : senses[0];
  const resolvedWord = entry?.word || query;
  const partOfSpeech = contextualSense?.partOfSpeech || primarySense?.partOfSpeech || likelyPartsOfSpeech(query, contextEnglish)[0] || "";
  const translation = contextualSense?.translation || await fetchWordTranslation(
    query,
    resolvedWord,
    partOfSpeech,
    primarySense?.translation || directTranslation || "",
  );
  const exampleCandidates = meanings
    .flatMap((meaning) => meaning.definitions ?? [])
    .map((definition) => definition.example?.replace(/\s+/g, " ").trim() ?? "")
    .filter(Boolean);
  const examples: DictionaryExample[] = [];
  const addExample = (example: DictionaryExample) => {
    if (!example.english || examples.some((item) => item.english.toLowerCase() === example.english.toLowerCase())) return;
    examples.push(example);
  };
  suppliedExamples.forEach(addExample);
  for (const english of exampleCandidates) {
    if (examples.length >= 3) break;
    addExample({ english, chinese: await fetchMachineTranslation(english) });
  }
  const phonetic = entry?.phonetic || entry?.phonetics?.find((item) => item.text)?.text || "";
  const result: DictionaryResult = {
    query,
    word: resolvedWord,
    phonetic: phonetic ? `/${phonetic.replace(/^\/+|\/+$/g, "")}/` : "",
    translation,
    definition: primarySense?.definition ?? "",
    partOfSpeech,
    example: examples[0]?.english || primarySense?.example || "",
    examples: examples.slice(0, 3),
    senses,
    contextEnglish,
    contextTranslation,
    found: Boolean(translation || primarySense?.definition),
  };
  lookupCache.set(cacheKey, result);
  return result;
}

// 用离线核心词库（ECDICT）组装词典结果：词典式释义，无需在线请求
async function buildOfflineResult(
  query: string,
  offline: OfflineLookupResult,
  contextEnglish: string,
  contextTranslation: string,
  suppliedExamples: DictionaryExample[],
): Promise<DictionaryResult> {
  const senses = parseOfflineSenses(offline.entry.t);
  const contextualSense = contextualSenseFor(query, contextEnglish);
  const likelyPos = likelyPartsOfSpeech(query, contextEnglish);
  const partOfSpeech = contextualSense?.partOfSpeech
    || likelyPos[0]
    || senses.find((sense) => sense.partOfSpeech)?.partOfSpeech
    || "";
  const preferred = senses.find((sense) => sense.partOfSpeech === partOfSpeech) ?? senses[0];

  // 释义优先级：上下文人工规则 > 人工校对词表 > 离线词典（按词性匹配）> 词典首义
  const curated = CURATED_TRANSLATIONS[query];
  const common = COMMON_TRANSLATIONS[query] || COMMON_TRANSLATIONS[normalizeDictionaryWord(offline.word)] || "";
  const translation = contextualSense?.translation
    || curated
    || (partOfSpeech !== "verb" ? common : "")
    || preferred?.translation
    || senses[0]?.translation
    || common
    || "";

  const examples: DictionaryExample[] = [];
  const addExample = (example: DictionaryExample) => {
    if (!example.english || examples.some((item) => item.english.toLowerCase() === example.english.toLowerCase())) return;
    examples.push(example);
  };
  suppliedExamples.forEach(addExample);

  return {
    query,
    word: offline.word,
    phonetic: offline.entry.p ? `/${offline.entry.p.replace(/^\/+|\/+$/g, "")}/` : "",
    translation,
    definition: preferred?.translation ?? "",
    partOfSpeech,
    example: examples[0]?.english || "",
    examples,
    senses,
    contextEnglish,
    contextTranslation,
    found: Boolean(translation),
  };
}
