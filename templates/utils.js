// Utility functions for templates

function sortNewestFirst(collection) {
  return [...collection].sort(
    (a, b) => new Date(b.date) - new Date(a.date),
  );
}

// Parse a Date object, an ISO timestamp, or a bare YYYY-MM-DD string.
// Bare dates parse as UTC to avoid timezone shifts.
function parseDate(dateInput) {
  if (dateInput instanceof Date) {
    return dateInput;
  }
  const isBareDate = /^\d{4}-\d{2}-\d{2}$/.test(dateInput);
  return isBareDate
    ? new Date(dateInput + "T00:00:00Z")
    : new Date(dateInput);
}

function formatDate(dateInput) {
  const date = parseDate(dateInput);
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return `${months[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
}

function htmlDateString(dateInput) {
  const date = parseDate(dateInput);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

module.exports = {
  sortNewestFirst,
  formatDate,
  htmlDateString,
};
