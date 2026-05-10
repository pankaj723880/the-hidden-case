import { Router } from "express";
import { aiLimit } from "../middleware/rateLimit.js";
import { requireAuth } from "../middleware/auth.js";
import { generateText } from "../utils/aiClient.js";

export const aiRouter = Router();

aiRouter.use(aiLimit);

const prompts = {
  continue:
    "You are a creative writing assistant. Continue the following story or blog naturally in the same style, tone, and voice. Write the next 2 to 3 paragraphs only. Do not add a title or commentary.",
  improve:
    "You are an editor. Rewrite the following passage to be more vivid, engaging, and atmospheric. Keep the same meaning and length. Return only the rewritten text.",
  "fix-grammar":
    "Fix all grammar and spelling errors in the following text. Keep the same style and voice. Return only the corrected text.",
  summarize:
    "Write a compelling 1 to 2 sentence excerpt or teaser for this story or blog post. Make it intriguing. Return only the excerpt.",
  "generate-title":
    "Generate exactly 5 creative, mysterious, and intriguing title options for this story or blog. Return them as a numbered list, one per line, no explanation.",
};

aiRouter.post("/ai/suggest", requireAuth, async (req, res) => {
  const content = typeof req.body.content === "string" ? req.body.content : "";
  const instruction =
    typeof req.body.instruction === "string" ? req.body.instruction : "";
  const customPrompt =
    typeof req.body.customPrompt === "string" ? req.body.customPrompt.trim() : "";
  const systemPrompt =
    instruction === "custom"
      ? customPrompt
      : prompts[instruction];

  if (!systemPrompt) {
    return res.status(400).json({ error: "Invalid AI instruction" });
  }

  if (instruction === "custom" && customPrompt.length > 500) {
    return res
      .status(400)
      .json({ error: "Custom instruction must be 500 characters or less" });
  }

  if (!content.trim()) {
    return res.status(400).json({ error: "Content is required" });
  }

  try {
    const result = await generateText(`${systemPrompt}\n\n${content}`);
    return res.json({ result });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
