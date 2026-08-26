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

// True when the keydown target is a text-editing control, in which case global
// hotkeys (/, 1-9, Enter, J/K) should not fire.
function isEditableTarget(target) {
  return (
    target &&
    (target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.tagName === "SELECT" ||
      target.isContentEditable)
  );
}

// A search should not trigger on an editable target, with modifier keys pressed.
function isEditableOrModified(e) {
  return (
    e.ctrlKey ||
    e.metaKey ||
    e.altKey ||
    isEditableTarget(e.target)
  );
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

if (typeof module !== "undefined") {
  module.exports = {
    upgradeSearchLinks,
    isEditableTarget,
    isEditableOrModified,
    updateUrl,
    queryFromUrl,
    bindSearchInput,
  };
}
