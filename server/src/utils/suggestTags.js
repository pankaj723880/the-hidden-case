import { generateText } from "./aiClient.js";

function stripHtml(value) {
  return String(value ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function stripCodeFences(value) {
  return String(value ?? "")
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function cleanTag(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/^#/, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 30);
}

export async function suggestTags(title, content, type) {
  try {
    const postType = type === "blog" ? "blog" : "story";
    const excerpt = stripHtml(content).slice(0, 1500);
    const prompt = `You are a tagging system for a literary platform. Given this ${postType} titled "${title}", suggest exactly 5 relevant tags.
Tags should be: lowercase, single words or short hyphenated phrases, specific to genre or theme.
Examples: mystery, dark-fiction, psychological, horror, essay, thriller, romance, supernatural, detective, gothic
Content: ${excerpt}
Return ONLY a JSON array of 5 strings. No explanation. No markdown. Just the array.`;

    const response = await generateText(prompt, 100);
    const parsed = JSON.parse(stripCodeFences(response));
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map(cleanTag)
      .filter(Boolean)
      .filter((tag, index, list) => list.indexOf(tag) === index)
      .slice(0, 5);
  } catch (error) {
    console.error("Tag suggestion failed:", error.message);
    return [];
  }
}
