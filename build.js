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
      fs.copyFileSync(srcPath, destPath);
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
    ({ slug, filename, data, html }) => ({
      slug,
      filename,
      title: data.title,
      date: data.date,
      width: data.width,
      height: data.height,
      camera: data.camera,
      offset: data.offset || 0,
      original: data.original,
      plant: data.plant,
      content: html,
    }),
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

  for (const photo of photos) {
    pages.push({
      path: `photos/${photo.slug}/index.html`,
      render: () => photoSingleTemplate(photo),
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
    generatePage("plants/index.html", () => plantsTemplate(plantData));
    // Copy plant data JSON so the client-side search feature can fetch it
    fs.copyFileSync(
      "./src/_data/plant-data.json",
      path.join(DIST_DIR, "plants", "plant-data.json"),
    );
    ok("plant-data.json → dist/plants/");
  } catch (error) {
    warn("plant-data.json not found, skipping plants page");
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
