import { Router } from "express";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import { existsSync } from "fs";
import { requireAuth } from "../middleware/auth.js";
import { PostModel } from "../models/Post.js";

export const exportRouter = Router();

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeFilename(value) {
  const cleaned = String(value ?? "post")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return (cleaned || "post").slice(0, 120);
}

async function getExecutablePath() {
  const candidate = await chromium.executablePath().catch(() => "");
  if (candidate && existsSync(candidate)) return candidate;

  const localCandidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    process.env.CHROME_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
  ].filter(Boolean);

  const localPath = localCandidates.find((path) => existsSync(path));
  if (localPath) return localPath;

  return candidate;
}

function renderContent(post) {
  if (post.hasChapters && Array.isArray(post.chapters) && post.chapters.length > 0) {
    return post.chapters
      .map((chapter, index) => {
        const title = chapter.title?.trim()
          ? chapter.title
          : `Chapter ${index + 1}`;
        return `
          <section class="chapter">
            <h2>${escapeHtml(title)}</h2>
            <div>${chapter.content ?? ""}</div>
          </section>
        `;
      })
      .join("");
  }

  return post.content ?? "";
}

function buildPdfHtml(post) {
  const authorName = post.author?.name ?? "Unknown author";
  const date = post.createdAt
    ? new Date(post.createdAt).toLocaleDateString("en", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";
  const warnings = Array.isArray(post.contentWarnings)
    ? post.contentWarnings.filter(Boolean)
    : [];

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(post.title)}</title>
    <style>
      * {
        box-sizing: border-box;
      }

      body {
        background: #ffffff;
        color: #171717;
        font-family: Georgia, "Times New Roman", serif;
        font-size: 16px;
        line-height: 1.75;
        margin: 0;
      }

      main {
        max-width: 720px;
        margin: 0 auto;
      }

      header {
        border-bottom: 1px solid #d8d8d8;
        margin-bottom: 32px;
        padding-bottom: 20px;
      }

      h1 {
        color: #111111;
        font-size: 42px;
        line-height: 1.15;
        margin: 0 0 12px;
      }

      .meta {
        color: #555555;
        font-family: Arial, sans-serif;
        font-size: 13px;
      }

      .warnings {
        background: #fff7ed;
        border: 1px solid #fed7aa;
        border-radius: 8px;
        color: #7c2d12;
        font-family: Arial, sans-serif;
        font-size: 13px;
        margin: 0 0 28px;
        padding: 12px 14px;
      }

      .chapter {
        break-inside: avoid;
        margin-bottom: 32px;
      }

      h2,
      h3 {
        color: #171717;
        line-height: 1.3;
        margin: 28px 0 10px;
      }

      h2 {
        font-size: 28px;
      }

      h3 {
        font-size: 22px;
      }

      p {
        margin: 0 0 16px;
      }

      blockquote {
        border-left: 4px solid #8b5cf6;
        color: #3f3f46;
        margin: 24px 0;
        padding: 8px 0 8px 18px;
      }

      img {
        display: block;
        height: auto;
        margin: 24px auto;
        max-width: 100%;
      }

      pre {
        background: #f4f4f5;
        border: 1px solid #d4d4d8;
        border-radius: 8px;
        color: #18181b;
        font-family: "Courier New", monospace;
        font-size: 13px;
        line-height: 1.6;
        overflow-wrap: anywhere;
        padding: 14px;
        white-space: pre-wrap;
      }

      code {
        font-family: "Courier New", monospace;
      }
    </style>
  </head>
  <body>
    <main>
      <header>
        <h1>${escapeHtml(post.title)}</h1>
        <div class="meta">By ${escapeHtml(authorName)}${date ? ` · ${escapeHtml(date)}` : ""}</div>
      </header>
      ${
        warnings.length > 0
          ? `<div class="warnings"><strong>Content warning:</strong> ${warnings.map(escapeHtml).join(", ")}</div>`
          : ""
      }
      ${renderContent(post)}
    </main>
  </body>
</html>`;
}

exportRouter.get("/posts/:id/export-pdf", requireAuth, async (req, res) => {
  let browser;

  try {
    const post = await PostModel.findById(req.params.id)
      .populate("author", "name")
      .lean();

    if (!post) return res.status(404).json({ error: "Post not found" });
    if (String(post.author?._id ?? post.author) !== String(req.user.id)) {
      return res.status(403).json({ error: "Only the author can export this post" });
    }

    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await getExecutablePath(),
      headless: true,
    });

    const page = await browser.newPage();
    await page.setContent(buildPdfHtml(post), { waitUntil: "networkidle0" });
    const pdf = await page.pdf({
      format: "A4",
      margin: {
        top: "2cm",
        bottom: "2cm",
        left: "2cm",
        right: "2cm",
      },
      printBackground: false,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${sanitizeFilename(post.title)}.pdf"`,
    );
    return res.send(pdf);
  } catch (err) {
    console.error("PDF export failed", err);
    return res.status(500).json({ error: "Failed to export PDF" });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
});
