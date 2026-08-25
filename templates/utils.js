// Utility functions for templates

function sortNewestFirst(collection) {
  return [...collection].sort(
    (a, b) => new Date(b.date) - new Date(a.date),
  );
}

// Parse a Date object, an ISO timestamp, or a bare YYYY-MM-DD string.
// Bare dates parse as UTC to avoid timezone shifts.
function parseDate(dateInput) {
  if (dateInput instanceof Date) {
    return dateInput;
  }
  const isBareDate = /^\d{4}-\d{2}-\d{2}$/.test(dateInput);
  return isBareDate
    ? new Date(dateInput + "T00:00:00Z")
    : new Date(dateInput);
}

function formatDate(dateInput) {
  const date = parseDate(dateInput);
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return `${months[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
}

function htmlDateString(dateInput) {
  const date = parseDate(dateInput);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Build-time search fields for a photo. Produces a lowercase haystack (plant,
// date variants, camera) and the UTC year/month/day ints so the client only
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
    // gray-matter parses date: into a Date object; normalize to the ISO UTC
    // string (equivalent to what a JSON round-trip used to yield) so the
    // haystack isn't machine-localized.
    let rawDate;
    try {
      rawDate = parseDate(photo.date).toISOString();
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
    const date = parseDate(photo.date);
    if (!isNaN(date)) {
      y = date.getUTCFullYear();
      m = date.getUTCMonth() + 1;
      d = date.getUTCDate();
    }
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

module.exports = {
  sortNewestFirst,
  formatDate,
  htmlDateString,
  getPhotoSearchFields,
};
