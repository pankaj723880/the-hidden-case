import nodemailer from "nodemailer";
import { env } from "../config/env.js";

const clientUrl = env.CLIENT_URL.replace(/\/$/, "");

function isEmailConfigured() {
  return Boolean(env.EMAIL_HOST && env.EMAIL_USER && env.EMAIL_PASS);
}

function getTransporter() {
  if (!isEmailConfigured()) return null;

  return nodemailer.createTransport({
    host: env.EMAIL_HOST,
    port: Number(env.EMAIL_PORT || 587),
    secure: Number(env.EMAIL_PORT) === 465,
    auth: {
      user: env.EMAIL_USER,
      pass: env.EMAIL_PASS,
    },
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function emailTemplate({ heading, body, buttonText, buttonUrl }) {
  return `
    <div style="margin:0;padding:32px;background:#0a0a0f;color:#f4f1ff;font-family:Arial,sans-serif;">
      <div style="max-width:620px;margin:0 auto;border:1px solid #2e2450;border-radius:12px;background:#11111a;padding:28px;">
        <h1 style="margin:0 0 16px;color:#8b5cf6;font-family:Georgia,serif;font-size:30px;">${heading}</h1>
        <div style="color:#d8d3e8;font-size:16px;line-height:1.7;">${body}</div>
        ${
          buttonText && buttonUrl
            ? `<a href="${buttonUrl}" style="display:inline-block;margin-top:24px;border-radius:999px;background:#8b5cf6;color:#fff;text-decoration:none;font-weight:700;padding:12px 20px;">${buttonText}</a>`
            : ""
        }
        <p style="margin-top:28px;color:#8d879f;font-size:12px;">The Hidden Case</p>
      </div>
    </div>
  `;
}

export async function sendEmail({ to, subject, html }) {
  const transporter = getTransporter();
  if (!transporter || !to) return null;

  return transporter.sendMail({
    from: env.EMAIL_FROM,
    to,
    subject,
    html,
  });
}

export function sendWelcomeEmail(user) {
  return sendEmail({
    to: user.email,
    subject: "Welcome to The Hidden Case",
    html: emailTemplate({
      heading: "Welcome to The Hidden Case",
      body: `<p>Hello ${escapeHtml(user.name)},</p><p>Your account is ready. Browse stories, follow writers, and save the posts you want to return to.</p>`,
      buttonText: "Browse Stories",
      buttonUrl: `${clientUrl}/browse`,
    }),
  });
}

export function sendNewCommentEmail(postAuthor, commenter, post, commentText) {
  const excerpt = escapeHtml(String(commentText ?? "").slice(0, 150));
  return sendEmail({
    to: postAuthor.email,
    subject: `${commenter.name} commented on your post`,
    html: emailTemplate({
      heading: "New comment on your post",
      body: `<p><strong>${escapeHtml(commenter.name)}</strong> commented on <strong>${escapeHtml(post.title)}</strong>.</p><p style="border-left:3px solid #8b5cf6;padding-left:12px;color:#cfc9dd;">${excerpt}</p>`,
      buttonText: "View Post",
      buttonUrl: `${clientUrl}/post/${post._id}`,
    }),
  });
}

export function sendNewFollowerEmail(user, follower) {
  return sendEmail({
    to: user.email,
    subject: `${follower.name} is now following you`,
    html: emailTemplate({
      heading: "New follower",
      body: `<p><strong>${escapeHtml(follower.name)}</strong> started following you on The Hidden Case.</p>`,
      buttonText: "View Profile",
      buttonUrl: `${clientUrl}/profile/${follower._id}`,
    }),
  });
}

export function sendPostApprovedEmail(author, post) {
  return sendEmail({
    to: author.email,
    subject: "Your post has been approved! ✨",
    html: emailTemplate({
      heading: "Your post was approved",
      body: `<p>Congratulations. <strong>${escapeHtml(post.title)}</strong> is now approved on The Hidden Case.</p>`,
      buttonText: "View Live Post",
      buttonUrl: `${clientUrl}/post/${post._id}`,
    }),
  });
}

export function sendPostRejectedEmail(author, post) {
  return sendEmail({
    to: author.email,
    subject: "Update on your submission to The Hidden Case",
    html: emailTemplate({
      heading: "Submission update",
      body: `<p>Your post <strong>${escapeHtml(post.title)}</strong> was not approved at this time.</p><p>You can revise it and submit again when ready.</p>`,
      buttonText: "Review Your Profile",
      buttonUrl: `${clientUrl}/profile`,
    }),
  });
}
