// Month names and abbreviations derived from the locale formatter rather
// than hardcoded, so the long/short forms can't drift. Forcing "en-US"
// makes the output locale-independent. Works at build time (require) and
// in the browser (exposed as globals).

function monthName(index, format) {
  return new Date(Date.UTC(2000, index, 1))
    .toLocaleString("en-US", { month: format, timeZone: "UTC" });
}

const MONTH_NAMES = Array.from({ length: 12 }, (_, i) => monthName(i, "long"));
const MONTH_SHORT = Array.from({ length: 12 }, (_, i) => monthName(i, "short").toLowerCase());
const MONTH_NAMES_LOWER = MONTH_NAMES.map((m) => m.toLowerCase());
const MONTH_ALT = MONTH_SHORT.join("|");

if (typeof module !== "undefined") {
  module.exports = { monthName, MONTH_NAMES, MONTH_NAMES_LOWER, MONTH_SHORT, MONTH_ALT };
}

// Also expose as globals for browser scripts and Node modules that depend on
// them being in the global namespace.
if (typeof globalThis !== "undefined") {
  globalThis.MONTH_NAMES = MONTH_NAMES;
  globalThis.MONTH_NAMES_LOWER = MONTH_NAMES_LOWER;
  globalThis.MONTH_SHORT = MONTH_SHORT;
  globalThis.MONTH_ALT = MONTH_ALT;
}
