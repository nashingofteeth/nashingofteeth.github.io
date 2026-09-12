// Shared keybind helper — loaded first on every templated page (see
// templates/*.js for the load order). Single place for the guards every
// keydown handler needs: modifier keys, text-editing targets, and key
// normalization. Page scripts (photos.js, photo-single.js, plants.js) and
// the global defaults (keybinds.js, loaded last) register via onKey()
// instead of raw addEventListener("keydown").
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

if (typeof module !== "undefined") {
  module.exports = {
    isEditableTarget,
    hasModifier,
    normalizeKey,
    onKey,
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
}
