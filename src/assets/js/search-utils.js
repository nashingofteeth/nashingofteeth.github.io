// Shared client-side helpers for the site's search features (photos, plants,
// photo single page). All functions are runtime-safe: they only touch the DOM
// when a document is present. The UMD guard at the bottom lets tests or other
// build-time code require() this file without a browser.

// Promote search-placeholder <span data-href> to real links. Search links are
// baked as spans so they don't appear (or navigate) when JS is disabled; this
// runs once JS is available.
function upgradeSearchLinks(container) {
  const root = container || document;
  root.querySelectorAll("span[data-href]").forEach((el) => {
    const a = document.createElement("a");
    a.href = el.getAttribute("data-href");
    if (el.hasAttribute("title")) {
      a.setAttribute("title", el.getAttribute("title"));
    }
    a.className = el.className;
    a.innerHTML = el.innerHTML;
    el.replaceWith(a);
  });
}

// Push a ?q= query (or strip it) onto the URL without reloading, so the filter
// is shareable and survives back/forward navigation.
function updateUrl(query) {
  const url = new URL(window.location);
  if (query.trim()) {
    url.search = "q=" + encodeURIComponent(query.trim());
  } else {
    url.search = "";
  }
  history.pushState({}, "", url);
}

// Read the current ?q= query from the URL, or "" when absent.
function queryFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("q") || "";
}

// Wire up the standard search scaffolding shared by every search page:
// restoring an initial query, a debounced input handler, and popstate. Returns
// a perform(query) caller that applies the URL/restore semantics.
function bindSearchInput(input, perform) {
  const initialQuery = queryFromUrl();
  if (initialQuery) {
    input.value = initialQuery;
    perform(initialQuery);
  }

  let debounceTimer = null;
  input.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const query = input.value;
      updateUrl(query);
      perform(query);
    }, 500);
  });

  window.addEventListener("popstate", () => {
    const query = queryFromUrl();
    input.value = query;
    perform(query);
  });
}

// "/" focuses the given search input (matching common gallery/reader
// conventions). No-op when already focused. Shared by photos.js + plants.js
// (onKey comes from keybind-utils.js, loaded first; see templates/*.js).
function bindSlashToFocus(searchInput) {
  onKey("/", (e) => {
    if (document.activeElement === searchInput) {
      return;
    }
    e.preventDefault();
    searchInput.focus();
    searchInput.select();
  });
}

// Escape clears the given search: input value, ?q= URL, and rendered results,
// preserving focus state. Shared by photos.js + plants.js.
// LOAD-BEARING: this preventDefaults the press so the global up-nav in
// keybinds.js (registered later, skips on defaultPrevented) does not fire on
// the same press — Esc-with-query clears instead of navigating away.
function bindEscapeToClear(searchInput, performSearch) {
  onKey(
    "escape",
    (e) => {
      if (!searchInput.value.trim()) {
        return;
      }
      e.preventDefault();
      const keepFocus = document.activeElement === searchInput;
      searchInput.value = "";
      updateUrl("");
      performSearch("");
      if (keepFocus) {
        searchInput.focus();
      } else {
        searchInput.blur();
      }
    },
    { allowInEditable: true },
  );
}

if (typeof module !== "undefined") {
  module.exports = {
    upgradeSearchLinks,
    updateUrl,
    queryFromUrl,
    bindSearchInput,
    bindSlashToFocus,
    bindEscapeToClear,
  };
}
