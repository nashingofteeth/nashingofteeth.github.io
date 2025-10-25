#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { marked } = require("marked");
const matter = require("gray-matter");

// Import templates
const homeTemplate = require("./templates/home.js");
const videosTemplate = require("./templates/videos.js");
const videoSingleTemplate = require("./templates/video-single.js");
const toolsTemplate = require("./templates/tools.js");
const notFoundTemplate = require("./templates/404.js");

// Configuration
const SRC_DIR = "src";
const DIST_DIR = "dist";
const VIDEOS_DIR = path.join(SRC_DIR, "videos");
const PUBLIC_DIR = "public";
const TOOLS_DIR = "tools";

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
function writeHtml(relativePath, content) {
  const fullPath = path.join(DIST_DIR, relativePath);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(fullPath, content);
  console.log(`  ✓ ${relativePath}`);
}

// Read and parse all video markdown files
function readVideos() {
  const videos = [];
  const files = fs.readdirSync(VIDEOS_DIR).filter((f) => f.endsWith(".md"));

  for (const file of files) {
    const filePath = path.join(VIDEOS_DIR, file);
    const fileContent = fs.readFileSync(filePath, "utf8");
    const { data, content } = matter(fileContent);

    // Convert markdown to HTML
    const html = marked(content);

    // Extract filename without extension
    const filename = file.replace(".md", "");

    // Create URL slug with hyphens
    const slug = filename.replace(/_/g, "-");

    videos.push({
      slug,
      filename, // Keep original with underscores for file references
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
    });
  }

  return videos;
}

// Main build function
async function build() {
  console.log("🏗️  Building nash.video...\n");

  // Step 1: Clean dist directory
  console.log("Cleaning dist/...");
  removeDir(DIST_DIR);
  fs.mkdirSync(DIST_DIR);
  console.log("  ✓ dist/ cleaned\n");

  // Step 2: Read video files
  console.log("Reading video files...");
  const videos = readVideos();
  console.log(`  ✓ Found ${videos.length} videos\n`);

  // Step 3: Generate pages
  console.log("Generating pages...");

  // Homepage
  const homeHtml = homeTemplate();
  writeHtml("index.html", homeHtml);

  // Videos page
  const videosHtml = videosTemplate(videos);
  writeHtml("videos/index.html", videosHtml);

  // Individual video pages
  for (const video of videos) {
    const videoHtml = videoSingleTemplate(video);
    writeHtml(`videos/${video.slug}/index.html`, videoHtml);
  }

  // Tools page
  const toolsHtml = toolsTemplate();
  writeHtml("tools/index.html", toolsHtml);

  // 404 page
  const notFoundHtml = notFoundTemplate();
  writeHtml("404.html", notFoundHtml);

  console.log("");

  // Step 4: Copy static assets
  console.log("Copying static assets...");

  if (fs.existsSync(PUBLIC_DIR)) {
    copyDir(PUBLIC_DIR, DIST_DIR);
    console.log("  ✓ public/ → dist/");
  }

  if (fs.existsSync(TOOLS_DIR)) {
    copyDir(TOOLS_DIR, DIST_DIR);
    console.log("  ✓ tools/ → dist/");
  }

  // Copy CNAME and .htaccess
  if (fs.existsSync("CNAME")) {
    fs.copyFileSync("CNAME", path.join(DIST_DIR, "CNAME"));
    console.log("  ✓ CNAME → dist/");
  }

  if (fs.existsSync(".htaccess")) {
    fs.copyFileSync(".htaccess", path.join(DIST_DIR, ".htaccess"));
    console.log("  ✓ .htaccess → dist/");
  }

  console.log("\n✨ Build complete! Output in dist/\n");
}

// Run build
build().catch((err) => {
  console.error("❌ Build failed:", err);
  process.exit(1);
});
