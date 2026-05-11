import { env } from "../config/env.js";

const API_VERSIONS = ["v1beta", "v1"];
const FALLBACK_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
];
const MODEL_ALIASES = {
  "gemini-flash-latest": "gemini-2.5-flash",
  "gemini-flash-lite-latest": "gemini-2.5-flash-lite",
  "gemini-pro-latest": "gemini-2.5-pro",
  "gemini-1.5-flash": "gemini-2.0-flash",
  "gemini-1.5-flash-latest": "gemini-2.0-flash",
  "gemini-1.5-pro": "gemini-2.5-pro",
};

function stripModelPrefix(model) {
  return String(model ?? "").replace(/^models\//, "").trim();
}

function normalizeModel(model) {
  const stripped = stripModelPrefix(model);
  return MODEL_ALIASES[stripped] ?? stripped;
}

async function readJsonResponse(response) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { error: { message: text } };
  }
}

async function listGenerateContentModels(apiVersion) {
  const url = new URL(
    `https://generativelanguage.googleapis.com/${apiVersion}/models`,
  );
  url.searchParams.set("key", env.AI_API_KEY);

  const response = await fetch(url);
  const data = await readJsonResponse(response);
  if (!response.ok) {
    throw new Error(data?.error?.message || "Failed to list Gemini models");
  }

  return (data.models ?? [])
    .filter((model) =>
      (model.supportedGenerationMethods ?? []).includes("generateContent"),
    )
    .map((model) => stripModelPrefix(model.name))
    .filter(Boolean);
}

async function getModelCandidates(apiVersion, configuredModel) {
  try {
    const availableModels = await listGenerateContentModels(apiVersion);
    const preferred = [configuredModel, ...FALLBACK_MODELS]
      .map(normalizeModel)
      .filter(Boolean);
    const preferredAvailable = preferred.filter((model) =>
      availableModels.includes(model),
    );

    return [...preferredAvailable, ...availableModels].filter(
      (model, index, list) => list.indexOf(model) === index,
    );
  } catch {
    return [configuredModel, ...FALLBACK_MODELS]
      .map(normalizeModel)
      .filter((model, index, list) => model && list.indexOf(model) === index);
  }
}

export async function generateText(prompt, maxTokens = 1000) {
  if (!env.AI_API_KEY || env.AI_API_KEY === "your_api_key_here") {
    throw new Error("AI_API_KEY is not configured");
  }

  const configuredModel = normalizeModel(env.AI_MODEL || "gemini-2.5-flash");
  let lastError = null;

  for (const apiVersion of API_VERSIONS) {
    const models = await getModelCandidates(apiVersion, configuredModel);

    for (const model of models) {
      const url = new URL(
        `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent`,
      );
      url.searchParams.set("key", env.AI_API_KEY);

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: maxTokens,
            temperature: 0.75,
          },
        }),
      });

      const data = await readJsonResponse(response);
      if (!response.ok) {
        lastError = new Error(data?.error?.message || "Gemini request failed");
        continue;
      }

      const text = (data.candidates?.[0]?.content?.parts ?? [])
        .map((part) => part.text ?? "")
        .join("")
        .trim();

      if (!text) {
        lastError = new Error("Gemini returned an empty response");
        continue;
      }

      return text;
    }
  }

  throw new Error(
    `AI generation failed: ${lastError?.message || "No Gemini model worked"}`,
  );
}
