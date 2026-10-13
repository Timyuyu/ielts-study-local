import { PART1_QUESTIONS, PART2_CUES } from "../app/speaking-bank.ts";
import { PART3_QUESTIONS } from "../app/ielts-speaking-exam.ts";
import { LISTENING_MOCKS } from "../app/ielts-exam-bank.ts";

const STOP_WORDS = new Set(
  "the a an and or but to of in on at for from with is are was were be been being that this it its as by into than then when while after before because so i my me we our they their you your he she his her what who where why how would could should have has had do does did not only also very more most some any each every all can will about through during over under between rather still once one two first later now".split(" "),
);

const tokenSet = (text) => new Set(
  (text.toLowerCase().match(/[a-z]+/g) ?? [])
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word)),
);

const jaccardSimilarity = (left, right) => {
  const leftTokens = tokenSet(left);
  const rightTokens = tokenSet(right);
  let intersection = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) intersection += 1;
  }
  return intersection / (leftTokens.size + rightTokens.size - intersection || 1);
};

const mostSimilarPairs = (items, getText, limit = 8) => {
  const pairs = [];
  for (let left = 0; left < items.length; left += 1) {
    for (let right = left + 1; right < items.length; right += 1) {
      pairs.push({
        similarity: jaccardSimilarity(getText(items[left]), getText(items[right])),
        left: items[left].id,
        right: items[right].id,
      });
    }
  }
  return pairs.sort((a, b) => b.similarity - a.similarity).slice(0, limit);
};

const duplicateGroups = (items, getText) => Object.entries(
  Object.groupBy(items, getText),
)
  .filter(([, group]) => group.length > 1)
  .map(([text, group]) => ({ text, ids: group.map((item) => item.id) }));

console.log("All speaking exact duplicates", {
  part1Prompts: duplicateGroups(PART1_QUESTIONS, (item) => item.question),
  part1Answers: duplicateGroups(PART1_QUESTIONS, (item) => item.answer),
  part2Prompts: duplicateGroups(PART2_CUES, (item) => item.prompt),
  part2Topics: duplicateGroups(PART2_CUES, (item) => item.topic),
  part2Answers: duplicateGroups(PART2_CUES, (item) => item.answer),
  part3Prompts: duplicateGroups(PART3_QUESTIONS, (item) => item.question),
  part3Answers: duplicateGroups(PART3_QUESTIONS, (item) => item.answer),
});

const speakingBanks = [
  ["Part 1 additions", PART1_QUESTIONS.slice(50), (item) => item.answer],
  ["Part 2 additions", PART2_CUES.slice(50), (item) => item.answer],
  ["Part 3 additions", PART3_QUESTIONS.slice(50), (item) => item.answer],
];

for (const [name, items, getText] of speakingBanks) {
  console.log(name, {
    count: items.length,
    uniqueTopics: new Set(items.map((item) => item.topic)).size,
    uniquePrompts: new Set(items.map((item) => item.question ?? item.prompt)).size,
    uniqueAnswers: new Set(items.map(getText)).size,
    mostSimilar: mostSimilarPairs(items, getText),
  });
}

const listeningSections = LISTENING_MOCKS.slice(3).flatMap((mock) => mock.sections.map((section) => ({
  id: `${mock.id}-part-${section.part}`,
  title: section.title,
  text: section.turns.map((turn) => turn.text).join(" "),
  questionAnswerPairs: section.questions.map((question) => `${question.prompt} :: ${question.answers.join(" / ")}`),
})));

console.log("Listening additions", {
  mocks: LISTENING_MOCKS.slice(3).length,
  sections: listeningSections.length,
  uniqueTitles: new Set(listeningSections.map((section) => section.title)).size,
  uniqueTranscripts: new Set(listeningSections.map((section) => section.text)).size,
  uniqueQuestionAnswerPairs: new Set(listeningSections.flatMap((section) => section.questionAnswerPairs)).size,
  mostSimilar: mostSimilarPairs(listeningSections, (section) => section.text),
});
