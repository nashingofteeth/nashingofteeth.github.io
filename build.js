#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { marked } = require("marked");
const matter = require("gray-matter");

// Import templates
const homeTemplate = require("./templates/home.js");
const videosTemplate = require("./templates/videos.js");
const videoSingleTemplate = require("./templates/video-single.js");
const photosTemplate = require("./templates/photos.js");
const photoSingleTemplate = require("./templates/photo-single.js");
const plantsTemplate = require("./templates/plants.js");
const toolsTemplate = require("./templates/tools.js");
const notFoundTemplate = require("./templates/404.js");
const { sortNewestFirst, htmlDateString, getPhotoSearchFields } = require("./templates/utils.js");

// Configuration
const SRC_DIR = "src";
const DIST_DIR = "dist";
const VIDEOS_DIR = path.join(SRC_DIR, "videos");
const PHOTOS_DIR = path.join(SRC_DIR, "photos");
const PUBLIC_DIR = "public";

// Utility: Recursively remove directory
function removeDir(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.readdirSync(dirPath).forEach((file) => {
      const curPath = path.join(dirPath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        removeDir(curPath);
      } else {
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(dirPath);
  }
}

// --- Image metadata stripping (privacy) ---

const STRIPPABLE_IMAGE_EXTS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
]);

function isStrippableImage(filePath) {
  return STRIPPABLE_IMAGE_EXTS.has(path.extname(filePath).toLowerCase());
}

function stripJpegMetadata(buffer) {
  if (buffer.length < 2 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return buffer;
  }

  // Markers that carry sensitive metadata and should be dropped.
  // APP1 (0xe1): EXIF/XMP, APP12 (0xec): e.g. Ducky, APP13 (0xed): IPTC/Photoshop, COM (0xfe).
  const stripMarkers = new Set([0xe1, 0xec, 0xed, 0xfe]);
  const chunks = [];
  chunks.push(buffer.subarray(0, 2)); // SOI

  let pos = 2;
  while (pos < buffer.length) {
    if (buffer[pos] !== 0xff) {
      // Not a marker — should not happen before SOS; copy rest and break.
      chunks.push(buffer.subarray(pos));
      break;
    }

    // Skip padding 0xff bytes
    while (pos < buffer.length && buffer[pos] === 0xff) {
      pos++;
    }
    if (pos >= buffer.length) {
      break;
    }

    const marker = buffer[pos];
    pos++;

    // Standalone markers without length
    if (marker === 0xd8 || marker === 0xd9) {
      // SOI / EOI
      chunks.push(Buffer.from([0xff, marker]));
      if (marker === 0xd9) {
        break;
      }
      continue;
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      // TEM and RSTn
      chunks.push(Buffer.from([0xff, marker]));
      continue;
    }

    if (pos + 1 >= buffer.length) {
      break;
    }
    const len = buffer.readUInt16BE(pos);
    if (len < 2 || pos + len > buffer.length) {
      // Malformed segment — copy rest verbatim
      chunks.push(Buffer.from([0xff, marker]));
      chunks.push(buffer.subarray(pos));
      break;
    }

    const segment = buffer.subarray(pos - 2, pos + len); // includes FF xx + len + payload
    const payloadStart = pos + 2;

    if (marker === 0xda) {
      // SOS — header plus entropy-coded scan data until EOI; copy verbatim and stop parsing.
      chunks.push(segment);
      const scanData = buffer.subarray(payloadStart + (len - 2));
      if (scanData.length > 0) {
        chunks.push(scanData);
      }
      break;
    }

    if (!stripMarkers.has(marker)) {
      chunks.push(segment);
    }
    // else: drop the segment (strip metadata)

    pos += len;
  }

  return Buffer.concat(chunks);
}

function stripPngMetadata(buffer) {
  const PNG_SIG = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]);
  if (buffer.length < 8 || !buffer.subarray(0, 8).equals(PNG_SIG)) {
    return buffer;
  }

  // Ancillary chunks that may contain sensitive or non-essential metadata.
  const stripTypes = new Set(["tEXt", "zTXt", "iTXt", "eXIf", "tIME"]);
  const out = [PNG_SIG];
  let pos = 8;

  while (pos + 8 <= buffer.length) {
    const len = buffer.readUInt32BE(pos);
    const type = buffer.toString("ascii", pos + 4, pos + 8);
    const chunkEnd = pos + 12 + len; // len + type + data + crc
    if (chunkEnd > buffer.length) {
      break;
    }
    const chunk = buffer.subarray(pos, chunkEnd);
    if (!stripTypes.has(type)) {
      out.push(chunk);
    }
    pos = chunkEnd;
    if (type === "IEND") {
      break;
    }
  }

  // If we stripped something, reassemble; otherwise return original to avoid needless copy.
  if (out.length === 1) {
    return buffer;
  }
  // Append any trailing bytes (should not exist in valid PNG)
  if (pos < buffer.length) {
    out.push(buffer.subarray(pos));
  }
  return Buffer.concat(out);
}

