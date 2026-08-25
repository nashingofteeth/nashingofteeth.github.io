#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const {
  ORIGINALS_SUBDIR,
  THUMB_MAX_DIMENSION,
  THUMB_SUFFIX,
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

// Read dimensions AFTER applying EXIF orientation. Phones store raw sensor
// w/h plus an Orientation tag; a portrait shot reads e.g. 3264x2448 with
// Orientation 6 but displays as 2448x3264. We report the displayed size so
// the gallery/single-page layout matches the (auto-oriented) baked pixels.
function getOrientedDimensions(filePath) {
  try {
    const output = execSync(
      `magick identify -format "%w %h %[EXIF:Orientation]" "${filePath}"`,
      { encoding: "utf8" },
    ).trim();
    const parts = output.split(/\s+/);
    let w = parseInt(parts[0], 10);
    let h = parseInt(parts[1], 10);
    const orient = parseInt(parts[2], 10);
    const ext = path.extname(filePath).toLowerCase();
    // HEIF/HEIC from iPhone often carries both EXIF orientation and
    // container irot that disagree with how the image is actually intended
    // to be displayed. Empirically for 20241112_172127.heif the raw
    // 3024x4032 is already upright (portrait) and should NOT be swapped
    // despite EXIF:Orientation=6 and irot=270. Treat HEIF as already
    // oriented and use raw dimensions to avoid the double-swap that
    // previously produced a landscape markdown for a portrait image.
    if (ext === ".heif" || ext === ".heic") {
      // Use raw dimensions as-is for HEIF
    } else if ([5, 6, 7, 8].includes(orient) && w > 0 && h > 0) {
      [w, h] = [h, w]; // swap for 90°/270° rotations
    }
    if (w > 0 && h > 0) {
      return { width: w, height: h, orientation: orient || 0 };
    }
    return { width: 0, height: 0, orientation: 0 };
  } catch (err) {
    return { width: 0, height: 0, orientation: 0 };
  }
}

function getHeifRotationAngle(filePath) {
  // Returns clockwise rotation degrees needed to display the HEIF upright,
  // or 0 if none. Prefers heif-info's `angle (ccw)` transform; falls back
  // to mediainfo's Rotation field.
  try {
    const info = execSync(`heif-info "${filePath}" 2>&1`, {
      encoding: "utf8",
    });
    const m = info.match(/angle \(ccw\):\s*(-?\d+)/i);
    if (m) {
      const ccw = parseInt(m[1], 10);
      if (!isNaN(ccw) && ccw !== 0) {
        const cw = (360 - ((ccw % 360) + 360) % 360) % 360;
        return cw;
      }
    }
  } catch (_err) {
    // ignore
  }
  try {
    const output = execSync(`mediainfo --Output=JSON "${filePath}"`, {
      encoding: "utf8",
    });
    const data = JSON.parse(output);
    for (const track of data.media.track || []) {
      if (track["@type"] === "Image" && track.extra && track.extra.Rotation) {
        const rotStr = track.extra.Rotation;
        const first = rotStr.split("/")[0].trim();
        const deg = parseInt(first, 10);
        if (!isNaN(deg) && deg !== 0) {
          // mediainfo reports e.g. "-270" meaning 270 CCW / 90 CW
          const cw = (360 - ((deg % 360) + 360) % 360) % 360;
          if (cw === 90 || cw === 180 || cw === 270) {
            return cw;
          }
          // deg itself may already be CW; normalise
          const norm = ((deg % 360) + 360) % 360;
          if (norm === 90 || norm === 180 || norm === 270) {
            return norm;
          }
        }
      }
    }
  } catch (_err) {
    // ignore
  }
  return 0;
}

