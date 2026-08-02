const { BASE_URL, PHOTOS_PATH, ORIGINALS_SUBDIR } = require("./constants.js");
const { formatDate, htmlDateString } = require("../utils.js");

/**
 * Generate photo article HTML for gallery or single page
 * @param {Object} photo - Photo object with all metadata
 * @param {boolean} showBookmark - Whether to show link to individual photo page
 * @returns {string} Photo article HTML
 */
function photoArticle(photo, showBookmark = true) {
  const bookmarkLink = showBookmark
    ? `&nbsp;<a href="/photos/${photo.slug}/" class="bookmark" aria-label="Go to photo page" title="Go to photo page">&#128279;</a>`
    : "";

  const imgHtml = `<picture>
        <source srcset="${BASE_URL}${PHOTOS_PATH}${photo.filename}.webp" type="image/webp" />
        <img
          src="${BASE_URL}${PHOTOS_PATH}${photo.filename}.jpg"
          alt="${photo.title}"
          loading="${showBookmark ? "lazy" : "eager"}"
          width="${photo.width}" height="${photo.height}" />
      </picture>`;

  if (showBookmark) {
    // Gallery mode — image contained in a square frame. The offset pushes it
    // away from center toward the blank space left by aspect ratio, up to the
    // full blank width (image edge reaches the frame edge). object-position
    // clamps the shift so it can't overrun the frame.
    const w = Number(photo.width) || 0;
    const h = Number(photo.height) || 0;
    const magnitude = Math.abs(Number(photo.offset) || 0);
    const sign = Math.sign(Number(photo.offset) || 0) || 1;

    // Center by default; only offset on the axis that has blank space.
    let posX = "center";
    let posY = "center";

    if (w > 0 && h > 0 && w !== h) {
      const shift = (sign * magnitude).toFixed(1);
      if (w > h) {
        // Landscape — blank on top/bottom, shift vertically
        posY = `calc(50% + ${shift}px)`;
      } else {
        // Portrait — blank on left/right, shift horizontally
        posX = `calc(50% + ${shift}px)`;
      }
    }

    const vars = `--pos-x: ${posX}; --pos-y: ${posY};`;

    return `<article
	class="photo-item"
	style="${vars}">
	<a href="/photos/${photo.slug}/">
		${imgHtml}
	</a>
</article>`;
  }

  // Single page mode — full layout with description, specs, download
  return `<article class="top-space photo-single">
	<div class="photo-wrapper">
		${imgHtml}
	</div>

	<div class="content">

		<h2>${photo.title}${bookmarkLink}</h2>

		${photo.content}

		<p class="specs">
			<strong>RESOLUTION: </strong>${photo.width}&nbsp;x&nbsp;${photo.height}px
			${photo.camera ? `<br><strong>CAMERA: </strong>${photo.camera}` : ""}
			<br><strong>DATE: </strong><time datetime="${htmlDateString(photo.date)}">${formatDate(photo.date)}</time>
			${photo.plant ? `<br><strong>PLANT: </strong><a href="/plants/?q=${encodeURIComponent(photo.plant)}">${photo.plant}</a>` : ""}
		</p>

		<p class="download">
			<a href="${BASE_URL}${PHOTOS_PATH}${ORIGINALS_SUBDIR}${photo.original}">download original</a>
		</p>
	</div>

</article>`;
}

module.exports = photoArticle;
