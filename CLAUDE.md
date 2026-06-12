# nash.video - Custom Static Site Generator

A minimalist static site for showcasing video art, built with a custom Node.js generator and hosted on GitHub Pages.

## Overview

This is a personal video portfolio website for Matthew Nash, a video artist and sound maker based in Portland, Oregon. The site features a retro web aesthetic with modern performance optimizations, showcasing video works hosted on cloud storage and YouTube.

**Live Site:** https://nash.video/
**Repository:** https://github.com/nashingofteeth/nashingofteeth.github.io

## Tech Stack

- **Static Site Generator:** Custom Node.js build script (build.js)
- **Template System:** JavaScript template literals
- **Content Format:** Markdown with YAML frontmatter
- **Markdown Parser:** marked 11.2.0
- **Frontmatter Parser:** gray-matter 4.0.3
- **CSS Strategy:** Per-page inline CSS (separate .css files)
- **Video Hosting:** Cloud storage (primary), YouTube (backup)
- **Deployment:** GitHub Actions → GitHub Pages
- **Analytics:** GoatCounter (privacy-focused)

## Project Structure

```
atlas/
├── build.js                    # Main build script (~175 lines)
│
├── templates/                  # Template system
│   ├── partials/              # Reusable template components (NEW)
│   │   ├── constants.js       # Video hosting URLs and shared constants
│   │   ├── css-loader.js      # CSS file loading utility
│   │   ├── video-thumbnail.js # Video thumbnail HTML generator
│   │   ├── download-links.js  # Download links HTML generator
│   │   ├── video-article.js   # Complete video article component
│   │   ├── header.js          # Page header component
│   │   └── footer.js          # Page footer component
│   ├── utils.js               # Helper functions
│   ├── base.js                # Base HTML layout
│   ├── base.css               # Base styles
│   ├── page.js                # Page wrapper with flexbox layout
│   ├── page.css               # Page wrapper styles
│   ├── home.js                # Homepage template
│   ├── home.css               # Homepage styles
│   ├── videos.js              # Video gallery template
│   ├── videos.css             # Video gallery styles
│   ├── video-single.js        # Individual video page template
│   ├── video-single.css       # Individual video page styles
│   ├── tools.js               # Tools page template
│   ├── tools.css              # Tools page styles
│   ├── 404.js                 # 404 page template
│   └── 404.css                # 404 page styles
│
├── src/                        # Source content
│   ├── _data/
│   │   └── metadata.js         # Global site metadata
│   └── videos/                 # Video content directory
│       └── *.md                # Individual video files (20 videos)
│
├── public/                     # Static assets (copied to dist/)
│   ├── img/                    # Thumbnails (JPG + WebP)
│   └── js/
│       └── videos.js           # Client-side video loading
│
├── tools/                      # Utility web tools (copied to dist/)
│   ├── ratio.html              # Aspect ratio calculator
│   ├── color.html              # Random color picker
│   ├── unicode.html            # ASCII to Unicode converter
│   └── ...                     # Additional tools
│
├── dist/                       # Build output (generated)
│
├── package.json                # Dependencies and scripts
├── .github/workflows/build.yml # CI/CD pipeline
├── CNAME                       # Custom domain: nash.video
└── .htaccess                   # Apache configuration
```

## Recent Updates (2025-10-25)

### Build System & Asset Management
- **Inline JavaScript:** JS now inlined in HTML output (no separate file requests)
- **Watch script:** Added `npm run watch` for automatic rebuilds during development
- **Asset organization:** CSS and static assets moved to cleaner structure
  - Template CSS files in `templates/` directory alongside their templates
  - Static assets (images, JS) in `public/` folder
  - Tools directory at repository root (copied to `dist/` root for correct links)
- **Tools deployment:** Tool HTML files (ratio.html, color.html, etc.) copied to `dist/` root, matching URL structure in tools page
- **Google Analytics removed:** Now uses only GoatCounter for privacy-focused analytics

### Template System - Partials Architecture
- **Created 7 reusable partials** to eliminate duplicate code
- **Reduced template file sizes** by 70-80% (e.g., `videos.js` from 115→30 lines, `video-single.js` from 106→22 lines)
- **Centralized constants** (video hosting URLs) in `templates/partials/constants.js`
- **Unified CSS loading** with a single `loadCss()` utility function
- **Shared video article component** used by both gallery and individual video pages

### URL & Content Structure
- **Video page URLs** now use hyphens for better web conventions: `/videos/220326-leaving-it-behind/`
- **File references** still use underscores to match existing media files
- **Dual slug system**: `slug` (with hyphens for URLs) and `filename` (with underscores for file paths)
- **Camera field optional:** Video frontmatter no longer requires `camera` property
- **Removed `permalink` property:** Cleaned up unused legacy field from all video markdown files

