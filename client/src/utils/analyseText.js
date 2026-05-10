function stripHtml(htmlContent) {
  return String(htmlContent ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function countSyllables(word) {
  let cleaned = String(word ?? "").toLowerCase().replace(/[^a-z]/g, "");
  if (!cleaned) return 0;
  if (cleaned.length <= 3) return 1;

  cleaned = cleaned.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "");
  cleaned = cleaned.replace(/^y/, "");
  const matches = cleaned.match(/[aeiouy]{1,2}/g);
  return matches ? matches.length : 1;
}

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getReadingLevel(score) {
  if (score >= 90) return "Very easy";
  if (score >= 70) return "Easy";
  if (score >= 60) return "Standard";
  if (score >= 50) return "Fairly difficult";
  if (score >= 30) return "Difficult";
  return "Very difficult";
}

export function analyseText(htmlContent) {
  const text = stripHtml(htmlContent);
  if (!text) return null;

  const words = text.split(/\s+/).filter(Boolean);
  const sentences = text
    .split(/[.!?]+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const wordCount = words.length;
  const sentenceCount = Math.max(1, sentences.length);
  const syllableCount = words.reduce(
    (sum, word) => sum + countSyllables(word),
    0,
  );
  const avgWordsPerSentence = wordCount / sentenceCount;
  const avgSyllablesPerWord = syllableCount / Math.max(1, wordCount);
  const fleschScore = clampScore(
    206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord,
  );
  const passiveSentences = sentences.filter((sentence) =>
    /\b(is|are|was|were|be|been|being)\s+\w+ed\b/i.test(sentence),
  ).length;
  const passivePercent = Math.round((passiveSentences / sentenceCount) * 100);
  const longSentenceCount = sentences.filter(
    (sentence) => sentence.split(/\s+/).filter(Boolean).length > 30,
  ).length;

  return {
    fleschScore,
    readingLevel: getReadingLevel(fleschScore),
    avgWordsPerSentence: Math.round(avgWordsPerSentence * 10) / 10,
    passivePercent,
    longSentenceCount,
    wordCount,
  };
}
