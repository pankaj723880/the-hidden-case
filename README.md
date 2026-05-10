# The Hidden Case

The Hidden Case is a warm literary story and blog publishing platform. It supports writing, reviewing, publishing, reading, messaging, analytics, gamification, AI-assisted editorial tools, and admin moderation.

This repository contains a full-stack JavaScript application:

- **Client:** React 19, Webpack, Tailwind CSS, JavaScript/JSX
- **Server:** Node.js, Express, ES modules
- **Database:** MongoDB with Mongoose
- **Realtime:** Socket.io
- **Auth:** JWT access token plus refresh token cookie
- **Uploads:** Multer, local uploads, optional Cloudinary configuration
- **AI:** Gemini-compatible text generation through `AI_API_KEY`, plus OpenAI image generation utility support

> Note: the current codebase is a React/Webpack single-page app, not a Next.js runtime app, even though the folder names mimic `app` style routes.

## Table Of Contents

- [Features](#features)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Installation](#installation)
- [Running Locally](#running-locally)
- [Scripts](#scripts)
- [Main Routes](#main-routes)
- [API Overview](#api-overview)
- [Admin Workflow](#admin-workflow)
- [Messaging Workflow](#messaging-workflow)
- [AI And Background Features](#ai-and-background-features)
- [Styling Theme](#styling-theme)
- [Verification](#verification)
- [Troubleshooting](#troubleshooting)

## Features

### Reader Experience

- Warm parchment-and-ink literary theme.
- Home page with rotating local literary quotes.
- Browse stories and blogs.
- Search and filter by type, tags, mood, language, and date.
- Post detail reading experience with reading progress, table of contents, font size controls, sharing, bookmarks, comments, reactions, polls, kudos, and related/next-read recommendations.
- Reading list/bookmarks.
- Series, tags, groups, challenges, leaderboard, analytics, and profile pages.
- Localized date and number formatting.
- RTL support helpers for supported languages.

### Writing Experience

- Rich writing page with TipTap editor.
- Drafts and submissions.
- Multi-chapter story support.
- Tags, language, content warnings, cover/video media, templates, writing stats, readability score, AI assistant, AI tag suggestions, AI critique report, and optional AI cover art.
- Submit for review workflow.
- Co-author invitations and continuation requests.

### Admin Experience

- Admin review dashboard.
- Review all non-draft posts.
- Approve, schedule, reject, feature, or unfeature posts.
- Optional private editor note when approving or rejecting.
- Private editor notes are visible only to the related author in their own submissions list.
- AI plagiarism check from the review modal.
- Plagiarism report list and status actions.
- Reports dashboard.
- Challenges management.
- Audit log.
- Realtime metrics.

### Messaging

- Direct user-to-user messages.
- Realtime incoming messages.
- Message reactions behind a compact reaction menu.
- Delete message for me.
- Delete own message for everyone.
- Delete chat for me.
- Report chat from the chat options menu.
- Block/unblock users from the chat options menu.

### Auth And Account

- Email/password register and login.
- Google login support.
- JWT access token and refresh token flow.
- Protected routes.
- Admin-only routes.
- Avatar upload.
- Login activity model and 2FA dependencies are present.
- Account export/deletion routes are partially implemented.

### Gamification And Community

- XP and author levels.
- Achievement badges.
- Weekly quests.
- Streak tracking.
- Followers/following.
- Followed tags.
- Notifications with Socket.io.
- Comments, replies, reactions, mentions, reports, kudos, groups, challenges, and leaderboards.

## Project Structure

```text
Case/
  client/
    package.json
    webpack.config.cjs
    scripts/dev.js
    src/
      App.jsx
      main.jsx
      app/
        page.jsx
        browse/page.jsx
        write/page.jsx
        post/[id]/page.jsx
        profile/page.jsx
        profile/[id]/page.jsx
        admin/page.jsx
        messages/page.jsx
        ...
      components/
      context/
      hooks/
      lib/
      utils/

  server/
    package.json
    scripts/dev.js
    src/
      index.js
      server.js
      app.js
      socket.js
      socketState.js
      scheduler.js
      config/
      controllers/
      db/
      middleware/
      models/
      queues/
      routes/
      utils/
```

## Prerequisites

- Node.js 20+ recommended. The project has also been run with Node.js 24.
- npm
- MongoDB connection string
- Optional Redis instance for cache/rate-limit/job queue features
- Optional Cloudinary account for uploaded media
- Optional Google OAuth client id
- Optional Gemini API key for AI text tools
- Optional OpenAI API key for cover generation

## Environment Variables

Create `server/.env` from `server/.env.example`.

```env
# Server
PORT=5001
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/hidden-case

# JWT
JWT_SECRET=your_super_secret_key_change_in_production
JWT_REFRESH_SECRET=your_refresh_secret_key_change_in_production

# Client URL for CORS
CLIENT_URL=https://monumental-zuccutto-397bf4.netlify.app

# Cloudinary, optional
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# AI text generation
AI_API_KEY=your_api_key_here
AI_MODEL=gemini-2.5-flash

# AI cover art, optional
OPENAI_API_KEY=your_openai_api_key

# Google login
GOOGLE_CLIENT_ID=your_google_oauth_client_id_here

# Redis, optional
REDIS_URL=redis://localhost:6379

# Email, optional
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=your_email_user
EMAIL_PASS=your_email_password
EMAIL_FROM=The Hidden Case <noreply@hiddencase.com>
```

Client environment variable:

```env
REACT_APP_API_URL=https://the-hidden-case.onrender.com
REACT_APP_SOCKET_URL=https://the-hidden-case.onrender.com
```

If `REACT_APP_API_URL` or `REACT_APP_SOCKET_URL` is not set, the client falls back to the deployed Render backend.

## Installation

Install server dependencies:

```bash
cd server
npm install
```

Install client dependencies:

```bash
cd ../client
npm install
```

## Running Locally

Start the server:

```bash
cd server
npm run dev
```

The server listens on:

```text
http://localhost:5001
```

Start the client:

```bash
cd client
npm run dev
```

The client dev script finds the first free port from:

```text
3000, 3001, 3002, 3003, 3004, 3005
```

Open the printed client URL in the browser.

## Scripts

### Client

```bash
npm run dev      # Start Webpack dev server
npm run build    # Production Webpack build
npm run start    # Webpack server in production mode
npm run lint     # Run ESLint
```

### Server

```bash
npm run dev      # Start server with node --watch through scripts/dev.js
npm run start    # Start server normally
npm run build    # No-op build message
```

## Main Routes

The client is a single-page app with manual route matching in `client/src/App.jsx`.

| Route | Page |
| --- | --- |
| `/` | Home |
| `/browse` | Browse posts |
| `/write` | Write/editor |
| `/login` | Login |
| `/register` | Register |
| `/profile` | Own profile |
| `/profile/:id` | Public profile |
| `/profile/search/:name` | Profile search |
| `/admin` | Admin dashboard |
| `/post/:id` | Post detail |
| `/series` | Series list |
| `/series/:id` | Series detail |
| `/tags` | Tags |
| `/tags/:tag` | Tag detail |
| `/challenges` | Challenges |
| `/challenges/:id` | Challenge detail |
| `/groups` | Groups |
| `/groups/:id` | Group detail |
| `/analytics` | Analytics |
| `/leaderboard` | Leaderboard |
| `/messages` | Direct messages |

## API Overview

All server routes are mounted under `/api`.

| Mount | Purpose |
| --- | --- |
| `/api/auth` | Register, login, refresh, logout, Google auth, 2FA-related endpoints |
| `/api/posts` | Posts, drafts, submissions, likes, admin review, plagiarism check, translations, cover upload, title tests |
| `/api/comments` | Comments, replies, comment reactions, deletion |
| `/api/users` | Profiles, bookmarks, follows, tags, avatar, export/delete account, Q&A |
| `/api/admin` | Admin reports, audit log, analytics, feature toggles, suspicious activity |
| `/api/reports` | Report posts, comments, and messages |
| `/api/messages` and `/api/conversations` | Direct messaging |
| `/api/notifications` | User notifications |
| `/api/tags` | Tags |
| `/api/series` | Series |
| `/api/challenges` | Writing challenges |
| `/api/groups` | Groups |
| `/api/leaderboard` | Leaderboard |
| `/api/quests` | Weekly quests |
| `/api/analytics` | Reading depth and traffic analytics |
| `/api/ai` | AI writing assistant |
| `/api/revisions` | Revision history |
| `/api/export` | PDF/export routes |

## Admin Workflow

1. User writes a draft.
2. User submits the post for review.
3. Submitted posts become `pending`.
4. Admin opens `/admin`.
5. Admin reviews the post in the modal.
6. Admin may run the plagiarism check.
7. Admin may add a private review comment.
8. Admin approves, schedules, rejects, or features content.
9. Author receives status notification.
10. Private editor note appears only in the author's own profile submissions.

### Admin Plagiarism Check

The admin review modal calls:

```text
POST /api/posts/admin/:id/plagiarism-check
```

The server compares the upload against approved/published posts with trigram similarity and stores:

- similarity score
- matched post id
- matched post title
- flagged status
- checked timestamp

High-similarity results are also stored as plagiarism reports.

## Messaging Workflow

Messaging routes support:

- conversation list
- active conversation messages
- send message
- react to message
- delete message for current user
- delete sent message for everyone
- delete chat for current user
- report chat/message
- block or unblock user

Realtime events:

- `new_message`
- `message_updated`

## AI And Background Features

AI/text utilities live under `server/src/utils`.

| Utility | Purpose |
| --- | --- |
| `aiClient.js` | Gemini text generation client |
| `generateCritique.js` | Private critique report generation |
| `suggestTags.js` | AI tag suggestions |
| `detectMood.js` | Mood classification |
| `generateCoverArt.js` | OpenAI image generation and upload |
| `plagiarismCheck.js` | Trigram similarity plagiarism check |

Background/automation features include:

- scheduler jobs
- queues using Bull
- Redis-backed cache utilities with fallback behavior
- weekly quests
- leaderboard calculations
- badge and XP checks

## Styling Theme

The UI uses a warm literary theme:

- parchment backgrounds
- walnut and sepia accents
- ink-toned text
- small-radius cards and buttons
- serif typography
- local rotating homepage quotes

Global styling is in:

```text
client/src/app/globals.css
```

Theme values use CSS custom properties such as:

- `--bg`
- `--bg2`
- `--border`
- `--text`
- `--accent`
- `--gold`
- `--red`
- `--green`

## Verification

Common checks:

```bash
cd client
npm run lint
```

```bash
cd server
node --check src/index.js
node --check src/routes/messages.js
node --check src/controllers/postController.js
```

The server does not currently define a full automated test suite.

## Troubleshooting

### Server says port is already in use

The server dev script checks `PORT` and exits if another process owns it.

Fix:

- stop the process using the port, or
- set a different `PORT` in `server/.env`.

### Redis error logs

Redis is optional. If Redis is not running, either start Redis or leave `REDIS_URL` empty to use fallbacks where implemented.

### Google login origin mismatch

In Google Cloud Console, add the exact frontend origin to the OAuth client:

```text
http://localhost:3000
http://localhost:3001
http://localhost:3002
```

Use whichever port the Webpack dev server prints.

### AI features fail

Check:

- `AI_API_KEY` is configured.
- `AI_MODEL` is supported by the configured API.
- Server can reach the AI provider.

The homepage quote rotation does not use AI; it uses local quotes in:

```text
client/src/lib/homeQuotes.js
```

### Uploads fail

For local uploads, ensure the server can write to the uploads directory. For Cloudinary-backed uploads, verify:

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

## Notes For Future Development

- Keep the codebase JavaScript-only unless the project intentionally migrates.
- Keep admin-only data out of public API responses.
- Keep private review comments visible only to the related author and admins.
- Avoid reintroducing removed monetization features unless payment flows are redesigned.
- Run lint and server syntax checks after each feature change.
