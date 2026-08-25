const base = require("./base.js");
const page = require("./page.js");
const loadCss = require("./partials/css-loader.js");
const loadJs = require("./partials/js-loader.js");
const photoArticle = require("./partials/photo-article.js");
const { sortNewestFirst } = require("./utils.js");
const { SITE_TITLE_SUFFIX } = require("./partials/constants.js");

function photos(photoCollection) {
  const combinedCss = loadCss("base.css", "page.css", "photo-common.css", "photos.css");
  const combinedJs = loadJs("photos.js");

  // Sort photos newest first
  const sortedPhotos = sortNewestFirst(photoCollection);

  const photosHtml = sortedPhotos
    .map((photo) => photoArticle(photo, true))
    .join("\n");

  const mainContent = `<section class="description">
	<p>Photography by me.</p>
</section>

<div class="photo-search-container">
	<input type="search" id="photo-search" disabled placeholder="🏗️ Loading search…" autocomplete="off">
</div>

<div id="photo-no-results" hidden class="muted">No results.</div>

<section id="photo-grid" class="photo-grid top-space">
${photosHtml}
</section>`;

  const pageContent = page(mainContent, { heading: "&#128247;&nbsp;PHOTOS" });
  return base(
    pageContent,
    `photos${SITE_TITLE_SUFFIX}`,
    null,
    combinedCss,
    combinedJs,
  );
}

module.exports = photos;
