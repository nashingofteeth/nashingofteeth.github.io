// Shared keybind helper — loaded first on every templated page (see
// templates/*.js for the load order). Single place for the guards every
// keydown handler needs: modifier keys, text-editing targets, and key
// normalization. Page scripts (photos.js, photo-single.js, plants.js,
// videos.js, home.js) and the global defaults (keybinds.js, loaded last)
// register via onKey() instead of raw addEventListener("keydown").
// Collection pages (photos, plants, tools) offer mouseless list nav via
// bindDigitNav().
//
// Ordering contract: page-specific handlers are registered before the
// global defaults (page assets come before keybinds.js in loadJs), so a
// page handler that preventDefaults an Escape press (e.g. clearing a
// non-empty search) runs first and the global up-nav skips via
// e.defaultPrevented. Works at build time (require) and in the browser
// (globals + UMD guard, mirroring month-utils.js).

function isEditableTarget(target) {
  return (
    target &&
    (target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.tagName === "SELECT" ||
      target.isContentEditable)
  );
}

function hasModifier(e) {
  return e.ctrlKey || e.metaKey || e.altKey;
}

// Normalize a key event to a lowercase match token: "Escape" → "escape",
// " " / "Spacebar" → "space", "Esc" → "escape". Falls back to keyCode for
// very old browsers (mirrors the photo-single.js fallback).
function normalizeKey(e) {
  const raw = (e.key || String.fromCharCode(e.keyCode || 0) || "").toLowerCase();
  if (raw === " " || raw === "spacebar") {
    return "space";
  }
  if (raw === "esc") {
    return "escape";
  }
  return raw;
}

// Register a keydown handler with shared guards. keys is a single key or
// an array of keys (post-normalization, e.g. "escape", "j", "/").
// By default handlers are skipped inside text-editing targets and when a
// modifier is held; pass { allowInEditable: true } for handlers like
// Enter-to-open-first that explicitly manage the focused-input case.
// No-ops without a document (build time). The handler owns
// preventDefault + navigation.
function onKey(keys, handler, opts = {}) {
  if (typeof document === "undefined") {
    return;
  }
  const wanted = Array.isArray(keys) ? keys : [keys];
  const allowInEditable = Boolean(opts.allowInEditable);
  document.addEventListener("keydown", (e) => {
    if (hasModifier(e)) {
      return;
    }
    if (!allowInEditable && isEditableTarget(e.target)) {
      return;
    }
    if (!wanted.includes(normalizeKey(e))) {
      return;
    }
    handler(e, normalizeKey(e));
  });
}

// Partial-visibility test: any part of the element inside the viewport.
// Zero-rect elements (display:none, e.g. collapsed plants subtrees) fail
// the bottom check and self-exclude. Used for SPACE play/pause targeting,
// where a mostly-visible player still counts.
function isInViewport(el) {
  if (typeof window === "undefined" || !el.getBoundingClientRect) {
    return false;
  }
  const rect = el.getBoundingClientRect();
  return (
    rect.bottom > 0 &&
    rect.top < window.innerHeight &&
    rect.right > 0 &&
    rect.left < window.innerWidth
  );
}

// Top-visibility test for nth-keybind candidates: the link's top edge must
// be on screen (never scrolled past), while running below the fold is fine.
// Horizontal containment still required. Zero-rect elements (display:none,
// e.g. collapsed plants subtrees) fail the bottom check and self-exclude.
function isFullyInViewport(el) {
  if (typeof window === "undefined" || !el.getBoundingClientRect) {
    return false;
  }
  const rect = el.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.right <= window.innerWidth &&
    rect.bottom > 0
  );
}

// Mouseless list nav: "1"–"9" opens the nth top-visible link from
// getLinks(), a page-provided resolver returning candidate <a> elements in
// priority (DOM) order. Links scrolled past the top never bind; running
// below the fold is fine. Only ever targets the
// types (download buttons, toggles, photo links) are never hijacked.
// Hint titles "(n)" are managed here: originals are saved per link and
// restored when the link leaves the set. Base title is the link's own title,
// else its text (40 chars), else opts.label. Refreshes on scroll (passive,
// rAF-throttled) + resize + load; returns refresh() for manual calls after
// page re-renders (search). No-ops without a document (build time).
function bindDigitNav(getLinks, opts = {}) {
  if (typeof document === "undefined") {
    return () => {};
  }
  const label = opts.label || "Open link";
  const savedTitles = new WeakMap();
  let hinted = [];

  function baseTitle(link) {
    const current = link.getAttribute("title") || "";
    if (current && !/\(\d\)$/.test(current)) {
      return current;
    }
    const text = ((link.textContent || "").trim().slice(0, 40));
    return text || label;
  }

  function currentLinks() {
    return getLinks().filter(isFullyInViewport).slice(0, 9);
  }

  function refresh() {
    for (const link of hinted) {
      if (savedTitles.has(link)) {
        const original = savedTitles.get(link);
        if (original) {
          link.setAttribute("title", original);
        } else {
          link.removeAttribute("title");
        }
      }
    }
    hinted = currentLinks();
    hinted.forEach((link, i) => {
      if (!savedTitles.has(link)) {
        savedTitles.set(link, link.getAttribute("title"));
      }
      link.setAttribute("title", `${baseTitle(link)} (${i + 1})`);
    });
  }

  onKey(["1", "2", "3", "4", "5", "6", "7", "8", "9"], (e, key) => {
    const links = currentLinks();
    const link = links[Number(key) - 1];
    if (link) {
      e.preventDefault();
      window.location.href = link.href;
    }
  });

  let rafPending = false;
  function scheduleRefresh() {
    if (rafPending) {
      return;
    }
    rafPending = true;
    const raf = window.requestAnimationFrame || ((fn) => setTimeout(fn, 0));
    raf(() => {
      rafPending = false;
      refresh();
    });
  }
  document.addEventListener("scroll", scheduleRefresh, { passive: true });
  window.addEventListener("resize", scheduleRefresh);
  refresh();
  return refresh;
}

if (typeof module !== "undefined") {
  module.exports = {
    isEditableTarget,
    hasModifier,
    normalizeKey,
    onKey,
    isInViewport,
    isFullyInViewport,
    bindDigitNav,
  };
}

// Expose as globals for concatenated browser scripts (loadJs joins files
// into one classic script, so top-level declarations are already shared;
// globalThis assignment mirrors month-utils.js for explicitness).
if (typeof globalThis !== "undefined") {
  globalThis.isEditableTarget = isEditableTarget;
  globalThis.hasModifier = hasModifier;
  globalThis.normalizeKey = normalizeKey;
  globalThis.onKey = onKey;
  globalThis.isInViewport = isInViewport;
  globalThis.isFullyInViewport = isFullyInViewport;
  globalThis.bindDigitNav = bindDigitNav;
}
