// Utility functions for templates

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

function formatDate(dateInput) {
  // Handle both Date objects and strings
  let date;
  if (dateInput instanceof Date) {
    date = dateInput;
  } else {
    // Parse as UTC to avoid timezone issues with YYYY-MM-DD format
    date = new Date(dateInput + 'T00:00:00Z');
  }
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];
  return `${months[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
}

function htmlDateString(dateInput) {
  // Handle both Date objects and strings
  let date;
  if (dateInput instanceof Date) {
    date = dateInput;
  } else {
    // Parse as UTC to avoid timezone issues with YYYY-MM-DD format
    date = new Date(dateInput + 'T00:00:00Z');
  }
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

module.exports = {
  escapeHtml,
  formatDate,
  htmlDateString
};
