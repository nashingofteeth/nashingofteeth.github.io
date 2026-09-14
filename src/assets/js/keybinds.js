// ---------------------------------------------------------------------------
// keybinds.js — global (page-agnostic) keyboard shortcuts. Loaded last on
// every templated page (see templates/*.js for the load order) so
// page-specific handlers registered via onKey() run first. Guards
// (modifiers, editable targets, key normalization) come from
// keybind-utils.js (loaded first); this file owns only global behavior:
//
//   Escape → up (section parent, else home)
//   j / k  → half-viewport scroll (except photo-single pages, which own j/k
//            for prev/next nav in photo-single.js, and the videos grid, which
//            owns j/k for prev/next video snap in videos.js)
//   (Homepage shortcuts live in home.js, loaded only on /.)
//
// Coexists with page handlers via two deliberate mechanisms:
//   - defaultPrevented: photos.js / plants.js Esc clear-handlers register
//     first (page assets come before this file in loadJs) and preventDefault
//     the press, so the global Esc up-nav below skips it.
//   - pathname carve-outs: photo-single.js owns Escape + j/k on
//     /photos/<slug>/ and videos.js owns j/k on /videos/, so this file stays
//     inert there by path check (those pages never preventDefault — they
//     navigate — so defaultPrevented alone couldn't express it).
// ---------------------------------------------------------------------------
(function () {
  if (typeof document === "undefined") {
    return;
  }

  function pathName() {
    return window.location.pathname || "/";
  }

  function isPhotoSinglePage() {
    return /^\/photos\/[^/]+\/?$/.test(pathName());
  }

  function isVideosGrid() {
    const p = pathName();
    return p === "/videos/" || p === "/videos/index.html";
  }

  // The grid search input the user is currently typing in, if any.
  function activeSearchInput() {
    const active = document.activeElement;
    if (
      active &&
      (active.id === "photo-search" || active.id === "plant-search")
    ) {
      return active;
    }
    return null;
  }

  // Resolve the Escape "up" target. Null means no-op (home, or a page whose
  // own script owns Escape).
  function upHref() {
    const p = pathName();
    if (p === "/" || p === "/index.html") {
      return null;
    }
    if (isPhotoSinglePage()) {
      return null;
    }
    if (/^\/videos\/[^/]+\/?$/.test(p)) {
      return "/videos/";
    }
    if (/^\/(videos|photos|plants|tools)\/?$/.test(p)) {
      return "/";
    }
    return "/";
  }

  // Hint the header link that Escape actually targets, mirroring the
  // runtime-applied "(K)"/"(Esc)" titles in photo-single.js. Skipped on
  // touch devices — never advertise dead keys.
  function applyEscHint() {
    if (!KEYBINDS_ENABLED) {
      return;
    }
    const href = upHref();
    if (!href) {
      return;
    }
    const link = document.querySelector(`header a[href="${href}"]`);
    if (link && !/\(Esc\)/.test(link.getAttribute("title") || "")) {
      const base = (link.getAttribute("title") || "").trim();
      link.setAttribute("title", base ? `${base} (Esc)` : "Up (Esc)");
    }
  }
  applyEscHint();

  // Escape → up. allowInEditable because an empty focused search still
  // navigates up; a focused search with content belongs to the page
  // clear-handler (registered first), which preventDefaults the press.
  onKey(
    "escape",
    (e) => {
      // A grid clear-handler (photos.js / plants.js, registered first) clears
      // a non-empty search and preventDefaults the same press — never navigate
      // after that, or Esc-with-query would both clear and leave the page.
      if (e.defaultPrevented) {
        return;
      }
      const activeSearch = activeSearchInput();
      // Fallback when this file ever runs before the clear-handler: a focused
      // search that still has content belongs to the clearer, not to up-nav.
      if (activeSearch && activeSearch.value.trim()) {
        return;
      }
      if (!activeSearch && isEditableTarget(e.target)) {
        return;
      }
      const href = upHref();
      if (href) {
        e.preventDefault();
        // Flag grid returns so the grid restores scroll position on arrival.
        // Only /videos/ is a grid target here (photo singles own their Esc).
        if (href === "/videos/") {
          flagEscReturn(href);
        }
        window.location.href = href;
      }
    },
    { allowInEditable: true },
  );

  // Half-viewport scroll. Photo-single pages own j/k for prev/next, and the
  // videos grid owns j/k for prev/next video snap (videos.js) — both stay
  // inert here. Single-video pages keep the half-viewport scroll.
  onKey(["j", "k"], (e, key) => {
    if (isPhotoSinglePage() || isVideosGrid()) {
      return;
    }
    const delta = Math.round(window.innerHeight / 2);
    e.preventDefault();
    window.scrollBy(0, key === "j" ? delta : -delta);
  });

  // ? — toggle a minimal hint overlay. Badges are derived from the hint
  // titles this site already maintains (a trailing "(x)" group, or several
  // slash-separated keys like "(Space/F)"), so the overlay can never drift
  // from the live bindings. Covers links, buttons, search inputs, plant
  // toggles, plant taxa rows, and in-page players. ? again closes; Esc keeps its existing meaning (grid return /
  // up-nav) and header links keep their "(Esc)" hint titles. Scroll, resize,
  // and search re-renders share one rAF-throttled repaint while open
  // (listeners attached only while open); search arrives via the
  // keybind-hints:changed event dispatched by bindDigitNav's refresh().
  // Mobile: onKey is inert there, and no "(x)" titles exist anyway.
  let overlayEl = null;
  let overlayScrollHandler = null;
  let overlayResizeHandler = null;
  let overlayHintsHandler = null;

  function closeOverlay() {
    if (!overlayEl) {
      return;
    }
    overlayEl.remove();
    overlayEl = null;
    document.removeEventListener("scroll", overlayScrollHandler);
    window.removeEventListener("resize", overlayResizeHandler);
    document.removeEventListener("keybind-hints:changed", overlayHintsHandler);
    overlayScrollHandler = null;
    overlayResizeHandler = null;
    overlayHintsHandler = null;
  }

  function badgeAnchor(el, elRect) {
    // Image links (photo grid) badge the visible thumbnail, not the full
    // link box: the <a> is a square flex cell while the picture inside is
    // narrower (portrait) or shorter (landscape), so a cell-anchored badge
    // lands detached in the grid gutter. In-page players (video grid/single
    // after play starts) badge the player itself. Plant toggles badge to the
    // LEFT of the marker: the handle is only 2ch wide at the line's left
    // edge, so a right-side badge would sit on top of the taxa name. Text
    // links, buttons, inputs, and plant taxa rows badge just outside
    // top-right. elRect (already measured by the caller) is reused to avoid
    // a second getBoundingClientRect per element per repaint.
    const img = el.querySelector ? el.querySelector("img") : null;
    if (img) {
      const imgRect = img.getBoundingClientRect();
      if (imgRect.width > 0 && imgRect.height > 0) {
        return { rect: imgRect, inside: true };
      }
    }
    if (el.tagName === "VIDEO" || el.tagName === "IFRAME") {
      return { rect: elRect, inside: true };
    }
    if (el.classList && el.classList.contains("toggle")) {
      return { rect: elRect, inside: false, side: "left" };
    }
    // Taxa rows (li) badge LEFT of the item — the old toggle-hint slot —
    // so right-side numbers never crowd the row's own links/badges.
    if (el.tagName === "LI") {
      return { rect: elRect, inside: false, side: "left" };
    }
    return { rect: elRect, inside: false, side: "right" };
  }

  // Key tokens from a hint title. One element can advertise several keys in
  // a single trailing group — "Play (Space/F)" badges SPACE + F, a search
  // box ending "focus (/)" badges /, plant toggles ending "(!)" badge ! —
  // so the tooltip stays compact while each key stays discoverable. Only
  // the trailing group parses, so incidental parens elsewhere never badge.
  function hintKeys(el) {
    const match = (el.getAttribute("title") || "").match(/\(([-+!@#$%^&*()a-z0-9/]+(?:\/[-+!@#$%^&*()a-z0-9/]+)*)\)\s*$/i);
    if (!match) {
      return [];
    }
    // "/" is both a key and the multi-key separator — a group that is only
    // "/" means the slash key itself, not an empty key list.
    if (match[1] === "/") {
      return ["/"];
    }
    return match[1].split("/");
  }

  // Floating info bar (bottom-right, inside the overlay) for chord/
  // progressive-keybind guidance that can't live on an element badge. Fully
  // page-owned: the bar renders only when the page set body[data-hint-bar]
  // (plants.js declares its chord leaders there; pages without chords never
  // do, so they get no bar). Armed-chord messages arrive the same way — the
  // page rewrites data-hint-bar when a chord arms or disarms.
  function buildBar() {
    const text = document.body &&
      document.body.dataset &&
      document.body.dataset.hintBar;
    if (!text) {
      return;
    }
    const bar = document.createElement("span");
    bar.className = "keybind-hint-bar";
    bar.textContent = text;
    overlayEl.appendChild(bar);
  }

  function buildBadges() {
    // Leader-chord awareness (plants.js sets body[data-chord] to p/s/c/t):
    // taxa number hints are progressive — li titles only badge while an
    // s/c/t chord is armed (p has no taxa targets) — and while any leader
    // is armed the digits it captures go dark: wiki "(n)" badges always,
    // photo "(Pn)" badges except when p itself is the leader.
    const chord = document.body &&
      document.body.dataset &&
      document.body.dataset.chord;
    const chordArmed = Boolean(chord);
    const taxaReveal = chordArmed && chord !== "p";
    const hinted = document.querySelectorAll(
      "a[title], button[title], input[title], .toggle[title], li[title], video[title], iframe[title]",
    );
    const vw = window.innerWidth;
    for (const el of Array.from(hinted)) {
      if (el.tagName === "LI") {
        if (!taxaReveal) {
          continue;
        }
      } else if (chordArmed && el.tagName === "A") {
        const tokens = hintKeys(el);
        const digitHint = tokens.length === 1 && /^\d+$/.test(tokens[0]);
        const photoHint = tokens.some((t) => /^P\d+$/.test(t));
        if (digitHint || (photoHint && taxaReveal)) {
          continue;
        }
      }
      const keys = hintKeys(el);
      if (!keys.length) {
        continue;
      }
      // Collapsed plants subtrees never badge: zero-rect links self-exclude
      // below, but the closest() check skips them before measuring.
      if (el.closest && el.closest("ul.collapsed")) {
        continue;
      }
      const rect = el.getBoundingClientRect();
      // Top-edge visibility (same eligibility as the numbered binds): never
      // scrolled past, running below the fold is fine. Measured once here
      // and reused by badgeAnchor — one rect per element per repaint.
      if (!(rect.top >= 0 && rect.left >= 0 && rect.right <= vw && rect.bottom > 0)) {
        continue;
      }
      const { rect: anchor, inside, side } = badgeAnchor(el, rect);
      keys.forEach((key, i) => {
        const badge = document.createElement("span");
        badge.className = "keybind-hint-badge";
        // Single letters keep their case so (d) lossy and (D) lossless stay
        // distinct; longer names uppercase (Esc → ESC) as before.
        badge.textContent = key.length > 1 ? key.toUpperCase() : key;
        overlayEl.appendChild(badge);
        // Position after append so the badge's own box doesn't affect it.
        // The overlay is position:fixed, so viewport-relative rect coords are
        // used directly (no scroll offsets). Image/player badges sit inside
        // the thumbnail's top-left corner (extras stack below); text badges
        // sit just outside top-right; toggle badges hang left of the marker
        // (translateX(-100%) right-aligns without measuring the badge, so
        // the taxa name stays uncovered).
        if (inside) {
          badge.style.left = `${anchor.left + 4}px`;
          badge.style.top = `${anchor.top + 4 + i * 22}px`;
        } else if (side === "left") {
          badge.style.left = `${anchor.left - 8}px`;
          badge.style.top = `${anchor.top - 4 + i * 22}px`;
          badge.style.transform = "translateX(-100%)";
        } else {
          badge.style.left = `${anchor.right + 2}px`;
          badge.style.top = `${anchor.top - 4 + i * 22}px`;
        }
      });
    }
  }

  function openOverlay() {
    overlayEl = document.createElement("div");
    overlayEl.className = "keybind-hint-overlay";
    overlayEl.setAttribute("aria-hidden", "true");
    document.body.appendChild(overlayEl);
    let rafPending = false;
    const scheduleRepaint = () => {
      // One shared throttle for scroll, resize, and search-driven hint
      // changes: a single scroll frame otherwise repaints twice (the scroll
      // listener here plus bindDigitNav's refresh → keybind-hints:changed).
      // The guard also covers ? closing between scheduling and the frame so
      // a late event can't resurrect badges onto a closed overlay.
      if (rafPending) {
        return;
      }
      rafPending = true;
      const raf = window.requestAnimationFrame || ((fn) => setTimeout(fn, 0));
      raf(() => {
        rafPending = false;
        if (!overlayEl) {
          return;
        }
        overlayEl.innerHTML = "";
        buildBadges();
        buildBar();
      });
    };
    overlayScrollHandler = scheduleRepaint;
    overlayResizeHandler = scheduleRepaint;
    // Search re-renders update digit-nav titles via bindDigitNav's refresh()
    // (keybind-utils.js), which dispatches this event.
    overlayHintsHandler = scheduleRepaint;
    document.addEventListener("scroll", overlayScrollHandler, { passive: true });
    window.addEventListener("resize", overlayResizeHandler);
    document.addEventListener("keybind-hints:changed", overlayHintsHandler);
    buildBadges();
    buildBar();
  }

  onKey("?", () => {
    if (overlayEl) {
      closeOverlay();
    } else {
      openOverlay();
    }
  });
}());
