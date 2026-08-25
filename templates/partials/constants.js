// Shared constants across templates

const BASE_URL = "https://f004.backblazeb2.com/file/nash-potato/";

const SITE_TITLE_SUFFIX = " - matthew nash";

const SOCIAL_USERNAME = "nashingofteeth";
const SOCIAL_LINKS = {
  github: `https://github.com/${SOCIAL_USERNAME}`,
  letterboxd: `https://letterboxd.com/${SOCIAL_USERNAME}/`,
  ryms: `https://rateyourmusic.com/~${SOCIAL_USERNAME}`,
  instagram: `https://www.instagram.com/${SOCIAL_USERNAME}/`,
  sequitur: `https://github.com/${SOCIAL_USERNAME}/sequitur`,
  repo: `https://github.com/${SOCIAL_USERNAME}/${SOCIAL_USERNAME}.github.io`,
};

const TRANSCODES_PATH = "videos/transcodes/";

const POTATO_URL = "https://potato.cheap/";

const PHOTOS_PATH = "photos/";
const ORIGINALS_SUBDIR = "originals/";

// Standard display ("full") variant — the size loaded when not using thumb
// (single page + mobile gallery fallback). Capped at 1200px long edge; lives
// as bare `${name}.jpg/.webp` beside thumb `${name}-thumb`.
const FULL_MAX_DIMENSION = 1200;
const FULL_SUFFIX = "";

// Desktop thumbnail variant for the photos gallery grid. Gallery tiles are
// ~200-300px, so a 400px cap (≈1-2x DPR) is plenty; mobile falls back to
// the full variant. Thumbs live beside full files, named `${name}-thumb`.
const THUMB_MAX_DIMENSION = 400;
const THUMB_SUFFIX = "-thumb";

// Qualities chosen by sweep on 3 high-res originals (1200px full + 400px thumb, SSIM vs size):
//  - FULL jpg 82: 240KB avg, ssim 0.956 (vs 85: 267KB 0.96, +11% size for +0.004 ssim)
//  - FULL webp 75: 130KB avg, ssim 0.944 (vs 78: 149KB 0.950, +14% size)
//  - THUMB jpg 75: 30KB avg, ssim 0.946 (knee vs 70: 27KB 0.941)
//  - THUMB webp 65: 22KB avg, ssim 0.945 (vs 70: 23KB 0.948)
// cwebp vs magick WebP are identical (magick delegates to libwebp) — keep magick.
const FULL_JPEG_QUALITY = 82;
const THUMB_JPEG_QUALITY = 75;
const FULL_WEBP_QUALITY = 75;
const THUMB_WEBP_QUALITY = 65;

// Photo offset: stored as -100…+100 (percent of max travel). Gallery maps to
// ±MAX_GALLERY_SHIFT_PX px; single maps |offset|/OFFSET_RANGE → fraction of
// blank; green tint lightness = BASE_LIGHTNESS + offset/OFFSET_RANGE * TINT_RANGE.
const PHOTO_OFFSET_RANGE = 100;
const MAX_GALLERY_SHIFT_PX = 30;
const PHOTO_TINT_BASE_LIGHTNESS = 54;
const PHOTO_TINT_RANGE = 14;

module.exports = {
  BASE_URL,
  SITE_TITLE_SUFFIX,
  SOCIAL_LINKS,
  TRANSCODES_PATH,
  POTATO_URL,
  PHOTOS_PATH,
  ORIGINALS_SUBDIR,
  FULL_MAX_DIMENSION,
  FULL_SUFFIX,
  THUMB_MAX_DIMENSION,
  THUMB_SUFFIX,
  FULL_JPEG_QUALITY,
  THUMB_JPEG_QUALITY,
  FULL_WEBP_QUALITY,
  THUMB_WEBP_QUALITY,
  PHOTO_OFFSET_RANGE,
  MAX_GALLERY_SHIFT_PX,
  PHOTO_TINT_BASE_LIGHTNESS,
  PHOTO_TINT_RANGE,
};
