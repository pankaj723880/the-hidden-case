import mongoose from "mongoose";
import { env } from "../config/env.js";

export async function connectToMongo() {
  if (!env.MONGODB_URI) {
    // Dev mode: allow server to boot even before Mongo is configured
    // eslint-disable-next-line no-console
    console.warn("MONGODB_URI missing; skipping Mongo connection");
    return;
  }

  await mongoose.connect(env.MONGODB_URI);
  // eslint-disable-next-line no-console
  console.log("MongoDB connected");
}

export function isMongoConnected() {
  return mongoose.connection.readyState === 1; // connected
}
