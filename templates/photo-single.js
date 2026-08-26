const loadCss = require("./partials/css-loader.js");
const loadJs = require("./partials/js-loader.js");
const singlePage = require("./partials/single-page.js");
const photoArticle = require("./partials/photo-article.js");

function photoSingle(photo, prevPhoto = null, nextPhoto = null) {
  const combinedCss = loadCss("base.css", "page.css", "photo-common.css", "photo-single.css");
  // photos.js provides the shared filterByQuery (top-level) for query-scoped nav
  const combinedJs = loadJs("month-utils.js", "search-utils.js", "photos.js", "photo-single.js");

  const navHtml = `<nav class="photo-nav" aria-label="Photo navigation">
		${
      prevPhoto
        ? `<a href="/photos/${prevPhoto.slug}/" class="photo-nav-prev" rel="prev"><span class="up-arrow">&larr;</span>PREV</a>`
        : `<span class="photo-nav-prev disabled" aria-hidden="true"><span class="up-arrow">&larr;</span>PREV</span>`
    }
		${
      nextPhoto
        ? `<a href="/photos/${nextPhoto.slug}/" class="photo-nav-next" rel="next">NEXT<span class="up-arrow up-arrow--right">&rarr;</span></a>`
        : `<span class="photo-nav-next disabled" aria-hidden="true">NEXT<span class="up-arrow up-arrow--right">&rarr;</span></span>`
    }
	</nav>`;

  const articleHtml = photoArticle(photo, false);
  return singlePage({
    title: photo.title,
    articleHtml: `${navHtml}\n${articleHtml}`,
    nav: [{ label: "PHOTOS", href: "/photos" }],
    css: combinedCss,
    js: combinedJs,
  });
}

module.exports = photoSingle;
