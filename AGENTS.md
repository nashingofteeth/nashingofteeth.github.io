# CLAUDE.md - nash.video

## Non-obvious conventions

- **CSS/JS go in `src/assets/css/` and `src/assets/js/`**, not `templates/`. The `css-loader.js` / `js-loader.js` partials read from there.
- **Image paths must be absolute** (`/img/foo.jpg`), never relative — pages live at different directory depths (`/videos/` and `/videos/some-video/`).
- **Dual slug system**: file naming uses underscores (`YYMMDD_title.md`), URLs use hyphens (`/videos/YYMMDD-title/`). Cloud file refs use underscores (filename field).
- **Tools/** contents copy to **dist root** — `/ratio.html` → `/ratio`, matching links in tools page.
- **`margin_left` offset** applies to both gallery and individual video pages (same `video-article` partial).
- **`plants.js` is dual-use**: required at build time by `templates/plants.js`, also inlined for client-side search. UMD guard (`module.exports`) at bottom.
- **Video order**: reverse chronological by `date` field (newest first).
- **First video** in gallery gets `fetchpriority="high"`, rest get `loading="lazy"`.
- **Code style**: double quotes, trailing commas everywhere, always-parenthesized arrow params.

## Build

```bash
npm install        # marked + gray-matter
npm run build      # outputs to dist/
npm run watch      # auto-rebuild on src/templates/public/tools changes
npm start          # build + serve at localhost:8080
```
