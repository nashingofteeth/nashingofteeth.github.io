/**
 * Generate header HTML
 * @param {string|null} heading - Page heading text (null for video-single style)
 * @param {boolean} showVideosLink - Whether to show VIDEOS link (for video-single pages)
 * @returns {string} Header HTML
 */
function header(heading = null, showVideosLink = false) {
  if (showVideosLink) {
    // Video-single style header with both HOME and VIDEOS links
    return `<header>
	<a href="/"><span class="up-arrow">&uarr;</span>HOME</a>
	<a href="/videos"><span class="up-arrow">&uarr;</span>VIDEOS</a>
</header>`;
  }

  // Standard page header with HOME link and heading
  return `<header>
	<a href="/"><span class="up-arrow">&uarr;</span>HOME</a>
	<h1>${heading}</h1>
</header>`;
}

module.exports = header;
