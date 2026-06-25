#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const PHOTOS_DIR = path.join(__dirname, "..", "src", "photos");
const BACKBLAZE_REMOTE = "backblaze:nash-potato/photos";
const MAX_DIMENSION = 1200;
const JPEG_QUALITY = 85;
const ROTATION_RANGE = 8; // -8 to +8 degrees

function showUsage() {
  console.log(`
Usage: node scripts/ingest-photo.js <image1> [image2] [image3] ...

Ingest one or more photos into the potato website.

Each image will be:
  1. Metadata extracted via mediainfo
  2. Converted to viewing JPEG and WebP
  3. Uploaded to Backblaze
  4. Markdown file generated in src/photos/

Examples:
  node scripts/ingest-photo.js ~/photos/garden.jpg
  node scripts/ingest-photo.js ~/photos/*.jpg
  node scripts/ingest-photo.js ~/photos/rose.jpg ~/photos/fern.jpg
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

function randomRotation() {
  return (Math.random() * 2 - 1) * ROTATION_RANGE;
}

function processImage(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const supportedExts = [".jpg", ".jpeg", ".png", ".tiff", ".tif", ".bmp", ".webp"];

  if (!supportedExts.includes(ext)) {
    console.log(`  ⏭️  Skipping ${path.basename(filePath)} (unsupported format: ${ext})`);
    return null;
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

  // Get date and generate filename
  const date = getDateForFilename(filePath);
  const parts = formatDateParts(date);
  const filename = `${parts.yy}${parts.mm}${parts.dd}${parts.hh}${parts.min}${parts.ss}`;
  const title = `${parts.yy}${parts.mm}${parts.dd} ${parts.hh}:${parts.min}:${parts.ss}`;
  const rotation = randomRotation();

  console.log(`  Filename: ${filename}`);
  console.log(`  Rotation: ${rotation.toFixed(1)}°`);

  // Create temp directory
  const tmpDir = path.join("/tmp", `photo-ingest-${filename}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  const viewingJpg = path.join(tmpDir, `${filename}.jpg`);
  const viewingWebp = path.join(tmpDir, `${filename}.webp`);

  try {
    // Convert to viewing JPEG
    execSync(
      `magick "${filePath}" -resize ${MAX_DIMENSION}x${MAX_DIMENSION}\\> -quality ${JPEG_QUALITY} "${viewingJpg}"`,
      { stdio: "pipe" },
    );
    console.log(`  ✓ Viewing JPEG created`);

    // Convert to viewing WebP
    execSync(
      `magick "${filePath}" -resize ${MAX_DIMENSION}x${MAX_DIMENSION}\\> "${viewingWebp}"`,
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
    const originalRel = `originals/${originalFilename}`;
    const mdContent = `---
title: ${filename}
date: ${parts.iso}
width: ${dims.width}
height: ${dims.height}
rotation: ${rotation.toFixed(1)}
original: ${originalRel}
---

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

// --- Main ---

const args = process.argv.slice(2);

if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
  showUsage();
  process.exit(0);
}

console.log(`\n🗂️  Ingesting ${args.length} photo(s)...\n`);

let successCount = 0;
let failCount = 0;

for (const arg of args) {
  const resolved = path.resolve(arg);
  if (!fs.existsSync(resolved)) {
    console.error(`\n❌ File not found: ${resolved}`);
    failCount++;
    continue;
  }
  const result = processImage(resolved);
  if (result) {
    successCount++;
  } else {
    failCount++;
  }
}

console.log(`\n✨ Done! ${successCount} ingested, ${failCount} failed.\n`);
