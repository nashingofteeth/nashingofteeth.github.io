const base = require("../base.js");
const page = require("../page.js");
const { SITE_TITLE_SUFFIX } = require("./constants.js");

/**
 * Render a single item page (one photo or one video) into a full HTML document.
 * @param {Object} opts
 * @param {string} opts.title - Item title; becomes the document <title>.
 * @param {string} opts.articleHtml - Rendered article body.
 * @param {Array<{label: string, href: string}>} opts.nav - Section nav for the header.
 * @param {string} opts.css - Combined CSS.
 * @param {string} opts.js - Combined JS (may be empty).
 * @returns {string} Full HTML document.
 */
function singlePage({ title, articleHtml, nav = [], css, js }) {
  const pageContent = page(articleHtml, { nav });
  return base(
    pageContent,
    `${title}${SITE_TITLE_SUFFIX}`,
    null,
    css,
    js,
  );
}

module.exports = singlePage;
