const { BASE_URL, PHOTOS_PATH } = require("./constants.js");
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
    // Gallery mode — just the rotated thumbnail linking to the single page
    return `<article
	class="photo-item"
	style="--rotation: ${photo.rotation}deg;">
	<a href="/photos/${photo.slug}/">
		${imgHtml}
	</a>
</article>`;
  }

  // Single page mode — full layout with description, specs, download
  return `<article class="top-space photo-single">
	<div class="photo-wrapper" style="--rotation: ${photo.rotation}deg;">
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
			<a href="${BASE_URL}${PHOTOS_PATH}${photo.original}">download original</a>
		</p>
	</div>

</article>`;
}

module.exports = photoArticle;
