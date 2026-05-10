import { Schema, model } from "mongoose";

export const kudosSchema = new Schema(
  {
    post: { type: Schema.Types.ObjectId, ref: "Post", required: true },
    from: { type: Schema.Types.ObjectId, ref: "User", required: true },
    message: { type: String, required: true, maxlength: 80, trim: true },
  },
  { timestamps: true },
);

kudosSchema.index({ post: 1, from: 1 }, { unique: true });

export const KudosModel = model("Kudos", kudosSchema);
