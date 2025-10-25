/**
 * Generate thumbnail HTML for a video
 * @param {Object} video - Video object with youtube_id and slug
 * @param {boolean} isFirst - Whether this is the first video (for fetchpriority)
 * @param {string} imgPathPrefix - Path prefix for local images (e.g., "../img/" or "../../img/")
 * @returns {string} Thumbnail HTML
 */
function videoThumbnail(video, isFirst = false, imgPathPrefix = "../img/") {
  const fetchpriority = isFirst ? "high" : "auto";
  const loading = isFirst ? "eager" : "lazy";

  if (video.youtube_id) {
    return `<img
        fetchpriority="${fetchpriority}"
        loading="${loading}"
        src="https://img.youtube.com/vi/${video.youtube_id}/maxresdefault.jpg"
        alt="${video.title} video cover" />`;
  }

  return `<picture>
        <source srcset="${imgPathPrefix}${video.slug}.webp" type="image/webp" />
        <img
          fetchpriority="${fetchpriority}"
          loading="${loading}"
          src="${imgPathPrefix}${video.slug}.jpg"
          alt="${video.title} video cover" />
      </picture>`;
}

module.exports = videoThumbnail;
