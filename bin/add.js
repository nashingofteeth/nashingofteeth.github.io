#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const {
  ORIGINALS_SUBDIR,
  PHOTO_OFFSET_RANGE,
} = require("../templates/partials/constants.js");

const PHOTOS_DIR = path.join(__dirname, "..", "src", "photos");
const BACKBLAZE_REMOTE = "backblaze:nash-potato/photos";
const MAX_DIMENSION = 1200;
const JPEG_QUALITY = 85;

function showUsage() {
  console.log(`
Usage: add <image1> [image2] [image3] ... [--clean] [--dry-run]

Ingest one or more photos into the potato website.

Each image will be:
  1. Metadata extracted via mediainfo
  2. Converted to viewing JPEG and WebP
  3. Uploaded to Backblaze
  4. Markdown file generated in src/photos/

Options:
  --clean     Remove remote files that have no matching markdown file in
              src/photos/ (both viewing jpg/webp and originals).
  --dry-run   With --clean, show what would be removed without deleting.

Examples:
  add ~/photos/garden.jpg
  add ~/photos/*.jpg
  add ~/photos/rose.jpg ~/photos/fern.jpg
  add --clean          # remove orphans from remote
  add --clean --dry-run
`);
}

function getMediainfo(filePath) {
  try {
    const output = execSync(`mediainfo --Output=JSON "${filePath}"`, {
      encoding: "utf8",
    });
    const data = JSON.parse(output);
    const track = data.media.track.find((t) => t["@type"] === "Image") || {};
    const general =
      data.media.track.find((t) => t["@type"] === "General") || {};

    return {
      width: parseInt(track.Width || "0", 10),
      height: parseInt(track.Height || "0", 10),
      format: track.Format || general.Format || "",
      camera: [
        general.Encoded_Hardware_CompanyName,
        general.Encoded_Hardware_Model,
      ].filter(Boolean).join(" ") || track.Model || track.Camera || track.Make || "",
    };
  } catch (err) {
    console.error(`  ⚠️  mediainfo failed for ${filePath}, using fallback`);
    return { width: 0, height: 0, format: "" };
  }
}

function getImageDimensions(filePath) {
  try {
    const output = execSync(`magick identify -format "%w %h" "${filePath}"`, {
      encoding: "utf8",
    }).trim();
    const [width, height] = output.split(" ").map(Number);
    return { width, height };
  } catch (err) {
    return { width: 0, height: 0 };
  }
}

function getDateFromMediainfo(filePath) {
  try {
    const output = execSync(
      `mediainfo --Output=JSON "${filePath}"`,
      { encoding: "utf8" },
    );
    const data = JSON.parse(output);
    const general =
      data.media.track.find((t) => t["@type"] === "General") || {};

    // Try various date fields
    const dateStr =
      general.Encoded_Date ||
      general.Recorded_Date ||
      general.File_Modified_Date ||
      "";

    if (dateStr) {
      // MediaInfo dates often like "UTC 2025-06-24 14:30:00" or "2025-06-24T14:30:00.000Z"
      const cleaned = dateStr.replace("UTC ", "").replace(" ", "T");
      const d = new Date(cleaned);
      if (!isNaN(d.getTime())) return d;
    }
  } catch (err) {
    // ignore
  }
  return null;
}

function getDateForFilename(filePath) {
  // Try mediainfo metadata first, fall back to file mtime
  const metaDate = getDateFromMediainfo(filePath);
  const date = metaDate || fs.statSync(filePath).mtime;
  return date;
}

function formatDateParts(date) {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return { yy, mm, dd, hh, min, ss, iso: date.toISOString() };
}

function randomOffset() {
  return Math.round((Math.random() * 2 - 1) * PHOTO_OFFSET_RANGE);
}

// The set of original file basenames already recorded in src/photos/ markdown.
// Used to skip re-ingesting a photo that was already added.
function existingOriginals() {
  const seen = new Set();
  if (!fs.existsSync(PHOTOS_DIR)) {
    return seen;
  }
  for (const file of fs.readdirSync(PHOTOS_DIR)) {
    if (!file.endsWith(".md")) {
      continue;
    }
    const content = fs.readFileSync(path.join(PHOTOS_DIR, file), "utf8");
    const m = content.match(/^original:\s*(.+)$/m);
    if (m) {
      seen.add(path.basename(m[1].trim()));
    }
  }
  return seen;
}

