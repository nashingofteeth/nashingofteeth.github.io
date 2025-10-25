/**
 * Generate thumbnail HTML for a video
 * @param {Object} video - Video object with youtube_id, slug, and filename
 * @param {boolean} isFirst - Whether this is the first video (for fetchpriority)
 * @returns {string} Thumbnail HTML
 */
function videoThumbnail(video, isFirst = false) {
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
        <source srcset="/img/${video.filename}.webp" type="image/webp" />
        <img
          fetchpriority="${fetchpriority}"
          loading="${loading}"
          src="/img/${video.filename}.jpg"
          alt="${video.title} video cover" />
      </picture>`;
}

module.exports = videoThumbnail;
