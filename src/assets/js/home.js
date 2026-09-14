// ---------------------------------------------------------------------------
// home.js — homepage-only keyboard shortcuts. Loaded only on / (see
// templates/home.js for the load order). Guards (modifiers, editable
// targets, key normalization) come from keybind-utils.js (loaded first):
//
//   v/o/p/t → sections, g/l/r/i → socials
// ---------------------------------------------------------------------------
(function () {
  if (typeof document === "undefined") {
    return;
  }

  // Cached link index: the old per-keypress scan ran querySelectorAll over
  // every <a> for each of 8 keys (plus 8 scans at hint-apply time). One pass
  // at load instead; the homepage DOM is static.
  const internalBySection = new Map();
  const externalByFragment = new Map();
  for (const a of document.querySelectorAll("a[href]")) {
    const raw = (a.getAttribute("href") || "").trim();
    const normalized = raw.replace(/^\/|\/$/g, "");
    if (!internalBySection.has(normalized)) {
      internalBySection.set(normalized, a);
    }
    const href = raw.toLowerCase();
    for (const fragment of ["github.com", "letterboxd.com", "rateyourmusic.com", "instagram.com"]) {
      if (href.includes(fragment) && !externalByFragment.has(fragment)) {
        externalByFragment.set(fragment, a);
      }
    }
  }

  function findInternalLink(section) {
    return internalBySection.get(section) || null;
  }

  function findExternalLink(fragment) {
    return externalByFragment.get(fragment) || null;
  }

  function homepageLinkFor(key) {
    switch (key) {
      case "v":
        return findInternalLink("videos");
      case "o":
        return findInternalLink("photos");
      case "p":
        return findInternalLink("plants");
      case "t":
        return findInternalLink("tools");
      case "g":
        return findExternalLink("github.com");
      case "l":
        return findExternalLink("letterboxd.com");
      case "r":
        return findExternalLink("rateyourmusic.com");
      case "i":
        return findExternalLink("instagram.com");
      default:
        return null;
    }
  }

  // Homepage shortcut hints, applied at runtime like photo-single.js titles.
  // Skipped on touch devices — never advertise dead keys (the whole file is
  // then inert on mobile: zero listeners, zero DOM writes).
  function applyHomepageHints() {
    if (!KEYBINDS_ENABLED) {
      return;
    }
    const labels = {
      v: "Videos",
      o: "Photos",
      p: "Plants",
      t: "Tools",
      g: "GitHub",
      l: "Letterboxd",
      r: "RYM",
      i: "Instagram",
    };
    for (const key of Object.keys(labels)) {
      const link = homepageLinkFor(key);
      if (!link) {
        continue;
      }
      const hint = `(${key.toUpperCase()})`;
      const current = link.getAttribute("title") || "";
      if (!current.includes(hint)) {
        const base = current.trim() || labels[key];
        link.setAttribute("title", `${base} ${hint}`);
      }
    }
  }
  applyHomepageHints();

  // Homepage section + social shortcuts.
  onKey(["v", "o", "p", "t", "g", "l", "r", "i"], (e, key) => {
    const link = homepageLinkFor(key);
    if (link) {
      e.preventDefault();
      window.location.href = link.href;
    }
  });
}());
