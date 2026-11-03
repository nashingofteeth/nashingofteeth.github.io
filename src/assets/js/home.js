// ---------------------------------------------------------------------------
// home.js — homepage-only keyboard shortcuts. Loaded only on / (see
// templates/home.js for the load order). Guards (modifiers, editable
// targets, key normalization) come from keybind-utils.js (loaded first):
//
//   v/o/p/t → sections, g/l/r/i → socials, w → working on
// ---------------------------------------------------------------------------
(function () {
  if (typeof document === "undefined") {
    return;
  }

  // The "Working on" project (nile) is a github.com URL that sits before the
  // socials, so leaving it in the fragment scan below would shadow the github
  // profile link for g. Found via its <em> label (the link title is the
  // project description, not a key) and excluded there, indexed under w.
  function findWorkingOnLink() {
    for (const em of document.querySelectorAll("em")) {
      if ((em.textContent || "").trim().toLowerCase() !== "working on") {
        continue;
      }
      const parent = em.parentElement;
      const link = parent && parent.querySelector("a[href]");
      if (link) {
        return link;
      }
    }
    return null;
  }
  const workingOnLink = findWorkingOnLink();

  // Cached link index: the old per-keypress scan ran querySelectorAll over
  // every <a> for each of 9 keys (plus 9 scans at hint-apply time). One pass
  // at load instead; the homepage DOM is static.
  const internalBySection = new Map();
  const externalByFragment = new Map();
  for (const a of document.querySelectorAll("a[href]")) {
    if (a === workingOnLink) {
      continue;
    }
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
      case "w":
        return workingOnLink;
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
      w: "Working on",
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

  // Homepage section + social + working-on shortcuts.
  onKey(["v", "o", "p", "t", "g", "l", "r", "i", "w"], (e, key) => {
    const link = homepageLinkFor(key);
    if (link) {
      e.preventDefault();
      window.location.href = link.href;
    }
  });
}());
