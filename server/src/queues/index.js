import Bull from "bull";
import { env } from "../config/env.js";

function createQueue(name) {
  if (!env.REDIS_URL) return null;
  return new Bull(name, env.REDIS_URL, {
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: 100,
      removeOnFail: 100,
    },
  });
}

export const emailQueue = createQueue("email");
export const aiQueue = createQueue("ai-analysis");
export const pdfQueue = createQueue("pdf-export");

export const queues = [emailQueue, aiQueue, pdfQueue].filter(Boolean);
