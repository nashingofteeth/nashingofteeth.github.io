// ---------------------------------------------------------------------------
// tryParseDateQuery — interprets a user-typed date query into year/month/day
// components (with hasYear/hasMonth/hasDay flags) so it can be matched against
// build-time photo date ints. This is the one part of search that must run in
// the browser, since it reads live input. All date parsing/formatting of the
// photos themselves happens at build time (see templates/utils.js).
// ---------------------------------------------------------------------------
function tryParseDateQuery(query) {
  const q = query.trim();
  if (!q) return null;

  const hasYear = /\b\d{4}\b/.test(q);
  const hasMonthName = /jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i.test(q);
  const hasSlash = /[\/\-\.]/.test(q);

  if (/^\d{4}$/.test(q)) {
    return { year: Number(q), hasYear: true, hasMonth: false, hasDay: false, raw: q };
  }

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
  const builtIn = new Date(q);
  if (!isNaN(builtIn) && (/\d/.test(q) || hasMonthName)) {
    const y = builtIn.getUTCFullYear();
    const m = builtIn.getUTCMonth() + 1;
    const d = builtIn.getUTCDate();
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      let hasDay = false;
      if (hasMonthName) {
        const dayCandidates = (q.match(/\b\d{1,2}\b/g) || []).filter((n) => n.length <= 2 && Number(n) >= 1 && Number(n) <= 31);
        hasDay = dayCandidates.length > 0;
        if (q.match(/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4}$/i)) hasDay = false;
      } else if (hasSlash) {
        hasDay = (q.match(/\d+/g) || []).length >= 3;
      }
      return { year: y, month: m, day: d, hasYear: hasYear, hasMonth: hasMonthName || hasSlash, hasDay: hasDay, raw: q };
    }
  }

  // EU fallback: dd/mm/yyyy
  const eu = q.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (eu) {
    const a = Number(eu[1]);
    const b = Number(eu[2]);
    const y = Number(eu[3]);
    if (a >= 1 && a <= 31 && b >= 1 && b <= 12) {
      const dt = new Date(Date.UTC(y, b - 1, a));
      if (dt.getUTCDate() === a && dt.getUTCMonth() === b - 1 && dt.getUTCFullYear() === y) {
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

  // Numeric month/year: mm/yyyy or yyyy/mm
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
// filterByQuery — returns the photos (in input order) matching a search query.
// Operates on build-time items: { slug, search, y, m, d } where `search` is a
// precomputed lowercase haystack and y/m/d are UTC date ints. Shared by the
// grid page (DOM data-attributes) and the single-photo page (photo-data.json).
// ---------------------------------------------------------------------------
function filterByQuery(items, query) {
  const q = query.toLowerCase().trim();
  if (!q) return null;
  const dateQuery = tryParseDateQuery(query);
  const matches = [];
  for (const item of items) {
    if (item.search && item.search.includes(q)) {
      matches.push(item);
      continue;
    }
    if (dateQuery) {
      if (dateQuery.hasYear && dateQuery.year !== item.y) continue;
      if (dateQuery.hasMonth && dateQuery.month !== item.m) continue;
      if (dateQuery.hasDay && dateQuery.day !== item.d) continue;
      if (dateQuery.hasYear || dateQuery.hasMonth || dateQuery.hasDay) {
        matches.push(item);
      }
    }
  }
  return matches.length ? matches : null;
}

// ---------------------------------------------------------------------------
// Search — progressive enhancement. Activates only when:
//   1. Running in a browser (document exists)
//   2. #photo-search input is in the DOM
// Search data is baked into the grid's data-* attributes at build time, so no
// fetch is needed. Without the input present, the static grid is untouched.
// ---------------------------------------------------------------------------
(function () {
  if (typeof document === "undefined") return;
  const searchInput = document.getElementById("photo-search");
  if (!searchInput) return;

  const grid = document.getElementById("photo-grid");
  const noResults = document.getElementById("photo-no-results");
  if (!grid) return;

  // Build a flat index from the precomputed data-* attributes.
  const searchIndex = [];
  for (const el of grid.querySelectorAll(".photo-item")) {
    searchIndex.push({
      slug: el.getAttribute("data-slug"),
      search: el.getAttribute("data-search") || "",
      y: Number(el.getAttribute("data-y")) || 0,
      m: Number(el.getAttribute("data-m")) || 0,
      d: Number(el.getAttribute("data-d")) || 0,
    });
  }

  function runSearch(query) {
    const matches = filterByQuery(searchIndex, query);
    if (!matches) return null;
    const matchSet = new Set(matches.map((m) => m.slug));
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

  // Update each photo item's link so a filtered grid click carries the query
  // to the single page, enabling query-scoped prev/next there.
  function setPhotoLinks(query) {
    for (const el of grid.querySelectorAll(".photo-item")) {
      const slug = el.getAttribute("data-slug");
      const link = el.querySelector("a");
      if (!link) continue;
      if (query) {
        link.setAttribute("href", `/photos/${slug}/?q=${encodeURIComponent(query)}`);
      } else {
        link.setAttribute("href", `/photos/${slug}/`);
      }
    }
  }

  function performSearch(query) {
    const q = query.trim();
    if (!q) {
      for (const el of grid.querySelectorAll(".photo-item")) {
        el.hidden = false;
      }
      if (noResults) noResults.hidden = true;
      grid.removeAttribute("data-search-active");
      setPhotoLinks("");
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
    setPhotoLinks(q);
  }

  // Restore search from URL on initial load
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

  // "/" focuses the search bar (matching common gallery/reader conventions).
  document.addEventListener("keydown", (e) => {
    if (
      e.ctrlKey ||
      e.metaKey ||
      e.altKey ||
      e.key !== "/" ||
      document.activeElement === searchInput
    ) {
      return;
    }
    const target = e.target;
    if (
      target &&
      (target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable)
    ) {
      return;
    }
    e.preventDefault();
    searchInput.focus();
    searchInput.select();
  });

  // "1"–"9" navigates to the nth visible photo in the current (filtered) grid.
  function numberedItem(n) {
    const visible = [];
    for (const el of grid.querySelectorAll(".photo-item")) {
      if (!el.hidden) {
        visible.push(el);
      }
    }
    return visible[n - 1] || null;
  }

  function digitKeyNav(e) {
    if (e.ctrlKey || e.metaKey || e.altKey || document.activeElement === searchInput) {
      return;
    }
    const target = e.target;
    if (
      target &&
      (target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable)
    ) {
      return;
    }
    const digit = parseInt(e.key, 10);
    if (!Number.isInteger(digit) || digit < 1 || digit > 9) {
      return;
    }
    const item = numberedItem(digit);
    const link = item && item.querySelector("a[href]");
    if (link) {
      e.preventDefault();
      window.location.href = link.getAttribute("href");
    }
  }

  document.addEventListener("keydown", digitKeyNav);
}());

// ---------------------------------------------------------------------------
// UMD guard — allows the single-photo page (photo-single.js, loaded after this
// file) to call filterByQuery / tryParseDateQuery. Not required at build time.
// ---------------------------------------------------------------------------
if (typeof module !== "undefined") {
  module.exports = { filterByQuery, tryParseDateQuery };
}
