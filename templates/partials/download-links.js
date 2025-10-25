const { STORJ_BASE_URL, STORJ_LOSSLESS_URL } = require("./constants.js");

/**
 * Generate download links HTML for a video
 * @param {Object} video - Video object with youtube_id, slug, and filename
 * @returns {string} Download links HTML (empty string for YouTube videos)
 */
function downloadLinks(video) {
  if (video.youtube_id) {
    return "";
  }

  return `<p class="download">
        <span aria-label="Download">&#128190;</span>
        <a href="${STORJ_BASE_URL}${video.filename}.mp4" target="_blank">lossy</a>
        or
        <a href="${STORJ_LOSSLESS_URL}${video.filename}.mov" target="_blank">lossless</a>
      </p>`;
}

module.exports = downloadLinks;
