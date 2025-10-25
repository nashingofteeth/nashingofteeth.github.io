const { STORJ_BASE_URL } = require("./constants.js");
const { formatDate, htmlDateString } = require("../utils.js");
const videoThumbnail = require("./video-thumbnail.js");
const downloadLinks = require("./download-links.js");

/**
 * Generate a complete video article HTML
 * @param {Object} video - Video object with all metadata
 * @param {boolean} isFirst - Whether this is the first video (for fetchpriority)
 * @param {string} imgPathPrefix - Path prefix for local images (e.g., "../img/" or "../../img/")
 * @param {boolean} showBookmark - Whether to show the bookmark link to individual page
 * @returns {string} Video article HTML
 */
function videoArticle(
  video,
  isFirst = false,
  imgPathPrefix = "../img/",
  showBookmark = true,
) {
  const aspectRatio = video.height / video.width;
  const paddingTop = aspectRatio * 100;
  const containerWidth = (0.5625 / aspectRatio) * 100;

  const thumbnailHtml = videoThumbnail(video, isFirst, imgPathPrefix);
  const downloadLinksHtml = downloadLinks(video);
  const bookmarkLink = showBookmark
    ? `&nbsp;<a href="/videos/${video.slug}/" class="bookmark" aria-label="Go to video page" title="Go to video page">&#128279;</a>`
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
            : `href="${STORJ_BASE_URL}${video.slug}.mp4"
					data-webm="${STORJ_BASE_URL}${video.slug}.webm"`
        }>
				${thumbnailHtml}
            </a>
	    </div>
	</div>

	<div class="content">

		<h2>${video.title}${bookmarkLink}</h2>

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

	    ${downloadLinksHtml}
	</div>

</article>`;
}

module.exports = videoArticle;