function stripWebpMetadata(buffer) {
  if (
    buffer.length < 12 ||
    buffer.toString("ascii", 0, 4) !== "RIFF" ||
    buffer.toString("ascii", 8, 12) !== "WEBP"
  ) {
    return buffer;
  }

  const stripFourCC = new Set(["EXIF", "XMP "]);
  const chunks = [];
  let pos = 12;
  let keptSize = 0;

  while (pos + 8 <= buffer.length) {
    const fourCC = buffer.toString("ascii", pos, pos + 4);
    const size = buffer.readUInt32LE(pos + 4);
    const headerLen = 8;
    const paddedSize = size + (size % 2);
    const chunkEnd = pos + headerLen + paddedSize;
    if (chunkEnd > buffer.length) {
      break;
    }
    if (!stripFourCC.has(fourCC)) {
      const chunk = buffer.subarray(pos, pos + headerLen + size + (size % 2 === 1 ? 1 : 0));
      // Use exact chunk including padding byte if present, but track payload size for RIFF length
      // For kept chunks, we need header + payload + padding
      const stored = buffer.subarray(pos, chunkEnd);
      chunks.push(stored);
      keptSize += stored.length;
    }
    pos = chunkEnd;
  }

  if (chunks.length === 0 && pos === 12) {
    return buffer;
  }
  // If nothing was stripped, return original
  const originalKeptSize = buffer.length - 12;
  if (keptSize === originalKeptSize) {
    return buffer;
  }

  const riffSize = 4 + keptSize; // "WEBP" (4) + chunks
  const header = Buffer.alloc(12);
  header.write("RIFF", 0);
  header.writeUInt32LE(riffSize, 4);
  header.write("WEBP", 8);
  return Buffer.concat([header, ...chunks]);
}

function stripImageMetadata(buffer, ext) {
  switch (ext.toLowerCase()) {
    case ".jpg":
    case ".jpeg":
      return stripJpegMetadata(buffer);
    case ".png":
      return stripPngMetadata(buffer);
    case ".webp":
      return stripWebpMetadata(buffer);
    default:
      return buffer;
  }
}

function copyFileStripMetadata(srcPath, destPath) {
  if (!isStrippableImage(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    return { stripped: false };
  }

  try {
    const input = fs.readFileSync(srcPath);
    const ext = path.extname(srcPath);
    const stripped = stripImageMetadata(input, ext);
    if (stripped.length !== input.length || !stripped.equals(input)) {
      fs.writeFileSync(destPath, stripped);
      return { stripped: true, saved: input.length - stripped.length };
    }
    fs.writeFileSync(destPath, stripped);
    return { stripped: false };
  } catch (_err) {
    // Fallback to plain copy on any failure
    fs.copyFileSync(srcPath, destPath);
    return { stripped: false };
  }
}

// Utility: Recursively copy directory
function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      const result = copyFileStripMetadata(srcPath, destPath);
      if (result.stripped) {
        ok(
          `${path.relative(DIST_DIR, destPath)} (stripped ${result.saved} bytes metadata)`,
        );
      }
    }
  }
}

// Utility: Write HTML file
function writeHtml(relativePath, content, silent = false) {
  const fullPath = path.join(DIST_DIR, relativePath);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(fullPath, content);
  if (!silent) {
    ok(relativePath);
  }
}

// Utility: Log a successful step
function ok(msg) {
  console.log(`  ✓ ${msg}`);
}

// Utility: Log a skipped/failed step
function warn(msg) {
  console.log(`  ⚠️  ${msg}`);
}

// Utility: Render a page and write it to dist
function generatePage(relativePath, render) {
  writeHtml(relativePath, render());
}

// Read and parse all markdown files in a directory, mapping each into an item.
// Skips the directory when `optional` is true and it does not exist.
function readCollection(dir, mapEntry, optional = false) {
  if (optional && !fs.existsSync(dir)) {
    return [];
  }

  const items = [];
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));

  for (const file of files) {
    const fileContent = fs.readFileSync(path.join(dir, file), "utf8");
    const { data, content } = matter(fileContent);

    // Extract filename without extension, create URL slug with hyphens
    const filename = file.replace(".md", "");
    const slug = filename.replace(/_/g, "-");

    items.push(
      mapEntry({
        slug,
        filename, // Original with underscores for file references
        data,
        content,
        html: marked(content),
      }),
    );
  }

  return items;
}

