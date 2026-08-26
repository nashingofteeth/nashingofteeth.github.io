// Utility functions for templates

const { BASE_URL, PHOTOS_PATH, PHOTO_TIME_ZONE } = require("./partials/constants.js");
const { MONTH_NAMES } = require("../src/assets/js/month-utils.js");

function sortNewestFirst(collection) {
  return [...collection].sort(
    (a, b) => new Date(b.date) - new Date(a.date),
  );
}

// Extract a photo's {y, m, d, hh, min, ss} zoned as PHOTO_TIME_ZONE, so
// rendering is independent of the build machine's timezone. Bare dates are
// literal calendar dates (no re-zoning).
const BARE_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const pad = (n) => String(n).padStart(2, "0");

const ZONED_FMT = new Intl.DateTimeFormat("en-CA", {
  timeZone: PHOTO_TIME_ZONE,
  year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
});

function getDateParts(dateInput) {
  if (typeof dateInput === "string" && BARE_DATE_RE.test(dateInput)) {
    const [y, m, d] = dateInput.split("-").map(Number);
    return { y, m, d, hh: 0, min: 0, ss: 0 };
  }
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  const [, y, m, d, hh, min, ss] =
    ZONED_FMT.format(date).match(/(\d{4})-(\d{2})-(\d{2})[,\s]+(\d{2}):(\d{2}):(\d{2})/) || [];
  return { y: +y, m: +m, d: +d, hh: hh === "24" ? 0 : +hh, min: +min, ss: +ss };
}

function formatDate(dateInput) {
  const { y, m, d } = getDateParts(dateInput);
  return `${MONTH_NAMES[m - 1]} ${d}, ${y}`;
}

function htmlDateString(dateInput) {
  const { y, m, d } = getDateParts(dateInput);
  return `${y}-${pad(m)}-${pad(d)}`;
}

// Build-time search fields for a photo. Produces a lowercase haystack (plant,
// date variants, camera) and the zoned year/month/day ints so the client only
// does substring/integer matching — no date parsing in the browser bundle.
function getPhotoSearchFields(photo) {
  const parts = [];
  if (photo.plant) {
    const plantList = [].concat(photo.plant).filter(Boolean);
    if (plantList.length) {
      parts.push(plantList.join(", "));
    }
  }
  if (photo.date) {
    // gray-matter parses date: into a Date object. Push a machine-readable
    // timestamp built from the LOCAL components (matching the displayed date)
    // so a free-text query like "2026-08-19" doesn't surface a photo whose
    // true-UTC instant falls on that day but whose local capture date is the
    // 18th.
    let rawDate;
    try {
      const p = getDateParts(photo.date);
      rawDate = `${p.y}-${pad(p.m)}-${pad(p.d)}T${pad(p.hh)}:${pad(p.min)}:${pad(p.ss)}.000Z`;
    } catch (_e) {
      rawDate = String(photo.date);
    }
    parts.push(rawDate);
    try {
      parts.push(formatDate(photo.date));
      parts.push(htmlDateString(photo.date));
    } catch (_e) {
      // ignore invalid dates
    }
  }
  if (photo.camera) {
    parts.push(String(photo.camera));
  }

  let y = 0;
  let m = 0;
  let d = 0;
  try {
    const p = getDateParts(photo.date);
    y = p.y;
    m = p.m;
    d = p.d;
  } catch (_e) {
    // ignore invalid dates
  }

  return {
    search: parts.filter(Boolean).join(" | ").toLowerCase(),
    y,
    m,
    d,
  };
}

// Absolute URL for a photo variant on the CDN, e.g. the full jpg, the thumb
// webp, or an original. variant is the file suffix (e.g. "-thumb"), ext the
// image extension (default "jpg"). Centralizes the repeated asset-path
// construction used by the photo article partial.
function photoAsset(photo, variant = "", ext = "jpg") {
  return `${BASE_URL}${PHOTOS_PATH}${photo.filename}${variant}.${ext}`;
}

// The bookmark link that appears next to a title, pointing to the item's own
// page. type is "photo" or "video"; yields /photos/ or /videos/ respectively.
function bookmarkLink(slug, type) {
  return `&nbsp;<a href="/${type}s/${slug}/" class="bookmark" aria-label="Go to ${type} page" title="Go to ${type} page">&#128279;</a>`;
}

module.exports = {
  sortNewestFirst,
  formatDate,
  htmlDateString,
  getPhotoSearchFields,
  photoAsset,
  bookmarkLink,
};
