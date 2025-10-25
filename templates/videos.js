const base = require("./base.js");
const page = require("./page.js");
const loadCss = require("./partials/css-loader.js");
const loadJs = require("./partials/js-loader.js");
const videoArticle = require("./partials/video-article.js");

function videos(videoCollection) {
  const combinedCss = loadCss("base.css", "page.css", "videos.css");
  const combinedJs = loadJs("videos.js");

  // Sort videos newest first
  const sortedVideos = [...videoCollection].sort(
    (a, b) => new Date(b.date) - new Date(a.date),
  );

  const videosHtml = sortedVideos
    .map((video, index) => {
      const isFirst = index === 0;
      return videoArticle(video, isFirst, true);
    })
    .join("\n");

  const mainContent = `<section class="description">
	<p>All images and sounds shown here were created by me unless otherwise noted. Read my video sequencing code <a href="http://github.com/nashingofteeth/sequitur" target="_blank">here</a>.</p>
	<p><em>Downloading recommended for best experience.</em></p>
</section>

${videosHtml}

<section class="top-space">
    Earlier work can be found <a href="http://youtube.com/hewnash" target="_blank">here</a> and <a href="http://youtube.com/hollowocean" target="_blank">here</a>.
</section>`;

  const pageContent = page(mainContent, "&#128249;&nbsp;VIDEOS");
  return base(
    pageContent,
    "videos - matthew nash",
    null,
    combinedCss,
    combinedJs,
  );
}

module.exports = videos;
