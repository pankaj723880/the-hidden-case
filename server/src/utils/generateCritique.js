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

function toScore(value) {
  if (value === null || value === undefined) return null;
  const score = Number(value);
  if (!Number.isFinite(score)) return null;
  return Math.min(10, Math.max(1, score));
}

function cleanList(value) {
  return Array.isArray(value)
    ? value.filter((item) => typeof item === "string").map((item) => item.trim()).filter(Boolean).slice(0, 3)
    : [];
}

export async function generateCritique(post) {
  try {
    const type = post.type === "blog" ? "blog" : "story";
    const authorName = post.author?.name ?? "the author";
    const excerpt = stripHtml(post.content).slice(0, 3000);
    const prompt = `You are a literary editor for a warm, mysterious fiction and essay platform called The Hidden Case.
Analyze the following ${type} titled "${post.title}" by ${authorName}.

Content: ${excerpt}

Provide a critique in this EXACT JSON format with no extra text:
{
  "scores": { "pacing": N, "tone": N, "readability": N, "characterDepth": N, "plotConsistency": N },
  "summary": "string",
  "strengths": ["string", "string", "string"],
  "improvements": ["string", "string", "string"]
}
Where N is a score from 1 to 10. For blogs, set characterDepth and plotConsistency to null.`;

    const result = await generateText(prompt, 800);
    const parsed = JSON.parse(stripCodeFences(result));
    const scores = {
      pacing: toScore(parsed?.scores?.pacing),
      tone: toScore(parsed?.scores?.tone),
      readability: toScore(parsed?.scores?.readability),
      characterDepth: type === "blog" ? null : toScore(parsed?.scores?.characterDepth),
      plotConsistency: type === "blog" ? null : toScore(parsed?.scores?.plotConsistency),
    };
    const scoreValues = Object.values(scores).filter((score) => Number.isFinite(score));
    const overallScore =
      scoreValues.length > 0
        ? Math.round((scoreValues.reduce((sum, score) => sum + score, 0) / scoreValues.length) * 10) / 10
        : null;

    return {
      scores,
      summary: typeof parsed.summary === "string" ? parsed.summary.trim() : "",
      strengths: cleanList(parsed.strengths),
      improvements: cleanList(parsed.improvements),
      overallScore,
    };
  } catch (error) {
    console.error("Critique generation failed:", error.message);
    return null;
  }
}
