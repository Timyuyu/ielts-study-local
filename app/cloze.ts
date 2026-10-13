export type ClozeLevel = "standard" | "intensive" | "mastery";

export interface ClozeToken {
  text: string;
  blank: boolean;
  index: number;
}

const LEVEL_RATIOS: Record<ClozeLevel, number> = {
  standard: 0.24,
  intensive: 0.36,
  mastery: 0.5,
};

const FUNCTION_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "so", "if", "of", "to", "in", "on", "at", "by", "for", "from",
  "i", "me", "my", "you", "your", "he", "him", "his", "she", "her", "it", "its", "we", "us", "our", "they", "them", "their",
  "is", "am", "are", "was", "were", "be", "been", "being", "do", "does", "did", "have", "has", "had",
  "this", "that", "these", "those", "there", "here", "who", "which", "what", "when", "where", "why", "how",
]);

function hash(value: string): number {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

export function normalizeClozeAnswer(value: string): string {
  return value.trim().toLowerCase().replace(/[’]/g, "'");
}

export function buildClozeExercise(
  text: string,
  seed: string,
  level: ClozeLevel = "intensive",
): ClozeToken[] {
  const pieces = text
    .split(/([A-Za-z]+(?:['’-][A-Za-z]+)*)/g)
    .filter((piece) => piece.length > 0);
  const wordIndexes = pieces
    .map((piece, index) => ({ piece, index }))
    .filter(({ piece }) => /^[A-Za-z]/.test(piece));
  let candidates = wordIndexes.filter(({ piece }) => {
    const normalized = normalizeClozeAnswer(piece);
    return normalized.length >= 3 && !FUNCTION_WORDS.has(normalized);
  });
  if (candidates.length < 6) candidates = wordIndexes;

  const target = Math.min(
    candidates.length,
    Math.max(6, Math.round(candidates.length * LEVEL_RATIOS[level])),
  );
  const selected = new Set<number>();
  for (let slot = 0; slot < target; slot += 1) {
    const start = Math.floor((slot * candidates.length) / target);
    const end = Math.max(start, Math.floor(((slot + 1) * candidates.length) / target) - 1);
    const span = end - start + 1;
    const chosen = start + (hash(`${seed}:${level}:${slot}`) % span);
    selected.add(candidates[chosen].index);
  }

  return pieces.map((piece, index) => ({ text: piece, index, blank: selected.has(index) }));
}

export function getIncorrectClozeIndexes(
  tokens: ClozeToken[],
  entries: Record<number, string>,
): number[] {
  return tokens
    .filter(
      (token) =>
        token.blank &&
        normalizeClozeAnswer(entries[token.index] ?? "") !== normalizeClozeAnswer(token.text),
    )
    .map((token) => token.index);
}
