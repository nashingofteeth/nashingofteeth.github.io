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

// Keybinds are skipped on touch-first devices (phones/tablets): no physical
// keyboard means every keybind + its scroll-driven hint bookkeeping is dead
// weight. matchMedia pointer test (not ontouchstart) so touchscreen laptops
// with a mouse primary keep binds. Evaluated once at load — docking a
// keyboard mid-session needs a reload. Node/ancient browsers default to
// enabled (safe, current behavior).
const KEYBINDS_ENABLED =
  typeof window === "undefined" ||
  typeof window.matchMedia === "undefined" ||
  !window.matchMedia("(pointer: coarse)").matches;

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
  if (typeof document === "undefined" || !KEYBINDS_ENABLED) {
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

// Strict visibility test for numbered nth-keybind candidates: the whole
// element must be on screen, top and bottom. Bounds the numbered set on
// tall pages (isFullyInViewport would number dozens running below the fold).
function isEntirelyInViewport(el) {
  if (typeof window === "undefined" || !el.getBoundingClientRect) {
    return false;
  }
  const rect = el.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.right <= window.innerWidth &&
    rect.bottom <= window.innerHeight
  );
}

// Multi-digit sequence accumulator shared by every nth-keybind consumer
// (bindDigitNav below plus the plants t/p/s/c chord handlers) so numbered
// navigation never diverges: type "1","2" for the 12th candidate. Digits
// accumulate until timeoutMs of quiet, then onDone(buffer) resolves against
// a fresh candidate list. Short lists (<10) stay zero-latency: a lone digit
// is unambiguous, so it flushes immediately. Any other keydown or window
// blur cancels without acting, so a stray "1" never surprise-navigates.
function digitSequence({ timeoutMs = 250, getCount, onDone }) {
  if (typeof document === "undefined") {
    return { feed: () => {}, cancel: () => {} };
  }
  let buffer = "";
  let timer = 0;
  const cancel = () => {
    buffer = "";
    if (timer) {
      clearTimeout(timer);
      timer = 0;
    }
  };
  document.addEventListener("keydown", (e) => {
    if (!/^[0-9]$/.test(normalizeKey(e))) {
      cancel();
    }
  });
  window.addEventListener("blur", cancel);
  function feed(key) {
    if (!/^[0-9]$/.test(key)) {
      return;
    }
    if (buffer === "" && key === "0") {
      return;
    }
    buffer += key;
    if (timer) {
      clearTimeout(timer);
      timer = 0;
    }
    if (buffer.length === 1 && getCount() < 10) {
      const done = buffer;
      cancel();
      onDone(done);
      return;
    }
    timer = setTimeout(() => {
      const done = buffer;
      cancel();
      onDone(done);
    }, timeoutMs);
  }
  return { feed, cancel };
}

// Tell the ? overlay (keybinds.js, loaded last) to repaint its badges
// from the fresh titles. Event-based so script load order doesn't matter;
// a closed overlay ignores it and builds fresh on open anyway. Shared by
// bindDigitNav below and by page scripts that retitle hints outside it
// (videos.js re-hints after the play link swaps into a player).
function notifyHintsChanged() {
  if (typeof document === "undefined" || typeof CustomEvent === "undefined") {
    return;
  }
  try {
    document.dispatchEvent(new CustomEvent("keybind-hints:changed"));
  } catch (_err) {
    // ignore — overlay repaint is best-effort
  }
}