## Key Features

### 1. Video Content System

Each video is a markdown file in `src/videos/` with this structure:

```yaml
---
title: the claw
date: 2025-08-17
width: 1920
height: 1080
runtime: 6m2s
frame_rate: 24
camera: Sony Handycam CX405  # Optional field
margin_left: 0               # Used only in gallery view
youtube_id: (optional)       # If hosted on YouTube
---

Video description content in markdown...
```

**Naming Convention:** `YYMMDD_title_with_underscores.md`

**Output:** Each video generates:
- Gallery entry at `/videos/` (with left margin offset)
- Individual page at `/videos/[slug]/` (same styling as gallery entry)

### 2. Template System

Templates are JavaScript functions using template literals:

```
base.js (HTML root + analytics + inline CSS/JS)
    ↓
page.js (flexbox wrapper + header/footer) → used by videos.js, tools.js
    ↓
home.js (homepage)
videos.js (video gallery)
video-single.js (individual video pages)
tools.js (tools page)
404.js (error page)
```

Templates use reusable components from `templates/partials/`:
- `constants.js` - Video hosting URLs and shared constants
- `css-loader.js` - Unified CSS file loading
- `video-thumbnail.js` - Generates thumbnail HTML (YouTube or local)
- `download-links.js` - Download links for hosted videos
- `video-article.js` - Complete video article markup (used by gallery and single pages)
- `header.js` - Page header (supports both standard and video-single styles)
- `footer.js` - Page footer with CC0 icon and potato link

### 3. Individual Video Pages

Each video has a dedicated page at `/videos/[slug]/` with:
- Identical styling to gallery entries (including left margin offset)
- Header with HOME and VIDEOS links
- Same video player functionality
- Direct shareable URLs

### 4. Responsive Video Layout

- Videos maintain aspect ratio using padding-top percentage trick
- Click-to-load pattern: thumbnails → video/iframe on user interaction
- Dual format thumbnails: WebP (modern) + JPG (fallback)
- Lazy loading for images (except first video in gallery)
- Responsive breakpoints: 768px (tablet), 576px (mobile)

### 5. Performance Optimizations

- **Inline CSS:** Per-page styles inlined in `<head>` (zero render-blocking)
- **Lazy loading:** Images load on-demand via `loading="lazy"`
- **Modern formats:** WebP images with `<picture>` fallback
- **Deferred video loading:** Videos load only when clicked
- **Minimal dependencies:** 4 npm packages total
- **Static generation:** No runtime database or API calls

### 6. Video Hosting Strategy

**Cloud Storage (Primary):**
- MP4 format (lossy, cross-browser)
- WebM format (lossy, smaller file size)
- MOV format (lossless backups)
- Base URL: Set in `templates/partials/constants.js`

**YouTube (Alternative):**
- Embed via youtube-nocookie.com (privacy-enhanced)
- Autoplay enabled on click
- Specified via `youtube_id` in frontmatter

### 7. Collections & Feeds

- **Videos Collection:** Auto-generated from `src/videos/*.md` files
- **Atom Feed:** `/feed/feed.xml` (Atom 1.0 standard)
- **JSON Feed:** `/feed/feed.json` (JSON Feed 1.1 spec)
- **Ordering:** Reverse chronological (newest first)

## Development Workflow

### Local Development

```bash
npm install          # Install dependencies (marked + gray-matter)
npm run build        # Build site to dist/
```

**Development commands:**
```bash
npm run build        # Build site to dist/
npm run watch        # Auto-rebuild on file changes
npm start            # Build + serve at localhost:8080
```

### Adding a New Video

1. **Upload video files to cloud storage:**
   - `YYMMDD_title.mp4` (lossy)
   - `YYMMDD_title.webm` (lossy)
   - `YYMMDD_title.mov` (lossless backup)

2. **Create thumbnail images:**
   - `public/img/YYMMDD_title.jpg` (baseline)
   - `public/img/YYMMDD_title.webp` (modern)

3. **Create markdown file:**
   ```bash
   # File: src/videos/YYMMDD_title.md
   ---
   title: your video title
   date: YYYY-MM-DD
   width: 1920
   height: 1080
   runtime: 3m15s
   frame_rate: 24
   camera: Your Camera Model  # Optional
   margin_left: 0
   ---

   Your video description goes here in markdown format.

   You can include links, emphasis, etc.
   ```

4. **Build and preview:**
   ```bash
   npm start  # View at localhost:8080/videos/
   ```

5. **Commit and push:**
   - GitHub Actions will automatically build and deploy

### Video Frontmatter Fields