function processImage(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const supportedExts = [".jpg", ".jpeg", ".png", ".tiff", ".tif", ".bmp", ".webp", ".heif", ".heic"];

  if (!supportedExts.includes(ext)) {
    console.log(`  ⏭️  Skipping ${path.basename(filePath)} (unsupported format: ${ext})`);
    return null;
  }

  // Skip photos whose original file was already ingested
  if (existingOriginals().has(path.basename(filePath))) {
    console.log(`  ⏭️  Skipping ${path.basename(filePath)} (already added)`);
    return "skipped";
  }

  console.log(`\n📷 Processing: ${path.basename(filePath)}`);

  // Get metadata
  const info = getMediainfo(filePath);
  const dims =
    info.width > 0 && info.height > 0
      ? info
      : getImageDimensions(filePath);

  if (dims.width === 0 || dims.height === 0) {
    console.error(`  ❌ Could not read dimensions for ${filePath}`);
    return null;
  }

  console.log(`  Dimensions: ${dims.width}x${dims.height}`);
  if (info.camera) console.log(`  Camera: ${info.camera}`);

  // Get date and generate filename
  const date = getDateForFilename(filePath);
  const parts = formatDateParts(date);
  const filename = `${parts.yy}${parts.mm}${parts.dd}${parts.hh}${parts.min}${parts.ss}`;
  const title = `${parts.yy}${parts.mm}${parts.dd} ${parts.hh}:${parts.min}:${parts.ss}`;
  const offset = randomOffset();

  console.log(`  Filename: ${filename}`);
  console.log(`  Offset: ${offset}`);

  // Ensure output directory exists
  fs.mkdirSync(PHOTOS_DIR, { recursive: true });

  // Create temp directory
  const tmpDir = path.join("/tmp", `photo-ingest-${filename}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  const viewingJpg = path.join(tmpDir, `${filename}.jpg`);
  const viewingWebp = path.join(tmpDir, `${filename}.webp`);

  try {
    // Convert to viewing JPEG
    execSync(
      `magick "${filePath}" -resize ${MAX_DIMENSION}x${MAX_DIMENSION}\\> -strip -quality ${JPEG_QUALITY} "${viewingJpg}"`,
      { stdio: "pipe" },
    );
    console.log(`  ✓ Viewing JPEG created`);

    // Convert to viewing WebP
    execSync(
      `magick "${filePath}" -resize ${MAX_DIMENSION}x${MAX_DIMENSION}\\> -strip "${viewingWebp}"`,
      { stdio: "pipe" },
    );
    console.log(`  ✓ Viewing WebP created`);

    // Upload viewing files
    execSync(`rclone copy "${viewingJpg}" ${BACKBLAZE_REMOTE}/`, {
      stdio: "pipe",
    });
    execSync(`rclone copy "${viewingWebp}" ${BACKBLAZE_REMOTE}/`, {
      stdio: "pipe",
    });
    console.log(`  ✓ Uploaded viewing files to Backblaze`);

    // Upload original
    const originalFilename = path.basename(filePath);
    execSync(`rclone copy "${filePath}" ${BACKBLAZE_REMOTE}/originals/`, {
      stdio: "pipe",
    });
    console.log(`  ✓ Uploaded original to Backblaze`);

    // Generate markdown
    const originalRel = originalFilename;
    const camera = info.camera || "";
    const mdContent = `---
title: ${filename}
date: ${parts.iso}
width: ${dims.width}
height: ${dims.height}
offset: ${offset}
original: ${originalRel}
${camera ? `camera: ${camera}\n` : ""}---

`;

    const mdPath = path.join(PHOTOS_DIR, `${filename}.md`);
    fs.writeFileSync(mdPath, mdContent);
    console.log(`  ✓ Generated: src/photos/${filename}.md`);

    // Cleanup temp
    fs.rmSync(tmpDir, { recursive: true, force: true });

    return filename;
  } catch (err) {
    console.error(`  ❌ Error processing ${filePath}: ${err.message}`);
    fs.rmSync(tmpDir, { recursive: true, force: true });
    return null;
  }
}

// --- Clean up orphans ---

// List all files on the remote (relative paths, e.g. "X.jpg", "originals/Y.jpg")
function listRemoteFiles() {
  try {
    const out = execSync(`rclone lsf ${BACKBLAZE_REMOTE} -R --files-only`, {
      encoding: "utf8",
    });
    return out.split("\n").map((f) => f.trim()).filter(Boolean);
  } catch (err) {
    console.error("  ❌ Could not list remote:", err.message);
    process.exit(1);
  }
}

// The set of photo names (markdown basenames, e.g. "YYMMDDHHMMSS") that exist locally
function localPhotoNames() {
  if (!fs.existsSync(PHOTOS_DIR)) {
    return new Set();
  }
  return new Set(
    fs.readdirSync(PHOTOS_DIR)
      .filter((f) => f.endsWith(".md"))
      .map((f) => f.replace(".md", "")),
  );
}

// The set of original file paths (e.g. "originals/foo.jpg") referenced by any
// local markdown frontmatter.
function localOriginals() {
  if (!fs.existsSync(PHOTOS_DIR)) {
    return new Set();
  }
  const originals = new Set();
  for (const file of fs.readdirSync(PHOTOS_DIR)) {
    if (!file.endsWith(".md")) {
      continue;
    }
    const content = fs.readFileSync(path.join(PHOTOS_DIR, file), "utf8");
    const m = content.match(/^original:\s*(.+)$/m);
    if (m) {
      // Frontmatter stores just the filename; remote files live under originals/
      const name = m[1].trim();
      originals.add(`${ORIGINALS_SUBDIR}${name}`);
    }
  }
  return originals;
}

// Clean the remote: delete any file (viewing jpg/webp or original) that has no
// matching local markdown file or frontmatter reference.
function cleanRemote({ dryRun = false } = {}) {
  console.log(`\n🧹 Cleaning ${BACKBLAZE_REMOTE}...`);

  const localNames = localPhotoNames();
  const localOriginalsSet = localOriginals();
  const remoteFiles = listRemoteFiles();

  // Collect the relative paths of orphans (including their accumulated B2
  // versions under the same name). We use these as include filters so a single
  // `rclone delete --b2-versions` removes every recorded copy.
  const orphans = [];

  for (const rel of remoteFiles) {
    const base = path.basename(rel);

    // Which local reference should match this file?
    let belongsToLocal;
    if (rel.includes("/")) {
      // Inside originals/ — match against the frontmatter "original" field
      belongsToLocal = localOriginalsSet.has(rel);
    } else {
      // Root viewing file — match against markdown basenames
      const match = base.match(/^(.*)\.(jpg|webp)$/);
      belongsToLocal = match
        ? localNames.has(match[1])
        : true; // unknown root file, keep it
    }

    if (!belongsToLocal) {
      orphans.push(rel);
    }
  }

  // Dedupe
  const uniqueOrphans = [...new Set(orphans)];

  if (uniqueOrphans.length === 0) {
    console.log("  Nothing to clean.");
    return;
  }

  if (dryRun) {
    console.log(`  Would remove ${uniqueOrphans.length} orphaned file(s):`);
    for (const rel of uniqueOrphans) {
      console.log(`    🗑️  ${rel}`);
    }
    return;
  }

  // Delete all versions of every orphan in one pass. --b2-versions makes
  // rclone enumerate the base file plus all accumulated versioned copies, and
  // --b2-hard-delete removes them from the server immediately (plain
  // deletefile only hides the current version, leaving old versions listed).
  //
  // Use glob patterns (* suffix) so --b2-versions can match versioned copies
  // like "250601100002-v2026-08-02-...-657.jpg" alongside the base file.
  const includeFlags = uniqueOrphans
    .map((f) => `--include "${f.replace(/\.(jpg|webp)$/, "*")}"`)
    .join(" ");
  try {
    execSync(
      `rclone delete --b2-versions --b2-hard-delete ${BACKBLAZE_REMOTE} ${includeFlags}`,
      { stdio: "pipe" },
    );
  } catch (err) {
    console.error(`  ❌ Failed to clean remote: ${err.message}`);
    process.exit(1);
  }
  console.log(`  Removed ${uniqueOrphans.length} orphaned file(s) (all versions).`);
}

// --- Main ---

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  showUsage();
  process.exit(0);
}

// Clean-only mode: don't require any image paths
if (args.includes("--clean")) {
  const dryRun = args.includes("--dry-run");
  cleanRemote({ dryRun });
  process.exit(0);
}

if (args.length === 0) {
  showUsage();
  process.exit(1);
}

console.log(`\n🗂️  Ingesting ${args.length} photo(s)...\n`);

let successCount = 0;
let failCount = 0;
let skipCount = 0;

for (const arg of args) {
  const resolved = path.resolve(arg);
  if (!fs.existsSync(resolved)) {
    console.error(`\n❌ File not found: ${resolved}`);
    failCount++;
    continue;
  }
  const result = processImage(resolved);
  if (result === "skipped") {
    skipCount++;
  } else if (result) {
    successCount++;
  } else {
    failCount++;
  }
}

const skipNote = skipCount > 0 ? `, ${skipCount} skipped` : "";
console.log(`\n✨ Done! ${successCount} ingested, ${failCount} failed${skipNote}.\n`);
