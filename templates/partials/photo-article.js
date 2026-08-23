const { BASE_URL, PHOTOS_PATH, ORIGINALS_SUBDIR } = require("./constants.js");
const { formatDate, htmlDateString } = require("../utils.js");

/**
 * Generate photo article HTML for gallery or single page
 * @param {Object} photo - Photo object with all metadata
 * @param {boolean} showBookmark - Whether to show link to individual photo page
 * @returns {string} Photo article HTML
 */
function photoArticle(photo, showBookmark = true) {
  const bookmarkLink = showBookmark
    ? `&nbsp;<a href="/photos/${photo.slug}/" class="bookmark" aria-label="Go to photo page" title="Go to photo page">&#128279;</a>`
    : "";

  const imgHtml = `<picture>
        <source srcset="${BASE_URL}${PHOTOS_PATH}${photo.filename}.webp" type="image/webp" />
        <img
          src="${BASE_URL}${PHOTOS_PATH}${photo.filename}.jpg"
          alt="${photo.title}"
          loading="${showBookmark ? "lazy" : "eager"}"
          width="${photo.width}" height="${photo.height}" />
      </picture>`;

  // Sage-green placeholder tint, varied in lightness by the photo's offset so
  // each grid tile gets a subtly different shade. Hue/sat fixed for cohesion.
  const offset = Number(photo.offset) || 0;
  const lightness = (54 + (offset / 30) * 14).toFixed(1);
  const bgTint = `hsl(98, 30%, ${lightness}%)`;
  const w = Number(photo.width) || 0;
  const h = Number(photo.height) || 0;
  const ratio = w > 0 && h > 0 ? `${w} / ${h}` : "1 / 1";
  const ratioNum = w > 0 && h > 0 ? (w / h).toFixed(4) : "1";
  const orientation = w > h ? "landscape" : h > w ? "portrait" : "square";

  if (showBookmark) {
    // Gallery mode — image contained in a square frame. The offset pushes it
    // away from center toward the blank space left by aspect ratio, up to the
    // full blank width (image edge reaches the frame edge). object-position
    // clamps the shift so it can't overrun the frame.
    const magnitude = Math.abs(Number(photo.offset) || 0);
    const sign = Math.sign(Number(photo.offset) || 0) || 1;

    // Center by default; only offset on the axis that has blank space. Emitted
    // as px translate values so the centered image — and its tinted backdrop —
    // shift together.
    let posX = "0px";
    let posY = "0px";

    if (w > 0 && h > 0 && w !== h) {
      const shift = (sign * magnitude).toFixed(1);
      if (w > h) {
        // Landscape — blank on top/bottom, shift vertically
        posY = `${shift}px`;
      } else {
        // Portrait — blank on left/right, shift horizontally
        posX = `${shift}px`;
      }
    }

    const vars = `--pos-x: ${posX}; --pos-y: ${posY}; --bg-tint: ${bgTint}; --ratio: ${ratio}; --ratio-num: ${ratioNum};`;

    return `<article
	class="photo-item is-${orientation}"
	style="${vars}">
	<a href="/photos/${photo.slug}/">
		${imgHtml}
	</a>
</article>`;
  }

  // Single page mode — fixed 4:3 (standard photo ratio) outer box, like single
  // video pages use a fixed 16:9 box, for consistent height across photos.
  // Inside it, .photo-frame is sized with the same width%/padding-top% trick
  // video-article.js uses for .container/.media: both percentages resolve
  // against the *same* reference (the outer box's width), so the frame's
  // rendered box always matches the image's exact aspect ratio — computed
  // purely from metadata, independent of whether the image has loaded. The
  // green (--bg-tint) sits on .photo-media, which is absolutely stretched to
  // fill that frame, so it holds the image's exact footprint before it loads
  // and stays visible if it fails to load — mirroring video's `.media`.
  const Rb = 4 / 3;
  const Ri = w > 0 && h > 0 ? w / h : 1;
  const offFrac = Math.min(1, Math.abs(offset) / 30);

  // Frame width, as a % of the outer box's width. Images narrower than the
  // box (Ri < Rb) are fit by height (75% = the box's own height, since the
  // box's aspect ratio is 4/3); wider images are fit by width (100%).
  const mediaWidth = Ri < Rb ? 75 * Ri : 100;
  // Frame padding-top (the classic aspect-ratio-box hack): since padding-top%
  // resolves against the outer box's width (not the frame's own width), we
  // scale by mediaWidth/Ri so the frame's rendered height/width still equals
  // the image's own h/w ratio exactly.
  const mediaPaddingTop = mediaWidth / Ri;

  // Left edge of the frame, as a % of the outer box's width. blankFrac is the
  // horizontal blank left over when the frame is narrower than the box;
  // offFrac slides that left edge from centered (50% of the blank) rightward.
  let leftEdge = "0%";
  if (Ri < Rb) {
    const blankFrac = 1 - mediaWidth / 100;
    const leftPct = blankFrac * (50 + offFrac * 50);
    leftEdge = `${leftPct.toFixed(2)}%`;
  }

  return `<article class="top-space photo-single is-${orientation}" style="--left-edge: ${leftEdge}; --media-width: ${mediaWidth.toFixed(2)}%; --media-padding-top: ${mediaPaddingTop.toFixed(2)}%; --bg-tint: ${bgTint};">
	<div class="photo-container">
		<div class="photo-frame">
			<div class="photo-media">
				${imgHtml}
			</div>
		</div>
	</div>

	<div class="content">

		<h2>${photo.title}${bookmarkLink}</h2>

		${photo.content}

		<p class="specs">
			<strong>RESOLUTION: </strong>${photo.width}&nbsp;x&nbsp;${photo.height}px
			${photo.camera ? `<br><strong>CAMERA: </strong>${photo.camera}` : ""}
			<br><strong>DATE: </strong><time datetime="${htmlDateString(photo.date)}">${formatDate(photo.date)}</time>
			${photo.plant ? `<br><strong>PLANT: </strong><a href="/plants/?q=${encodeURIComponent(photo.plant)}">${photo.plant}</a>` : ""}
		</p>

		<p class="download">
			<a href="${BASE_URL}${PHOTOS_PATH}${ORIGINALS_SUBDIR}${photo.original}">download original</a>
		</p>
	</div>

</article>`;
}

module.exports = photoArticle;
