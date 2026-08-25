// ---------------------------------------------------------------------------
// getSearchableText — builds searchable string from any photo spec. Used at
// build time (Node.js) and at runtime by the search feature.
// Specs covered: plant, date (raw + formatted variants), camera, resolution,
// title/slug/filename.
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
  if (photo.width && photo.height) {
    parts.push(`${photo.width} x ${photo.height}`);
    parts.push(`${photo.width}x${photo.height}`);
    parts.push(String(photo.width));
    parts.push(String(photo.height));
  }
  if (photo.title) {
    parts.push(String(photo.title));
  }
  if (photo.slug) {
    parts.push(String(photo.slug));
  }
  if (photo.filename) {
    parts.push(String(photo.filename));
  }
  return parts.filter(Boolean).join(" | ");
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
    for (const { photo, haystack } of searchIndex) {
      if (haystack.includes(q)) {
        matchSet.add(photo.slug);
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
