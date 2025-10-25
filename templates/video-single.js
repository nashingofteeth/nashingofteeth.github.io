const base = require("./base.js");
const loadCss = require("./partials/css-loader.js");
const loadJs = require("./partials/js-loader.js");
const header = require("./partials/header.js");
const footer = require("./partials/footer.js");
const videoArticle = require("./partials/video-article.js");

function videoSingle(video) {
  const combinedCss = loadCss("base.css", "page.css", "video-single.css");
  const combinedJs = loadJs("videos.js");

  const pageContent = `<div class="page-wrapper">
${header(null, true)}

<main>
${videoArticle(video, true, "../../img/", false)}
</main>

${footer()}
</div>`;

  return base(
    pageContent,
    `${video.title} - matthew nash`,
    null,
    combinedCss,
    combinedJs,
  );
}

module.exports = videoSingle;