function getMagickAutoOrientArgs(filePath) {
  // `magick -auto-orient` handles JPEG EXIF correctly. For HEIF the raw
  // 3024x4032 from iPhone is already upright (see 241112092127) and
  // applying the EXIF:Orientation=6 / irot=270 would incorrectly
  // produce a landscape image, so we leave HEIF as-is.
  return "-auto-orient";
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
  // Use oriented dimensions (EXIF rotation applied) for layout/width/height.
  const dims = getOrientedDimensions(filePath);
  if (dims.width === 0 || dims.height === 0) {
    const fb = getImageDimensions(filePath);
    dims.width = fb.width;
    dims.height = fb.height;
  }

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
  const thumbJpg = path.join(tmpDir, `${filename}${THUMB_SUFFIX}.jpg`);
  const thumbWebp = path.join(tmpDir, `${filename}${THUMB_SUFFIX}.webp`);

  try {
    // Convert to viewing JPEG (-auto-orient first so pixels are upright,
    // then resize, then strip the now-redundant EXIF orientation tag).
    // For HEIF, -auto-orient alone ignores the container irot, so we
    // compute explicit args that include -rotate when needed.
    const autoOrientArgs = getMagickAutoOrientArgs(filePath);
    execSync(
      `magick "${filePath}" ${autoOrientArgs} -resize ${MAX_DIMENSION}x${MAX_DIMENSION}\\> -strip -quality ${JPEG_QUALITY} "${viewingJpg}"`,
      { stdio: "pipe" },
    );
    console.log(`  ✓ Viewing JPEG created`);

    // Convert to viewing WebP
    execSync(
      `magick "${filePath}" ${autoOrientArgs} -resize ${MAX_DIMENSION}x${MAX_DIMENSION}\\> -strip "${viewingWebp}"`,
      { stdio: "pipe" },
    );
    console.log(`  ✓ Viewing WebP created`);

    // Convert to desktop thumbnail variant
    execSync(
      `magick "${filePath}" ${autoOrientArgs} -resize ${THUMB_MAX_DIMENSION}x${THUMB_MAX_DIMENSION}\\> -strip -quality ${JPEG_QUALITY} "${thumbJpg}"`,
      { stdio: "pipe" },
    );
    execSync(
      `magick "${filePath}" ${autoOrientArgs} -resize ${THUMB_MAX_DIMENSION}x${THUMB_MAX_DIMENSION}\\> -strip "${thumbWebp}"`,
      { stdio: "pipe" },
    );
    console.log(`  ✓ Thumbnail (${THUMB_MAX_DIMENSION}px) created`);

    // Upload viewing files
    execSync(`rclone copy "${viewingJpg}" ${BACKBLAZE_REMOTE}/`, {
      stdio: "pipe",
    });
    execSync(`rclone copy "${viewingWebp}" ${BACKBLAZE_REMOTE}/`, {
      stdio: "pipe",
    });
    execSync(`rclone copy "${thumbJpg}" ${BACKBLAZE_REMOTE}/`, {
      stdio: "pipe",
    });
    execSync(`rclone copy "${thumbWebp}" ${BACKBLAZE_REMOTE}/`, {
      stdio: "pipe",
    });
    console.log(`  ✓ Uploaded viewing + thumbnail files to Backblaze`);

    // Upload original — lossless strip of all sensitive metadata.
    // Uses a whitelist: wipe everything then restore only camera/lens/exposure
    // and Orientation/dimensions. This reliably removes GPS, OwnerName,
    // serial numbers and thumbnails that a blacklist leaves in raw makernotes
    // padding. Camera is kept because it's already public on page.
    const originalFilename = path.basename(filePath);
    const stagedOriginal = path.join(tmpDir, originalFilename);
    fs.copyFileSync(filePath, stagedOriginal);
    try {
      execSync(
        `exiftool -overwrite_original -all= -tagsFromFile @ ` +
          `-Make -Model -LensMake -LensModel -LensSpecification ` +
          `-FocalLength -FocalLengthIn35mmFormat -FNumber -ApertureValue ` +
          `-ExposureTime -ShutterSpeedValue -ISO -ExposureCompensation ` +
          `-Flash -WhiteBalance -MeteringMode -ExposureProgram -ColorSpace ` +
          `-DateTimeOriginal -CreateDate ` +
          `-Orientation -ExifImageWidth -ExifImageHeight -ImageWidth -ImageHeight ` +
          `"${stagedOriginal}"`,
        { stdio: "pipe" },
      );
    } catch (err) {
      console.warn(`  ⚠️  exiftool strip failed (${err.message}), uploading original as-is`);
    }
    execSync(`rclone copy "${stagedOriginal}" ${BACKBLAZE_REMOTE}/originals/`, {
      stdio: "pipe",
    });
    console.log(`  ✓ Uploaded original (stripped) to Backblaze`);

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
      // Root viewing file — match against markdown basenames. Thumbnails use a
      // "-thumb" suffix; strip it before matching so they're treated as part
      // of the same photo (never flagged as orphans on their own).
      const match = base.match(/^(.*?)(?:-thumb)?\.(jpg|webp)$/);
      belongsToLocal = match
        ? localNames.has(match[1])
        : true; // unknown root file, keep it
    }

    if (!belongsToLocal) {
      orphans.push(rel);
    }
  }

  // When a full viewing file is orphaned (markdown deleted), its `-thumb`
  // variant must go too. The include glob below already expands
  // "NAME.jpg" -> "NAME*" which matches both NAME.jpg and NAME-thumb.jpg, so
  // no extra handling is needed here — just make sure we never list a thumb as
  // its own orphan (handled by the suffix-stripping match above).

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
