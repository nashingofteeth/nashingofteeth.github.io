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

  function findInternalLink(section) {
    const links = Array.from(document.querySelectorAll("a[href]"));
    return (
      links.find((a) => {
        const raw = (a.getAttribute("href") || "").trim();
        const normalized = raw.replace(/^\/|\/$/g, "");
        return normalized === section;
      }) || null
    );
  }

  function findExternalLink(fragment) {
    const links = Array.from(document.querySelectorAll("a[href]"));
    return (
      links.find((a) => {
        const href = (a.getAttribute("href") || "").toLowerCase();
        return href.includes(fragment);
      }) || null
    );
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
  function applyHomepageHints() {
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
