const base = require("./base.js");
const page = require("./page.js");
const { formatDate, htmlDateString } = require("./utils.js");
const fs = require("fs");
const path = require("path");

function videos(videoCollection) {
  const baseCss = fs.readFileSync(path.join(__dirname, "base.css"), "utf8");
  const pageCss = fs.readFileSync(path.join(__dirname, "page.css"), "utf8");
  const videosCss = fs.readFileSync(path.join(__dirname, "videos.css"), "utf8");
  const combinedCss = baseCss + "\n" + pageCss + "\n" + videosCss;

  const storjshareBaseUrl =
    "https://link.storjshare.io/raw/jx2jhmkhn6jlw53upq2dw2t5jomq/nash-video/";
  const storjshareLosslessUrl =
    "https://link.storjshare.io/raw/jvl6tf34ep5hgpycmohsmset4cwq/backups/Projects%2FFilmography%2FMasters/";

  // Sort videos newest first
  const sortedVideos = [...videoCollection].sort(
    (a, b) => new Date(b.date) - new Date(a.date),
  );

  const videosHtml = sortedVideos
    .map((video, index) => {
      const isFirst = index === 0;
      const aspectRatio = video.height / video.width;
      const paddingTop = aspectRatio * 100;
      const containerWidth = (0.5625 / aspectRatio) * 100;

      const thumbnailHtml = video.youtube_id
        ? `<img
          fetchpriority="${isFirst ? "high" : "auto"}"
          loading="${isFirst ? "eager" : "lazy"}"
          src="https://img.youtube.com/vi/${video.youtube_id}/maxresdefault.jpg"
          alt="${video.title} video cover" />`
        : `<picture>
          <source srcset="../img/${video.slug}.webp" type="image/webp" />
          <img
            fetchpriority="${isFirst ? "high" : "auto"}"
            loading="${isFirst ? "eager" : "lazy"}"
            src="../img/${video.slug}.jpg"
            alt="${video.title} video cover" />
        </picture>`;

      const downloadLinks = !video.youtube_id
        ? `<p class="download">
          <span aria-label="Download">&#128190;</span>
          <a href="${storjshareBaseUrl}${video.slug}.mp4" target="_blank">lossy</a>
          or
          <a href="${storjshareLosslessUrl}${video.slug}.mov" target="_blank">lossless</a>
        </p>`
        : "";

      return `<article
    	class="top-space"
  		style="width: ${containerWidth}%; padding-left: ${video.margin_left}%;">
		<div
    		class="container"
            style="padding-top: ${paddingTop}%;">
			<div class="media">
			    <a
					${
            video.youtube_id
              ? `href="https://www.youtube.com/watch?v=${video.youtube_id}"
					    data-youtube-id="${video.youtube_id}"`
              : `href="${storjshareBaseUrl}${video.slug}.mp4"
    					data-webm="${storjshareBaseUrl}${video.slug}.webm"`
          }>
					${thumbnailHtml}
                </a>
		    </div>
		</div>

		<div class="content">

			<h2>${video.title}&nbsp;<a href="/videos/${video.slug}/" class="bookmark" aria-label="Go to video page" title="Go to video page">&#128279;</a></h2>

			${video.content}

			<p class="specs">
				<strong>DURATION: </strong>${video.runtime} at ${video.frame_rate}fps
				<br>
				<strong>RESOLUTION: </strong>${video.width}&nbsp;x&nbsp;${video.height}px
				<br>
				<strong>CAMERA: </strong>${video.camera}
				<br>
			    <strong>DATE: </strong><time datetime="${htmlDateString(video.date)}">${formatDate(video.date)}</time>
			</p>

		    ${downloadLinks}
		</div>

	</article>`;
    })
    .join("\n");

  const mainContent = `<section class="description">
	<p>All images and sounds shown here were created by me unless otherwise noted. Read my video sequencing code <a href="http://github.com/nashingofteeth/sequitur" target="_blank">here</a>.</p>
	<p><em>Downloading recommended for best experience.</em></p>
</section>

${videosHtml}

<section class="top-space">
    Earlier work can be found <a href="http://youtube.com/hewnash" target="_blank">here</a> and <a href="http://youtube.com/hollowocean" target="_blank">here</a>.
</section>

<script src="../js/videos.js"></script>`;

  const pageContent = page(mainContent, "&#128249;&nbsp;VIDEOS");
  return base(pageContent, "videos - matthew nash", null, combinedCss);
}

module.exports = videos;