| Field | Required | Example | Description |
|-------|----------|---------|-------------|
| `title` | Yes | `leaving it behind` | Display title |
| `date` | Yes | `2022-03-26` | Publication date (YYYY-MM-DD) |
| `width` | Yes | `1920` | Video width in pixels |
| `height` | Yes | `1080` | Video height in pixels |
| `runtime` | Yes | `9m` or `6m2s` | Duration (human-readable) |
| `frame_rate` | Yes | `24` or `60` | Frames per second |
| `camera` | No | `Sony a6300` | Camera model used (optional) |
| `margin_left` | Yes | `20` | Left offset percentage (0-40 typical) |
| `youtube_id` | No | `dQw4w9WgXcQ` | YouTube video ID (if using YouTube) |

## Deployment

### GitHub Actions CI/CD

**Workflow:** `.github/workflows/build.yml`

**Trigger:** Push to `main` branch

**Steps:**
1. Checkout repository
2. Setup Node.js (latest)
3. Install dependencies (`npm install`)
4. Build site (`npm run build`)
5. Deploy to `gh-pages` branch (GitHub Pages)
6. Deploy to Neocities (with cleanup enabled)

**Live site updates:** Automatic (1-2 minutes after push)

**Deployment targets:**
- **GitHub Pages:** Primary hosting at nash.video
- **Neocities:** Secondary/mirror hosting

### Custom Domain

- **Domain:** nash.video
- **Configuration:** `CNAME` file in repository root
- **DNS:** Points to GitHub Pages IP addresses

## Configuration Details

### Build Script (`build.js`)

The main build script performs these steps:

1. **Clean** - Removes existing `dist/` directory
2. **Read videos** - Reads all `.md` files from `src/videos/`
3. **Parse content** - Uses `gray-matter` for frontmatter, `marked` for markdown
4. **Generate pages** - Calls template functions to create HTML:
   - Homepage (`index.html`)
   - Video gallery (`videos/index.html`)
   - Individual video pages (`videos/[slug]/index.html` for each video)
   - Tools page (`tools/index.html`)
   - 404 page (`404.html`)
5. **Copy assets** - Copies `public/` contents to `dist/`, then copies `tools/` contents to `dist/` root (for correct URL routing)

### Helper Functions (`templates/utils.js`)

**`formatDate(dateInput)`** - Format dates for display
```javascript
// Input: "2022-03-26" or Date object
// Output: "March 26, 2022"
```

**`htmlDateString(dateInput)`** - Format dates for HTML5 `<time>` elements
```javascript
// Input: "2022-03-26" or Date object
// Output: "2022-03-26"
```

**`escapeHtml(text)`** - Escape HTML special characters
```javascript
// Input: "<script>alert('xss')</script>"
// Output: "&lt;script&gt;alert(&#039;xss&#039;)&lt;/script&gt;"
```

### Files Copied to dist/

- `public/` contents → `dist/` (images, JavaScript, .htaccess, CNAME)
- `tools/` contents → `dist/` root (utility web apps: ratio.html, color.html, unicode.html, etc.)
  - Tools must be at root level to match URL structure in tools page (/ratio, /color, etc.)
  - Subdirectories like `mt/` are preserved

## Code Formatting Conventions

This project uses the following code formatting conventions, automatically applied by Neovim/LazyVim:

### JavaScript/Node.js
- **Quotes:** Double quotes (`"`) for all strings
- **Trailing commas:** Always include trailing commas in objects and arrays
- **Arrow functions:** Always use parentheses around parameters, even for single parameters
  - ✅ `(file) => file.name`
  - ❌ `file => file.name`
- **Multi-line arrays:** Break long arrays with each item on its own line
  ```javascript
  // ✅ Good
  const months = [
    "January",
    "February",
    "March",
  ];

  // ❌ Avoid
  const months = ['January', 'February', 'March'];
  ```
- **Object formatting:** Trailing commas on multi-line objects
  ```javascript
  // ✅ Good
  const video = {
    title: "example",
    date: "2024-01-01",
  };
  ```

### CSS
- **Indentation:** 2 spaces (not 4, not tabs)
- **Selector lists:** Each selector on its own line when comma-separated
  ```css
  /* ✅ Good */
  header,
  footer {
    margin-bottom: 20px;
  }

  /* ❌ Avoid */
  header, footer {
    margin-bottom: 20px;
  }
  ```
- **Property indentation:** Consistent 2-space indentation for all properties

### General
- **Line endings:** LF (Unix-style)
- **Charset:** UTF-8
- **Trailing newline:** Always include final newline in files

These conventions are automatically enforced by the editor configuration. Manual adherence is recommended when editing outside of Neovim/LazyVim.

## Design Philosophy

