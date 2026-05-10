import dotenv from "dotenv";

dotenv.config();

export const env = {
  PORT: process.env.PORT ?? "5001",
  MONGODB_URI: process.env.MONGODB_URI ?? "",
  JWT_SECRET: process.env.JWT_SECRET ?? "",
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET ?? "",
  CLIENT_URL: process.env.CLIENT_URL ?? "http://localhost:3000",
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME ?? "",
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY ?? "",
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET ?? "",
  AI_API_KEY: process.env.AI_API_KEY ?? "",
  AI_MODEL: process.env.AI_MODEL ?? "gemini-2.5-flash",
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? "",
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ?? "",
  REDIS_URL: process.env.REDIS_URL ?? "",
  EMAIL_HOST: process.env.EMAIL_HOST ?? "",
  EMAIL_PORT: process.env.EMAIL_PORT ?? "587",
  EMAIL_USER: process.env.EMAIL_USER ?? "",
  EMAIL_PASS: process.env.EMAIL_PASS ?? "",
  EMAIL_FROM: process.env.EMAIL_FROM ?? "The Hidden Case <noreply@hiddencase.com>",
};
