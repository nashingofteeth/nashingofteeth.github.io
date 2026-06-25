const base = require("./base.js");
const page = require("./page.js");
const loadCss = require("./partials/css-loader.js");
const photoArticle = require("./partials/photo-article.js");
const { SITE_TITLE_SUFFIX } = require("./partials/constants.js");

function photos(photoCollection) {
  const combinedCss = loadCss("base.css", "page.css", "photos.css");

  // Sort photos newest first
  const sortedPhotos = [...photoCollection].sort(
    (a, b) => new Date(b.date) - new Date(a.date),
  );

  const photosHtml = sortedPhotos
    .map((photo) => photoArticle(photo, true))
    .join("\n");

  const mainContent = `<section class="description">
	<p>Photography by me.</p>
</section>

<section class="photo-grid">
${photosHtml}
</section>`;

  const pageContent = page(mainContent, "&#128247;&nbsp;PHOTOS");
  return base(
    pageContent,
    `photos${SITE_TITLE_SUFFIX}`,
    null,
    combinedCss,
    null,
  );
}

module.exports = photos;
