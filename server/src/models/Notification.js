import { Schema, model } from "mongoose";

export const notificationSchema = new Schema(
  {
    recipient: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: [
        "like",
        "comment",
        "reply",
        "follow",
        "mention",
        "coauthor_invite",
        "group_join_request",
        "post_approved",
        "post_rejected",
        "badge_earned",
      ],
      required: true,
    },
    actor: { type: Schema.Types.ObjectId, ref: "User", default: null },
    post: { type: Schema.Types.ObjectId, ref: "Post", default: null },
    comment: { type: Schema.Types.ObjectId, ref: "Comment", default: null },
    read: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const NotificationModel = model("Notification", notificationSchema);
