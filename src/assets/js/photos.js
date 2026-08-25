// ---------------------------------------------------------------------------
// getSearchableText — builds searchable string from any photo spec. Used at
// build time (Node.js) and at runtime by the search feature.
// Specs covered: plant, date (raw + formatted variants), camera.
// ---------------------------------------------------------------------------
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

function getSearchableText(photo) {
  const parts = [];
  if (photo.plant) {
    const plantList = [].concat(photo.plant).filter(Boolean);
    if (plantList.length) {
      parts.push(plantList.join(", "));
    }
  }
  if (photo.date) {
    parts.push(String(photo.date));
    try {
      parts.push(formatDate(photo.date));
      parts.push(htmlDateString(photo.date));
    } catch (_e) {
      // ignore format errors
    }
  }
  if (photo.camera) {
    parts.push(String(photo.camera));
  }
  return parts.filter(Boolean).join(" | ");
}

function tryParseDateQuery(query) {
  const q = query.trim();
  if (!q) return null;

  const hasYear = /\b\d{4}\b/.test(q);
  const hasMonthName = /jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i.test(q);
  const hasSlash = /[\/\-\.]/.test(q);

  // Year only is handled via haystack, but also parse for completeness
  if (/^\d{4}$/.test(q)) {
    return { year: Number(q), hasYear: true, hasMonth: false, hasDay: false, raw: q };
  }
  // Month name only
  const monthNamesLong = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
  ];
  const monthNamesShort = [
    "jan",
    "feb",
    "mar",
    "apr",
    "may",
    "jun",
    "jul",
    "aug",
    "sep",
    "oct",
    "nov",
    "dec",
  ];
  const lower = q.toLowerCase().trim();
  for (let i = 0; i < 12; i++) {
    if (lower === monthNamesLong[i] || lower === monthNamesShort[i]) {
      return { month: i + 1, hasYear: false, hasMonth: true, hasDay: false, raw: q };
    }
  }
  // Month name + year (e.g. "August 2026", "Aug 2026")
  const monthYear = q.match(/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{4})$/i);
  if (monthYear) {
    const name = monthYear[1].toLowerCase();
    const idx = monthNamesShort.findIndex((m) => name.startsWith(m));
    if (idx !== -1) {
      return { year: Number(monthYear[2]), month: idx + 1, hasYear: true, hasMonth: true, hasDay: false, raw: q };
    }
  }
  // Month name + day + year (e.g. "August 21, 2026", "21 August 2026")
  // Let built-in handle these
  const builtIn = new Date(q);
  if (!isNaN(builtIn) && (/\d/.test(q) || hasMonthName)) {
    const y = builtIn.getUTCFullYear();
    const m = builtIn.getUTCMonth() + 1;
    const d = builtIn.getUTCDate();
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      const hasY = hasYear;
      const hasM = hasMonthName || hasSlash;
      // hasDay if query contains a day number (1-31) distinct from year/month
      const nums = q.match(/\b\d{1,2}\b/g) || [];
      const hasD = nums.some((n) => {
        const v = Number(n);
        return v >= 1 && v <= 31 && String(v) !== String(y).slice(-2) && (hasM ? true : hasMonthName);
      }) && (hasMonthName || hasSlash);
      // For queries like "August 2026", hasD should be false
      const dayPresent = hasD && !(q.match(/^\s*jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i) && !/\b\d{1,2}\b/.test(q.replace(/\b\d{4}\b/, "")));
      // Simplify: if q is "August 2026", nums are ["2026"], hasD false
      // If q is "August 21, 2026", nums are ["21","2026"], hasD true
      let hasDay = false;
      if (hasMonthName) {
        // Count numbers that could be day (1-31)
        const dayNums = (q.match(/\b\d{1,2}\b/g) || []).filter((n) => Number(n) >= 1 && Number(n) <= 31);
        // Exclude year if 4 digits
        const dayCandidates = dayNums.filter((n) => n.length <= 2);
        hasDay = dayCandidates.length > 0;
        // But "August 2026" has no 1-2 digit day, so false
        if (q.match(/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4}$/i)) hasDay = false;
      } else if (hasSlash) {
        hasDay = (q.match(/\d+/g) || []).length >= 3;
      }
      return { year: y, month: m, day: d, hasYear: hasY, hasMonth: hasM || hasMonthName, hasDay: hasDay, raw: q };
    }
  }
  // EU fallback: dd/mm/yyyy
  const eu = q.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (eu) {
    const a = Number(eu[1]);
    const b = Number(eu[2]);
    const y = Number(eu[3]);
    if (a >= 1 && a <= 31 && b >= 1 && b <= 12) {
      const d = new Date(Date.UTC(y, b - 1, a));
      if (d.getUTCDate() === a && d.getUTCMonth() === b - 1 && d.getUTCFullYear() === y) {
        return { year: y, month: b, day: a, hasYear: true, hasMonth: true, hasDay: true, raw: q };
      }
    }
  }
  // ISO with slashes: yyyy/mm/dd
  const iso = q.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
  if (iso) {
    const y = Number(iso[1]);
    const m = Number(iso[2]);
    const d = Number(iso[3]);
    const dt = new Date(Date.UTC(y, m - 1, d));
    if (dt.getUTCDate() === d && dt.getUTCMonth() === m - 1) {
      return { year: y, month: m, day: d, hasYear: true, hasMonth: true, hasDay: true, raw: q };
    }
  }
  // Numeric month/year: mm/yyyy
  const my = q.match(/^(\d{1,2})[\/\-\.](\d{4})$/);
  if (my) {
    const m = Number(my[1]);
    const y = Number(my[2]);
    if (m >= 1 && m <= 12) {
      return { year: y, month: m, hasYear: true, hasMonth: true, hasDay: false, raw: q };
    }
  }
  const ym = q.match(/^(\d{4})[\/\-\.](\d{1,2})$/);
  if (ym) {
    const y = Number(ym[1]);
    const m = Number(ym[2]);
    if (m >= 1 && m <= 12) {
      return { year: y, month: m, hasYear: true, hasMonth: true, hasDay: false, raw: q };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Search — progressive enhancement. Activates only when:
//   1. Running in a browser (document exists)
//   2. #photo-search input is in the DOM
//   3. /photos/photo-data.json fetches successfully
// On any failure the static grid remains untouched.
// ---------------------------------------------------------------------------
(function () {
  if (typeof document === "undefined") return;
  const searchInput = document.getElementById("photo-search");
  if (!searchInput) return;

  const grid = document.getElementById("photo-grid");
  const noResults = document.getElementById("photo-no-results");
  if (!grid) return;

  let photoData = null;
  const searchIndex = [];

  function buildIndex(photos) {
    for (const photo of photos) {
      const haystack = getSearchableText(photo).toLowerCase();
      searchIndex.push({ photo, haystack });
    }
  }

  function runSearch(query) {
    const q = query.toLowerCase().trim();
    if (!q) return null;
    const matchSet = new Set();
    const dateQuery = tryParseDateQuery(query);
    for (const { photo, haystack } of searchIndex) {
      if (haystack.includes(q)) {
        matchSet.add(photo.slug);
        continue;
      }
      if (dateQuery) {
        const pd = parseDate(photo.date);
        if (!isNaN(pd)) {
          const pYear = pd.getUTCFullYear();
          const pMonth = pd.getUTCMonth() + 1;
          const pDay = pd.getUTCDate();
          if (dateQuery.hasYear && dateQuery.year !== pYear) continue;
          if (dateQuery.hasMonth && dateQuery.month !== pMonth) continue;
          if (dateQuery.hasDay && dateQuery.day !== pDay) continue;
          if (dateQuery.hasYear || dateQuery.hasMonth || dateQuery.hasDay) {
            matchSet.add(photo.slug);
          }
        }
      }
    }
    return matchSet.size ? matchSet : null;
  }

  function updateUrl(query) {
    const url = new URL(window.location);
    if (query.trim()) {
      url.search = "q=" + encodeURIComponent(query.trim());
    } else {
      url.search = "";
    }
    history.pushState({}, "", url);
  }

  function performSearch(query) {
    const q = query.trim();
    if (!q) {
      for (const el of grid.querySelectorAll(".photo-item")) {
        el.hidden = false;
      }
      if (noResults) noResults.hidden = true;
      grid.removeAttribute("data-search-active");
      return;
    }
    const result = runSearch(q);
    if (!result) {
      for (const el of grid.querySelectorAll(".photo-item")) {
        el.hidden = true;
      }
      if (noResults) noResults.hidden = false;
      grid.setAttribute("data-search-active", "");
    } else {
      for (const el of grid.querySelectorAll(".photo-item")) {
        const slug = el.getAttribute("data-slug");
        el.hidden = !result.has(slug);
      }
      if (noResults) noResults.hidden = true;
      grid.setAttribute("data-search-active", "");
    }
  }

  fetch("/photos/photo-data.json")
    .then((res) => {
      if (!res.ok) throw new Error("fetch failed");
      return res.json();
    })
    .then((data) => {
      photoData = data;
      const photos = Array.isArray(photoData.photos) ? photoData.photos : photoData;
      buildIndex(photos);

      const params = new URLSearchParams(window.location.search);
      const initialQuery = params.get("q") || "";
      if (initialQuery) {
        searchInput.value = initialQuery;
        performSearch(initialQuery);
      }

      let debounceTimer = null;

      searchInput.addEventListener("input", () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          const query = searchInput.value;
          updateUrl(query);
          performSearch(query);
        }, 500);
      });

      window.addEventListener("popstate", () => {
        const params = new URLSearchParams(window.location.search);
        const query = params.get("q") || "";
        searchInput.value = query;
        performSearch(query);
      });

      searchInput.removeAttribute("disabled");
      searchInput.setAttribute("placeholder", "🔍 Search…");
    })
    .catch(() => {
      // Fetch failed — static grid unchanged, search stays disabled
    });
}());

// ---------------------------------------------------------------------------
// UMD guard — allows templates/photos.js to require() this file at build time
// ---------------------------------------------------------------------------
if (typeof module !== "undefined") {
  module.exports = { getSearchableText, formatDate, htmlDateString, parseDate };
}
