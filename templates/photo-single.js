const base = require("./base.js");
const loadCss = require("./partials/css-loader.js");
const header = require("./partials/header.js");
const footer = require("./partials/footer.js");
const photoArticle = require("./partials/photo-article.js");
const { SITE_TITLE_SUFFIX } = require("./partials/constants.js");

function photoSingle(photo) {
  const combinedCss = loadCss("base.css", "page.css", "photo-single.css");

  const pageContent = `<div class="page-wrapper">
${header(null, false, true)}

<main>
${photoArticle(photo, false)}
</main>

${footer()}
</div>`;

  return base(
    pageContent,
    `${photo.title}${SITE_TITLE_SUFFIX}`,
    null,
    combinedCss,
    null,
  );
}

module.exports = photoSingle;
