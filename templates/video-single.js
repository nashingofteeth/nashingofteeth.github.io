const base = require("./base.js");
const loadCss = require("./partials/css-loader.js");
const header = require("./partials/header.js");
const footer = require("./partials/footer.js");
const videoArticle = require("./partials/video-article.js");

function videoSingle(video) {
  const combinedCss = loadCss("base.css", "page.css", "video-single.css");

  const pageContent = `${header(null, true)}

<main>
${videoArticle(video, true, "../../img/", false)}

<script src="../../js/videos.js"></script>
</main>

${footer()}`;

  return base(pageContent, `${video.title} - matthew nash`, null, combinedCss);
}

module.exports = videoSingle;