### Retro Aesthetic
- Monospace fonts throughout
- Text shadows on links (1px offset)
- Named CSS colors (Azure, Navy, floralwhite, skyblue)
- Simple geometric layouts
- Unicode emoji icons (🎥 📂 🌍 📧)

### Performance First
- Inline CSS (no external stylesheet requests)
- Lazy loading for below-fold content
- Modern image formats with fallbacks
- Click-to-load videos (no autoplay overhead)
- Minimal JavaScript (only for video loading)

### Content Focus
- Single-page video gallery (no pagination)
- Chronological ordering (newest first)
- Detailed video metadata always visible
- Download links for local viewing

## Client-Side Behavior

### Video Loading (`public/js/videos.js`)

**Pattern:** Thumbnail → Full Player

1. **Initial state:** Thumbnail image + play button overlay
2. **User clicks:** JavaScript replaces thumbnail with player
3. **YouTube videos:** `<iframe>` with autoplay
4. **Cloud-hosted videos:** `<video>` element with MP4/WebM sources

**Code snippet:**
```javascript
// Attaches click listeners to all .container a elements
// Prevents navigation, replaces content with video/iframe
```

## Analytics

**GoatCounter** - Privacy-focused analytics
- Script loaded from `gc.zgo.at`
- No cookies, no personal data collection
- Counter available at: nashingofteeth.goatcounter.com

## Content Guidelines

### Video Descriptions
- Keep concise (1-3 sentences typical)
- Include screening info if applicable
- Use markdown for links
- Example: `Screened at [Venue](URL) on Date.`

### Thumbnails
- **Resolution:** Match video dimensions or 16:9 aspect
- **Format:** Create both JPG and WebP versions
- **Quality:** High enough for crisp preview
- **Naming:** Match video file slug exactly

### Aspect Ratios
Common ratios used in this portfolio:
- 4:3 (1440x1080) - Vintage aesthetic
- 16:9 (1920x1080) - Standard HD
- Custom ratios via `margin_left` offset

## Troubleshooting

**Videos not appearing?**
- Verify frontmatter has all required fields (see Video Frontmatter Fields table)
- Check `width` and `height` match actual video dimensions

**Layout issues?**
- Test at different viewport sizes (768px, 576px breakpoints)
- Adjust `margin_left` percentage (0-40 typical)

**Deployment failing?**
- Check GitHub Actions logs
- Verify `npm run build` succeeds locally

**Thumbnails not loading?**
- Verify files exist in `public/img/`
- Check filename matches video slug (with underscores)
- Ensure both JPG and WebP versions present

## Related Projects

- **Sequitur:** Video sequencing code - http://github.com/nashingofteeth/sequitur
- **Earlier work:**
  - http://youtube.com/hewnash
  - http://youtube.com/hollowocean

## Site Metadata

**Title:** matthew nash
**Description:** Video artist and sound maker in Portland, Oregon
**Keywords:** matthew nash, nash, mw nash, videos, videographer, portland, editor, video editor, video artist, filmmaker, algorist
**Language:** en
**Author:** Matthew Nash (matthew@nash.video)

## Future Enhancements

Potential improvements to consider:

- [ ] Add video duration filtering/sorting
- [ ] Implement tagging system for themes/styles
- [ ] Add image optimization build step
- [ ] Implement video pagination (if collection grows large)
- [ ] Add search functionality
- [ ] Create behind-the-scenes or making-of content
- [ ] Add video transcripts for accessibility
- [ ] Implement Open Graph meta tags for social sharing
- [ ] Consider adding Vimeo as third hosting option

## License

Not specified in repository. Contact author for usage permissions.

---

**Last Updated:** 2025-10-25
**Build System:** Custom Node.js (build.js)
**Dependencies:** marked 11.2.0, gray-matter 4.0.3
**Node.js Requirement:** >=14
**Video Count:** 19 videos (as of 2025-08-17)
**Pages Generated:** ~25 HTML pages (home, gallery, 19 individual videos, tools, 404)

## Architecture Notes

**Code Organization:** Templates follow DRY principles with reusable partials (~73-79% size reduction)

**URL Convention:**
- Page URLs use hyphens: `/videos/220326-leaving-it-behind/`
- File paths use underscores: `220326_leaving_it_behind.mp4`

**Image Path Convention:**
- Always use absolute paths starting with `/` (e.g., `/img/thumbnail.jpg`)
- Never use relative paths (e.g., `../img/thumbnail.jpg`)
- This prevents broken images on subpages at different directory depths
- Example: `/img/220326_leaving_it_behind.jpg` works from both `/videos/` and `/videos/220326-leaving-it-behind/`

**Layout System:** Flexbox-based with sticky footer (bottom of viewport on short pages, natural flow on long pages)
