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
// Coexists with page handlers:
//   - photo-single.js owns Escape + j/k on /photos/<slug>/ (query-preserved
//     grid return + scoped prev/next), so this file stays inert there.
//   - videos.js owns j/k on /videos/ (prev/next video snap), so this file
//     stays inert there (single-video pages keep the half-viewport scroll).
//   - photos.js / plants.js own Escape when their search input has content
//     (clear semantics: they clear + preventDefault, registered before this
//     file so they run first on the same press). This file skips Escape when
//     the press was already consumed (defaultPrevented) or the focused search
//     still has content; an empty search (focused or not) navigates up.
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
  // runtime-applied "(K)"/"(Esc)" titles in photo-single.js.
  function applyEscHint() {
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
}());
