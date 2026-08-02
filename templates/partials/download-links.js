/**
 * Generate download links HTML for a video
 * @param {Object} video - Video object with youtube_id, slug, and filename
 * @returns {string} Download links HTML (empty string for YouTube videos)
 *
 * Media URLs are intentionally NOT embedded in the HTML. They are assembled
 * at click time in src/assets/js/videos.js so crawlers scanning the page
 * source cannot discover and download the underlying files.
 */
function downloadLinks(video) {
  if (video.youtube_id) {
    return "";
  }

  return `<p class="download">
        <span aria-label="Download">&#128190;</span>
        <button type="button" class="download-btn" data-download="lossy" data-filename="${video.filename}">lossy</button>
        or
        <button type="button" class="download-btn" data-download="lossless" data-filename="${video.filename}">lossless</button>
      </p>`;
}

module.exports = downloadLinks;
