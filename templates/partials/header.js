/**
 * Generate header HTML
 * @param {string|null} heading - Page heading text (null for single-page style)
 * @param {boolean} showVideosLink - Whether to show VIDEOS link
 * @param {boolean} showPhotosLink - Whether to show PHOTOS link
 * @returns {string} Header HTML
 */
function header(heading = null, showVideosLink = false, showPhotosLink = false) {
  if (showVideosLink || showPhotosLink) {
    // Single-page style header with HOME + section links
    let links = `<a href="/"><span class="up-arrow">&uarr;</span>HOME</a>`;
    if (showVideosLink) {
      links += `\n	<a href="/videos"><span class="up-arrow">&uarr;</span>VIDEOS</a>`;
    }
    if (showPhotosLink) {
      links += `\n	<a href="/photos"><span class="up-arrow">&uarr;</span>PHOTOS</a>`;
    }
    return `<header>${links}</header>`;
  }

  // Standard page header with HOME link and heading
  return `<header>
	<a href="/"><span class="up-arrow">&uarr;</span>HOME</a>
	<h1>${heading}</h1>
</header>`;
}

module.exports = header;
