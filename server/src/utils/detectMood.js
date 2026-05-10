import { generateText } from "./aiClient.js";

const MOODS = [
  "dark",
  "hopeful",
  "tense",
  "melancholy",
  "suspenseful",
  "humorous",
  "romantic",
  "philosophical",
];

function stripHtml(value) {
  return String(value ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export async function detectMood(title, content) {
  try {
    const excerpt = stripHtml(content).slice(0, 1000);
    const prompt = `Classify the emotional mood of this literary piece titled "${title}".
Content: ${excerpt}
Choose exactly ONE mood from this list: ${MOODS.join(", ")}
Return ONLY the single mood word. No explanation. No punctuation. Just the word.`;

    const response = await generateText(prompt, 10);
    const mood = String(response ?? "").trim().toLowerCase().replace(/[^a-z-]/g, "");
    return MOODS.includes(mood) ? mood : null;
  } catch (error) {
    console.error("Mood detection failed:", error.message);
    return null;
  }
}
