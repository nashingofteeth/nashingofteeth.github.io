const base = require("./base.js");
const page = require("./page.js");
const loadCss = require("./partials/css-loader.js");
const photoArticle = require("./partials/photo-article.js");
const { SITE_TITLE_SUFFIX } = require("./partials/constants.js");

function photoSingle(photo) {
  const combinedCss = loadCss("base.css", "page.css", "photo-single.css");

  const pageContent = page(photoArticle(photo, false), null, {
    showPhotos: true,
  });

  return base(
    pageContent,
    `${photo.title}${SITE_TITLE_SUFFIX}`,
    null,
    combinedCss,
    null,
  );
}

module.exports = photoSingle;
