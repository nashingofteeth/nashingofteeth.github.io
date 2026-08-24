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
        ? `<a href="/photos/${prevPhoto.slug}/" class="photo-nav-prev" rel="prev" title="Previous (K)"><span class="up-arrow">&larr;</span>PREV</a>`
        : `<span class="photo-nav-prev disabled" aria-hidden="true"><span class="up-arrow">&larr;</span>PREV</span>`
    }
		${
      nextPhoto
        ? `<a href="/photos/${nextPhoto.slug}/" class="photo-nav-next" rel="next" title="Next (J)">NEXT<span class="up-arrow up-arrow--right">&rarr;</span></a>`
        : `<span class="photo-nav-next disabled" aria-hidden="true">NEXT<span class="up-arrow up-arrow--right">&rarr;</span></span>`
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
