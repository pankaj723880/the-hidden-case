import OpenAI from "openai";
import { v2 as cloudinary } from "cloudinary";
import { env } from "../config/env.js";

function stripHtml(value) {
  return String(value ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function isCloudinaryConfigured() {
  return Boolean(
    env.CLOUDINARY_CLOUD_NAME &&
      env.CLOUDINARY_API_KEY &&
      env.CLOUDINARY_API_SECRET,
  );
}

function uploadBufferToCloudinary(buffer) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
  });

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "hidden-case-covers", resource_type: "image" },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result?.secure_url);
      },
    );

    stream.end(buffer);
  });
}

export async function generateCoverArt(title, content, type) {
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  if (!isCloudinaryConfigured()) {
    throw new Error("Cloudinary must be configured before generating cover art");
  }

  const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  const excerpt = stripHtml(content).slice(0, 300);
  const postType = type === "blog" ? "blog" : "story";
  const prompt = `A dark atmospheric literary book cover for a ${postType} titled "${title}".
Theme derived from: ${excerpt || title}.
Style: moody, painterly, warm amber and sepia tones, parchment texture, Victorian gothic aesthetic.
No text. No words. No letters. Portrait orientation.`;

  const imageResult = await openai.images.generate({
    model: "dall-e-3",
    prompt,
    n: 1,
    size: "1024x1792",
    quality: "standard",
  });

  const imageUrl = imageResult.data?.[0]?.url;
  if (!imageUrl) {
    throw new Error("OpenAI did not return an image URL");
  }

  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error("Failed to download generated image");
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const uploadedUrl = await uploadBufferToCloudinary(buffer);
  if (!uploadedUrl) {
    throw new Error("Cloudinary did not return a secure URL");
  }

  return uploadedUrl;
}
