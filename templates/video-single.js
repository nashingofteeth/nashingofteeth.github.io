const base = require("./base.js");
const page = require("./page.js");
const loadCss = require("./partials/css-loader.js");
const loadJs = require("./partials/js-loader.js");
const videoArticle = require("./partials/video-article.js");
const { SITE_TITLE_SUFFIX } = require("./partials/constants.js");

function videoSingle(video) {
  const combinedCss = loadCss("base.css", "page.css", "video-common.css", "video-single.css");
  const combinedJs = loadJs("videos.js");

  const pageContent = page(videoArticle(video, true, false), {
    nav: [{ label: "VIDEOS", href: "/videos" }],
  });

  return base(
    pageContent,
    `${video.title}${SITE_TITLE_SUFFIX}`,
    null,
    combinedCss,
    combinedJs,
  );
}

module.exports = videoSingle;
