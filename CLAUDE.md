# CLAUDE.md

Context for Claude Code working on this project.

## Project

`petit-blog` — a minimal Cloudflare-hosted blog for a child. Inspired by [pbnj](https://github.com/bhavnicksm/pbnj): single auth key, no accounts, deploys in minutes. Public visitors see a static-feeling reading experience; the owner logs into `/admin` with one password and writes posts in a Trix rich-text editor.

**Hard scope constraints (do not add features without asking):**
- No images, no media upload
- No comments, no user accounts beyond the single admin
- No drafts (publish-or-don't)
- No analytics, no third-party trackers

The point is to stay around ~300 lines of real logic. Resist scope creep.

## Stack

- **Astro 5** (`output: 'server'`) running on **Cloudflare Workers** via `@astrojs/cloudflare`
- **Cloudflare D1** (SQLite) for posts
- **Trix 2** loaded from unpkg CDN for the admin editor
- **sanitize-html** for server-side HTML cleaning before DB insertion
- **No client-side framework** on public pages — zero JS shipped to visitors

## Architecture

```
src/
├── env.d.ts                    # Cloudflare bindings: DB (D1), AUTH_KEY (secret)
├── layouts/Public.astro        # public layout, fonts, palette
├── lib/db.ts                   # ALL business logic: list/get/create/delete, sanitize, slugify, auth cookie check
├── pages/
│   ├── index.astro             # GET / → list of posts
│   ├── [slug].astro            # GET /:slug → single post
│   ├── admin/index.astro       # GET/POST /admin → login form OR editor
│   └── api/
│       ├── create.ts           # POST /api/create (JSON, cookie-auth)
│       └── delete.ts           # POST /api/delete?id=N (cookie-auth, redirects)
```

`src/lib/db.ts` is the only file with non-trivial logic. Everything else is rendering or routing.

## Auth model

- One secret: `AUTH_KEY`, set via `wrangler secret put AUTH_KEY`
- POST to `/admin` with the right key sets cookie `petit_blog_auth=<AUTH_KEY>; HttpOnly; Secure; SameSite=Strict; Max-Age=1y`
- `checkAuth(request, env.AUTH_KEY)` in `db.ts` compares the cookie value to the secret. That's it.
- To rotate: `wrangler secret put AUTH_KEY` — old cookie instantly invalid.

This is deliberately simple. Don't introduce JWT, sessions table, or OAuth.

## HTML sanitization

Trix outputs HTML. We sanitize server-side in `createPost` with a strict allowlist:
`h1, h2, p, strong, em, del, ul, ol, li, a, blockquote, br, pre, code, div`

Only `<a>` keeps attributes (`href`, `title`), schemes limited to http/https/mailto. **Never** widen this allowlist without thinking about XSS.

## D1 schema

```sql
CREATE TABLE posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  content_html TEXT NOT NULL,
  created_at INTEGER NOT NULL  -- ms epoch
);
CREATE INDEX idx_posts_created ON posts(created_at DESC);
```

If schema needs to change: write a migration file (`migrations/0001_xxx.sql`), don't edit `schema.sql` in place.

## Commands

```bash
npm install
npm run dev                    # local dev with platformProxy → real D1 + secrets
npm run build                  # astro build
npm run deploy                 # build + wrangler deploy
npm run db:init                # apply schema.sql to LOCAL D1
npm run db:init:remote         # apply schema.sql to REMOTE D1
npx wrangler d1 execute petit-blog-db --remote --command "SELECT * FROM posts"
npx wrangler tail              # live logs from deployed worker
```

## Known things to verify before first deploy

1. **`wrangler.toml` `main` field**: with current `@astrojs/cloudflare` v12, the adapter writes to `./dist/_worker.js/index.js`. If a future version changes the output path, the `main = ...` line in `wrangler.toml` may need removal (the adapter can configure this itself). **Test with `npm run build` first; check what's in `dist/`.**

2. **`database_id` in `wrangler.toml`** is a placeholder. Must be filled after `wrangler d1 create petit-blog-db`.

3. **`AUTH_KEY` secret** must be set before deploy, otherwise `/admin` will 500.

## Style conventions

- French in user-facing strings (the blog is in French, the kid writes in French)
- English in code comments and identifiers
- Prefer adding logic to `lib/db.ts` over creating new helper files
- No extra dependencies without a real reason — every dep is a future maintenance burden

## What NOT to do

- Don't add image upload "just in case"
- Don't add a draft/published toggle ("v2 maybe")
- Don't switch the editor to TipTap/Quill — Trix is chosen specifically because it's one script tag and outputs clean HTML
- Don't move auth to a sessions table — the cookie-equals-secret approach is intentional
- Don't add Tailwind — the CSS is small enough to live inline and it keeps the bundle tiny
