const base = require("./base.js");
const page = require("./page.js");
const loadCss = require("./partials/css-loader.js");
const loadJs = require("./partials/js-loader.js");
const photoArticle = require("./partials/photo-article.js");
const { SITE_TITLE_SUFFIX } = require("./partials/constants.js");

function photoSingle(photo, prevPhoto = null, nextPhoto = null) {
  const combinedCss = loadCss("base.css", "page.css", "photo-common.css", "photo-single.css");
  const combinedJs = loadJs("photo-single.js");

  const navHtml = `<nav class="photo-nav" aria-label="Photo navigation">
		${
      prevPhoto
        ? `<a href="/photos/${prevPhoto.slug}/" class="photo-nav-prev" rel="prev">← prev <span class="photo-nav-hint">(k)</span></a>`
        : `<span class="photo-nav-prev disabled" aria-hidden="true">← prev <span class="photo-nav-hint">(k)</span></span>`
    }
		${
      nextPhoto
        ? `<a href="/photos/${nextPhoto.slug}/" class="photo-nav-next" rel="next">next → <span class="photo-nav-hint">(j)</span></a>`
        : `<span class="photo-nav-next disabled" aria-hidden="true">next → <span class="photo-nav-hint">(j)</span></span>`
    }
	</nav>`;

  const articleHtml = photoArticle(photo, false);
  const pageContent = page(`${navHtml}\n${articleHtml}`, {
    nav: [{ label: "PHOTOS", href: "/photos" }],
  });

  return base(
    pageContent,
    `${photo.title}${SITE_TITLE_SUFFIX}`,
    null,
    combinedCss,
    combinedJs,
  );
}

module.exports = photoSingle;
