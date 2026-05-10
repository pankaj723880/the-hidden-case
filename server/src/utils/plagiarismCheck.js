import natural from "natural";
import { PostModel } from "../models/Post.js";

void natural;

function stripHtml(value) {
  return String(value ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .slice(0, 2000);
}

function trigrams(text) {
  const normalized = String(text ?? "").replace(/\s+/g, " ");
  if (normalized.length < 3) return new Set(normalized ? [normalized] : []);

  const grams = new Set();
  for (let index = 0; index <= normalized.length - 3; index += 1) {
    grams.add(normalized.slice(index, index + 3));
  }
  return grams;
}

function similarity(textA, textB) {
  const gramsA = trigrams(textA);
  const gramsB = trigrams(textB);
  if (gramsA.size === 0 || gramsB.size === 0) return 0;

  let intersection = 0;
  for (const gram of gramsA) {
    if (gramsB.has(gram)) intersection += 1;
  }

  const union = gramsA.size + gramsB.size - intersection;
  return union > 0 ? Math.round((intersection / union) * 100) : 0;
}

export async function checkPlagiarism(newPostContent, excludePostId) {
  try {
    const plainText = stripHtml(newPostContent);
    if (plainText.length < 120) {
      return { similarityScore: 0, isFlagged: false };
    }

    const filter = {
      status: { $in: ["approved", "published"] },
    };
    if (excludePostId) filter._id = { $ne: excludePostId };

    const existingPosts = await PostModel.find(filter)
      .select("title content author")
      .limit(200)
      .lean();

    let bestMatch = {
      similarityScore: 0,
      matchedPostId: null,
      matchedPostTitle: "",
      isFlagged: false,
    };

    for (const post of existingPosts) {
      const score = similarity(plainText, stripHtml(post.content));
      if (score > bestMatch.similarityScore) {
        bestMatch = {
          similarityScore: score,
          matchedPostId: post._id,
          matchedPostTitle: post.title,
          isFlagged: score > 70,
        };
      }
    }

    return bestMatch;
  } catch (error) {
    console.error("Plagiarism check failed:", error.message);
    return { similarityScore: 0, isFlagged: false };
  }
}
