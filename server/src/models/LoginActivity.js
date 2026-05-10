import { Schema, model } from "mongoose";

export const loginActivitySchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    ip: { type: String, default: "" },
    city: { type: String, default: "Unknown" },
    country: { type: String, default: "Unknown" },
    device: { type: String, default: "Unknown" },
    sessionToken: { type: String, default: "" },
    loggedOutAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export const LoginActivityModel = model("LoginActivity", loginActivitySchema);
