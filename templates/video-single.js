const loadCss = require("./partials/css-loader.js");
const loadJs = require("./partials/js-loader.js");
const singlePage = require("./partials/single-page.js");
const videoArticle = require("./partials/video-article.js");

function videoSingle(video) {
  const combinedCss = loadCss("base.css", "page.css", "video-common.css", "video-single.css");
  const combinedJs = loadJs("videos.js");

  return singlePage({
    title: video.title,
    articleHtml: videoArticle(video, true, false),
    nav: [{ label: "VIDEOS", href: "/videos" }],
    css: combinedCss,
    js: combinedJs,
  });
}

module.exports = videoSingle;