// Mouseless list nav: digits open the nth candidate from getLinks(), a
// page-provided resolver returning candidate <a> elements in priority (DOM)
// order. Every in-viewport candidate is numbered (1, 2, … 12, …) — type
// multi-digit sequences for double-digit candidates; short lists act
// immediately (see digitSequence). Only ever targets the
// types (download buttons, toggles, photo links) are never hijacked.
// Hint titles "(n)" are managed here: originals are saved per link and
// restored when the link leaves the set. Base title is the link's own title,
// else its text (40 chars), else opts.label. Refreshes on scroll (passive,
// rAF-throttled) + resize + load; returns refresh() for manual calls after
// page re-renders (search). opts.ignoreWhen() (optional) vetoes a digit
// press before navigation — lets a page reserve plain digits while its own
// chord (plants p+digit) owns them. No-ops without a document (build time).
function bindDigitNav(getLinks, opts = {}) {
  // Touch devices skip everything below: no binds, no scroll/resize
  // listeners, no hint title writes.
  if (typeof document === "undefined" || !KEYBINDS_ENABLED) {
    return () => {};
  }
  const label = opts.label || "Open link";
  const savedTitles = new WeakMap();
  let hinted = [];

  function baseTitle(link) {
    const current = link.getAttribute("title") || "";
    if (current && !/\(\d+\)$/.test(current)) {
      return current;
    }
    const text = ((link.textContent || "").trim().slice(0, 40));
    return text || label;
  }

  function currentLinks() {
    // Collect every entirely-visible link: getBoundingClientRect() forces
    // layout, but the strict in-viewport test bounds the set on tall pages
    // (scrolled-past and below-fold links self-exclude).
    const top = [];
    for (const link of getLinks()) {
      if (isEntirelyInViewport(link)) {
        top.push(link);
      }
    }
    return top;
  }

  function refresh() {
    const next = currentLinks();
    // Small scrolls leave the numbered set unchanged — skip the title restore
    // + rewrite (pointless DOM writes) in that case. The changed event still
    // fires below: sibling hints outside this set (plants "(p)") may have
    // moved, and the overlay coalesces repeat repaints into one per frame.
    const same = hinted.length === next.length &&
      hinted.every((link, i) => link === next[i]);
    if (!same) {
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
      hinted = next;
      hinted.forEach((link, i) => {
        if (!savedTitles.has(link)) {
          savedTitles.set(link, link.getAttribute("title"));
        }
        link.setAttribute("title", `${baseTitle(link)} (${i + 1})`);
      });
    }
    // Search re-renders (photos performSearch, plants renderTree) land here
    // via the returned refresh() — repaint an open ? overlay so its badges
    // never show stale numbers or hidden items.
    notifyHintsChanged();
  }

  onKey(["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"], (e, key) => {
    // Shift+digit belongs to page-specific binds (plants toggles shift the
    // nth subtree); plain digits only here so the two never double-fire.
    // "0" is included so multi-digit sequences like "40" resolve; a lone
    // leading zero is ignored by the accumulator (no zeroth candidate).
    if (e.shiftKey) {
      return;
    }
    if (typeof opts.ignoreWhen === "function" && opts.ignoreWhen()) {
      return;
    }
    e.preventDefault();
    seq.feed(key);
  });

  const seq = digitSequence({
    getCount: () => currentLinks().length,
    onDone: (buffer) => {
      const link = currentLinks()[Number(buffer) - 1];
      if (link) {
        window.location.href = link.href;
      }
    },
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

// ---------------------------------------------------------------------------
// Grid scroll memory for Esc returns. Esc-driven grid arrivals (single photo
// page → /photos/, single video page → /videos/) are full navigations that
// always land at top, so the return leg is bridged with per-tab one-shot
// state: grid pages persist scrollY at departure (pagehide), Esc handlers
// flag the return, and the grid load below consumes the flag once.
// Browser back/forward/reload are untouched (scrollRestoration stays auto) —
// restoration only ever fires on the Esc flag. Storage may throw (private
// mode), in which case everything degrades to current top-landing behavior.
// ---------------------------------------------------------------------------
function sessGet(key) {
  try {
    return window.sessionStorage.getItem(key);
  } catch (_err) {
    return null;
  }
}

function sessSet(key, value) {
  try {
    window.sessionStorage.setItem(key, value);
  } catch (_err) {
    // ignore — scroll memory is best-effort
  }
}

function sessDel(key) {
  try {
    window.sessionStorage.removeItem(key);
  } catch (_err) {
    // ignore — scroll memory is best-effort
  }
}

function gridPath() {
  return window.location.pathname || "/";
}

// Mark the next load of gridPath as an Esc return. Call immediately before
// navigating there so the flag can't go stale.
function flagEscReturn(gridPath) {
  sessSet(`esc-return:${gridPath}`, "1");
}

// Clicking the header up-link from a single item page should restore the
// grid's scroll position exactly like Esc does — flag the return on click,
// then let the browser navigate. Not a keybind, so it also runs on touch
// devices (the saver side, trackGridScroll, is active there too). gridPath
// is the grid's pathname ("/photos/" style); header hrefs are baked without
// the trailing slash ("/photos"), so the selector prefix strips it while the
// flag key keeps it (matching trackGridScroll's pathname keys). A stale flag
// is possible only if navigation never follows the click, and it is consumed
// harmlessly by the next grid load.
function bindUpNavRestore(gridPath) {
  if (typeof document === "undefined") {
    return;
  }
  const key = gridPath.endsWith("/") ? gridPath : `${gridPath}/`;
  const link = document.querySelector(
    `header a[href^="${gridPath.replace(/\/$/, "")}"]`,
  );
  if (!link) {
    return;
  }
  link.addEventListener("click", () => {
    flagEscReturn(key);
  });
}

// Track scroll for the current grid page: persist at departure, and consume
// a pending Esc return (restore now via rAF, then re-apply on window load
// only if the user hasn't scrolled meanwhile — late image layout shifts must
// not yank a user who already moved). Call once per grid load; grids only.
function trackGridScroll() {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return;
  }
  const path = gridPath();
  window.addEventListener("pagehide", () => {
    sessSet(`grid-scroll:${path}`, String(window.scrollY || 0));
  });
  if (!sessGet(`esc-return:${path}`)) {
    return;
  }
  sessDel(`esc-return:${path}`);
  const y = Number(sessGet(`grid-scroll:${path}`)) || 0;
  const raf = window.requestAnimationFrame || ((fn) => setTimeout(fn, 0));
  raf(() => {
    window.scrollTo(0, y);
    const settled = window.scrollY;
    window.addEventListener("load", () => {
      if (window.scrollY === settled) {
        window.scrollTo(0, y);
      }
    });
  });
}

if (typeof module !== "undefined") {
  module.exports = {
    isEditableTarget,
    hasModifier,
    normalizeKey,
    onKey,
    KEYBINDS_ENABLED,
    isInViewport,
    isFullyInViewport,
    isEntirelyInViewport,
    digitSequence,
    bindDigitNav,
    flagEscReturn,
    trackGridScroll,
    bindUpNavRestore,
    notifyHintsChanged,
    sessGet,
    sessSet,
    sessDel,
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
  globalThis.KEYBINDS_ENABLED = KEYBINDS_ENABLED;
  globalThis.isInViewport = isInViewport;
  globalThis.isFullyInViewport = isFullyInViewport;
  globalThis.isEntirelyInViewport = isEntirelyInViewport;
  globalThis.digitSequence = digitSequence;
  globalThis.bindDigitNav = bindDigitNav;
  globalThis.flagEscReturn = flagEscReturn;
  globalThis.trackGridScroll = trackGridScroll;
  globalThis.bindUpNavRestore = bindUpNavRestore;
  globalThis.notifyHintsChanged = notifyHintsChanged;
  globalThis.sessGet = sessGet;
  globalThis.sessSet = sessSet;
  globalThis.sessDel = sessDel;
}
