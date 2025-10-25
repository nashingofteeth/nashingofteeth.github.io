const base = require("./base.js");
const { formatDate, htmlDateString } = require("./utils.js");
const fs = require("fs");
const path = require("path");

function videoSingle(video) {
  const baseCss = fs.readFileSync(path.join(__dirname, "base.css"), "utf8");
  const pageCss = fs.readFileSync(path.join(__dirname, "page.css"), "utf8");
  const videoSingleCss = fs.readFileSync(
    path.join(__dirname, "video-single.css"),
    "utf8",
  );
  const combinedCss = baseCss + "\n" + pageCss + "\n" + videoSingleCss;

  const storjshareBaseUrl =
    "https://link.storjshare.io/raw/jx2jhmkhn6jlw53upq2dw2t5jomq/nash-video/";
  const storjshareLosslessUrl =
    "https://link.storjshare.io/raw/jvl6tf34ep5hgpycmohsmset4cwq/backups/Projects%2FFilmography%2FMasters/";

  const aspectRatio = video.height / video.width;
  const paddingTop = aspectRatio * 100;
  const containerWidth = (0.5625 / aspectRatio) * 100;

  const thumbnailHtml = video.youtube_id
    ? `<img
        fetchpriority="high"
        loading="eager"
        src="https://img.youtube.com/vi/${video.youtube_id}/maxresdefault.jpg"
        alt="${video.title} video cover" />`
    : `<picture>
        <source srcset="../../img/${video.slug}.webp" type="image/webp" />
        <img
          fetchpriority="high"
          loading="eager"
          src="../../img/${video.slug}.jpg"
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

  const pageContent = `<header>
	<a href="/"><span class="up-arrow">&uarr;</span>HOME</a>
	<a href="/videos"><span class="up-arrow">&uarr;</span>VIDEOS</a>
</header>

<main>
<article
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

		<h2>${video.title}</h2>

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

</article>

<script src="../../js/videos.js"></script>
</main>

<footer class="top-space">
	<a href="https://potato.cheap/" target="_blank" aria-label="Potato" title="This website is a potato.">&#129364;</a>
</footer>`;

  return base(pageContent, `${video.title} - matthew nash`, null, combinedCss);
}

module.exports = videoSingle;