// Read and parse all video markdown files
function readVideos() {
  return readCollection(VIDEOS_DIR, ({ slug, filename, data, html }) => ({
    slug,
    filename,
    title: data.title,
    date: data.date,
    width: data.width,
    height: data.height,
    runtime: data.runtime,
    frame_rate: data.frame_rate,
    camera: data.camera,
    margin_left: data.margin_left || 0,
    youtube_id: data.youtube_id,
    content: html,
  }));
}

// Read and parse all photo markdown files
function readPhotos() {
  return readCollection(
    PHOTOS_DIR,
    ({ slug, filename, data, html }) => {
      let plant;
      const rawPlant = data.plant;
      if (rawPlant != null) {
        const values = Array.isArray(rawPlant) ? rawPlant : String(rawPlant).split(",");
        const filtered = values
          .map((p) => String(p).trim())
          .filter(Boolean);
        plant = filtered.length ? filtered : undefined;
      }

      return {
        slug,
        filename,
        title: data.title,
        date: data.date,
        width: data.width,
        height: data.height,
        camera: data.camera,
        offset: data.offset || 0,
        original: data.original,
        plant,
        content: html,
      };
    },
    true, // photos dir is optional
  );
}

// Main build function
async function build() {
  console.log("🏗️  Building nash.video...\n");

  // Step 1: Clean dist directory
  console.log("Cleaning dist/...");
  removeDir(DIST_DIR);
  fs.mkdirSync(DIST_DIR);
  ok("dist/ cleaned");
  console.log("");

  // Step 2: Read video files
  console.log("Reading video files...");
  const videos = readVideos();
  ok(`Found ${videos.length} videos`);
  if (videos.length === 0) {
    warn("No video files found");
  }
  console.log("");

  // Step 2b: Read photo files
  console.log("Reading photo files...");
  const photos = readPhotos();
  ok(`Found ${photos.length} photos`);
  if (photos.length === 0) {
    warn("No photo files found");
  }

  // Determine which spec values are shared (appear in >1 photo) for single-page linking
  // Plant: always link to plant page if taxon exists in plant data (regardless of shared)
  const validPlantSet = new Set();
  try {
    const plantData = require("./src/_data/plant-data.json");
    const collect = (nodes) => {
      for (const node of nodes || []) {
        if (node.name) validPlantSet.add(String(node.name).trim().toLowerCase());
        if (node.children) collect(node.children);
      }
    };
    collect(plantData.taxonomy);
  } catch (_e) {
    // plant-data missing — no plant links
  }

  // Which spec values are shared (appear in >1 photo), used for single-page
  // linking. keyFn returns the spec keys for a photo.
  const countShared = (keyFn) => {
    const counts = new Map();
    for (const p of photos) {
      for (const k of keyFn(p)) {
        if (k) counts.set(k, (counts.get(k) || 0) + 1);
      }
    }
    return new Set(
      [...counts.entries()].filter(([, c]) => c > 1).map(([k]) => k),
    );
  };
  const sharedPlantSet = countShared((p) =>
    p.plant ? [].concat(p.plant).map((t) => String(t).trim()) : [],
  );
  const sharedDateSet = countShared((p) => {
    if (!p.date) return [];
    try {
      return [htmlDateString(p.date)];
    } catch (_e) {
      return [];
    }
  });
  const sharedCameraSet = countShared((p) =>
    p.camera ? [String(p.camera).trim()] : [],
  );
  for (const p of photos) {
    p._validPlantSet = validPlantSet;
    p._sharedPlantSet = sharedPlantSet;
    try {
      p._isDateShared = p.date ? sharedDateSet.has(htmlDateString(p.date)) : false;
    } catch (_e) {
      p._isDateShared = false;
    }
    p._isCameraShared = p.camera ? sharedCameraSet.has(String(p.camera).trim()) : false;
  }

  console.log("");

  // Step 3: Generate pages
  console.log("Generating pages...");

  const pages = [
    { path: "index.html", render: () => homeTemplate() },
    { path: "videos/index.html", render: () => videosTemplate(videos) },
    { path: "photos/index.html", render: () => photosTemplate(photos) },
    { path: "tools/index.html", render: () => toolsTemplate() },
    { path: "404.html", render: () => notFoundTemplate() },
  ];

  for (const video of videos) {
    pages.push({
      path: `videos/${video.slug}/index.html`,
      render: () => videoSingleTemplate(video),
      silent: true,
    });
  }

  const sortedPhotos = sortNewestFirst(photos);
  for (let i = 0; i < sortedPhotos.length; i++) {
    const photo = sortedPhotos[i];
    const prevPhoto = i > 0 ? sortedPhotos[i - 1] : null;
    const nextPhoto = i < sortedPhotos.length - 1 ? sortedPhotos[i + 1] : null;
    pages.push({
      path: `photos/${photo.slug}/index.html`,
      render: () => photoSingleTemplate(photo, prevPhoto, nextPhoto),
      silent: true,
    });
  }

  const videoPages = videos.length;
  const photoPages = photos.length;
  for (const page of pages) {
    writeHtml(page.path, page.render(), page.silent);
  }
  const summaries = [];
  if (videoPages > 0) {
    summaries.push(`${videoPages} video pages`);
  }
  if (photoPages > 0) {
    summaries.push(`${photoPages} photo pages`);
  }
  if (summaries.length > 0) {
    ok(summaries.join(", "));
  }

  // Plants page
  try {
    const plantData = require("./src/_data/plant-data.json");

    // Annotate taxa that have at least one photo (matched by taxon name only,
    // not common-name aliases) so the plants tree can link each to a
    // /photos/?q= search of that taxon. When exactly one photo matches a
    // node, link straight to that photo's page instead of the search query.
    const photoTaxa = new Set();
    const photoSlugsByTaxon = new Map();
    for (const p of photos) {
      if (p.plant) {
        for (const taxon of [].concat(p.plant)) {
          const key = String(taxon).trim().toLowerCase();
          if (!key) continue;
          photoTaxa.add(key);
          if (!photoSlugsByTaxon.has(key)) {
            photoSlugsByTaxon.set(key, new Set());
          }
          photoSlugsByTaxon.get(key).add(p.slug);
        }
      }
    }
    const annotateTaxa = (nodes) => {
      for (const node of nodes || []) {
        if (node.name) {
          const normalized = String(node.name).trim().toLowerCase();
          if (photoTaxa.has(normalized)) {
            const slugs = photoSlugsByTaxon.get(normalized);
            node.hasPhoto = true;
            if (slugs.size === 1) {
              node.photoSlug = [...slugs][0];
            }
          }
        }
        if (node.children) annotateTaxa(node.children);
      }
    };
    annotateTaxa(plantData.taxonomy);

    generatePage("plants/index.html", () => plantsTemplate(plantData));
    // Write annotated JSON so client-side search re-renders consistently
    fs.mkdirSync(path.join(DIST_DIR, "plants"), { recursive: true });
    fs.writeFileSync(
      path.join(DIST_DIR, "plants", "plant-data.json"),
      JSON.stringify(plantData),
    );
    ok("plant-data.json → dist/plants/ (photo annotations)");
  } catch (error) {
    warn("plant-data.json not found, skipping plants page");
  }

  // Photo data JSON for client-side search (matches any spec)
  try {
    // Sort newest-first to match the grid's DOM order, so query-scoped prev/next
    // on single pages follows the same ordering the user saw in the grid.
    const photoData = {
      generated: new Date().toISOString(),
      totalPhotos: photos.length,
      photos: sortNewestFirst(photos).map((p) => ({
        slug: p.slug,
        ...getPhotoSearchFields(p),
      })),
    };
    const photoDataPath = path.join(DIST_DIR, "photos", "photo-data.json");
    fs.mkdirSync(path.dirname(photoDataPath), { recursive: true });
    fs.writeFileSync(photoDataPath, JSON.stringify(photoData));
    ok("photo-data.json → dist/photos/");
  } catch (error) {
    warn("failed to write photo-data.json: " + error.message);
  }

  console.log("");

  // Step 4: Copy static assets
  console.log("Copying static assets...");

  if (fs.existsSync(PUBLIC_DIR)) {
    copyDir(PUBLIC_DIR, DIST_DIR);
    ok("public/ → dist/");
  } else {
    warn("public/ not found, skipping");
  }

  // Copy tools directory contents to dist root
  const toolsDir = "tools";
  if (fs.existsSync(toolsDir)) {
    copyDir(toolsDir, DIST_DIR);
    ok("tools/ → dist/");
  } else {
    warn("tools/ not found, skipping");
  }

  console.log("\n✨ Build complete! Output in dist/\n");
}

// Run build
build().catch((err) => {
  console.error("❌ Build failed:", err);
  process.exit(1);
});
