// ---------------------------------------------------------------------------
// tools.js — tools-list mouseless nav. Loaded only on /tools/ (see
// templates/tools.js for the load order). Guards + bindDigitNav() come from
// keybind-utils.js (loaded first). Scoped to main article links so header
// links are never bound.
// ---------------------------------------------------------------------------
(function () {
  if (typeof document === "undefined") {
    return;
  }

  bindDigitNav(() =>
    Array.from(document.querySelectorAll("main article a[href]")),
  );
}());
