const {
  BASE_URL,
  PHOTOS_PATH,
  ORIGINALS_SUBDIR,
  THUMB_SUFFIX,
  PHOTO_OFFSET_RANGE,
  MAX_GALLERY_SHIFT_PX,
  PHOTO_TINT_BASE_LIGHTNESS,
  PHOTO_TINT_RANGE,
} = require("./constants.js");
const { formatDate, htmlDateString, getPhotoSearchFields, photoAsset, bookmarkLink } = require("../utils.js");

/**
 * Generate photo article HTML for gallery or single page
 * @param {Object} photo - Photo object with all metadata
 * @param {boolean} showBookmark - Whether to show link to individual photo page
 * @param {boolean} isFirst - Whether this is the first photo in the gallery (for fetchpriority)
 * @returns {string} Photo article HTML
 */
function photoArticle(photo, showBookmark = true, isFirst = false) {
  const bookmark = showBookmark
    ? bookmarkLink(photo.slug, "photo")
    : "";

  // Sage-green placeholder tint, varied in lightness by the photo's offset so
  // each grid tile gets a subtly different shade. Hue/sat fixed for cohesion.
  // Stored range is -100…+100; see constants.js.
  const offset = Number(photo.offset) || 0;
  const lightness = (
    PHOTO_TINT_BASE_LIGHTNESS +
    (offset / PHOTO_OFFSET_RANGE) * PHOTO_TINT_RANGE
  ).toFixed(1);
  const bgTint = `hsl(98, 30%, ${lightness}%)`;
  const w = Number(photo.width) || 0;
  const h = Number(photo.height) || 0;
  const ratio = w > 0 && h > 0 ? `${w} / ${h}` : "1 / 1";
  const orientation = w > h ? "landscape" : h > w ? "portrait" : "square";
  const plantList = photo.plant ? [].concat(photo.plant).filter(Boolean) : [];
  const altText = plantList.length
    ? plantList.join(", ").replace(/"/g, "&quot;")
    : String(photo.title).replace(/"/g, "&quot;");

  if (showBookmark) {
    // Gallery mode — resolve everything at build time: the <picture> gets an
    // inline aspect-ratio, background, transform and explicit width/height so
    // the front end only does layout, no variable resolution. Offset -100…+100
    // maps to ±MAX_GALLERY_SHIFT_PX px.
    let posX = "0px";
    let posY = "0px";
    if (w > 0 && h > 0 && w !== h) {
      const shiftPx = (
        (offset / PHOTO_OFFSET_RANGE) *
        MAX_GALLERY_SHIFT_PX
      ).toFixed(1);
      if (w > h) {
        posY = `${shiftPx}px`;
      } else {
        posX = `${shiftPx}px`;
      }
    }
    const pictureWidth = orientation === "portrait" ? "auto" : "100%";
    const pictureHeight = orientation === "portrait" ? "100%" : "auto";
    // Desktop (≥577px) loads the small thumbnail variant; mobile keeps the
    // full-size display file (full screen width). Sources are ordered
    // desktop-specific first, then generic full sources as fallback.
    const fetchpriority = isFirst ? "high" : "auto";
    const loading = isFirst ? "eager" : "lazy";
    const imgHtml = `<picture style="box-sizing: border-box; overflow: hidden; aspect-ratio: ${ratio}; background-color: ${bgTint}; transform: translate(${posX}, ${posY}); width: ${pictureWidth}; height: ${pictureHeight}; border: 1px solid #C1440E;">
        <source media="(min-width: 577px)" srcset="${photoAsset(photo, THUMB_SUFFIX, "webp")}" type="image/webp" />
        <source media="(min-width: 577px)" srcset="${photoAsset(photo, THUMB_SUFFIX, "jpg")}" type="image/jpeg" />
        <source srcset="${photoAsset(photo, "", "webp")}" type="image/webp" />
        <img
          src="${photoAsset(photo, "", "jpg")}"
          alt="${altText}"
          fetchpriority="${fetchpriority}"
          loading="${loading}"
          decoding="async"
          width="${photo.width}" height="${photo.height}" />
      </picture>`;

    const searchFields = getPhotoSearchFields(photo);
    const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
    return `<article class="photo-item is-${orientation}" data-slug="${photo.slug}" data-search="${esc(searchFields.search)}" data-y="${searchFields.y}" data-m="${searchFields.m}" data-d="${searchFields.d}">
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
  const offFrac = Math.min(1, Math.abs(offset) / PHOTO_OFFSET_RANGE);

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
  // offFrac + sign slide that left edge from centered (50% of the blank)
  // left (−100) or right (+100).
  let leftEdge = "0%";
  if (Ri < Rb) {
    const blankFrac = 1 - mediaWidth / 100;
    const sign = Math.sign(offset);
    const leftPct = blankFrac * (50 + sign * offFrac * 50);
    leftEdge = `${leftPct.toFixed(2)}%`;
  }

  const imgHtmlSingle = `<picture>
        <source srcset="${photoAsset(photo, "", "webp")}" type="image/webp" />
        <img
          src="${photoAsset(photo, "", "jpg")}"
          alt="${altText}"
          fetchpriority="high"
          loading="eager"
          decoding="async"
          width="${photo.width}" height="${photo.height}" />
      </picture>`;

  return `<article class="top-space photo-single is-${orientation}">
	<div class="photo-container">
		<div class="photo-frame" style="width: ${mediaWidth.toFixed(2)}%; padding-top: ${mediaPaddingTop.toFixed(2)}%; margin-left: ${leftEdge};">
			<div class="photo-media" style="box-sizing: border-box; overflow: hidden; background-color: ${bgTint}; border: 1px solid #C1440E;">
				${imgHtmlSingle}
			</div>
		</div>
	</div>

	<div class="content" style="padding-left: ${leftEdge};">

		${photo.content}

		<p class="specs">
			${(() => {
        if (!plantList.length) return "";
        const plantHtml = plantList
          .map((p) => {
            const isValid =
              photo._validPlantSet &&
              photo._validPlantSet.has(String(p).trim().toLowerCase());
            return isValid
              ? `<span class="search-link" data-href="/plants/?q=${encodeURIComponent(p)}">${p}</span>`
              : p;
          })
          .join(", ");
        return `<strong>PLANT: </strong>${plantHtml}<br>`;
      })()}<strong>DATE: </strong>${(() => {
        const formatted = formatDate(photo.date);
        const key = htmlDateString(photo.date);
        return photo._isDateShared
          ? `<span class="search-link" data-href="/photos/?q=${encodeURIComponent(key)}"><time datetime="${key}">${formatted}</time></span>`
          : `<time datetime="${key}">${formatted}</time>`;
      })()}
			${photo.camera
        ? photo._isCameraShared
          ? `<br><strong>CAMERA: </strong><span class="search-link" data-href="/photos/?q=${encodeURIComponent(photo.camera)}">${photo.camera}</span>`
          : `<br><strong>CAMERA: </strong>${photo.camera}`
        : ""}
			<br><strong>RESOLUTION: </strong>${photo.width}&nbsp;x&nbsp;${photo.height}px
		</p>

		<p class="download">
			<span aria-label="Download">&#128190;</span>
			<a href="${BASE_URL}${PHOTOS_PATH}${ORIGINALS_SUBDIR}${photo.original}">download original</a>
		</p>
	</div>

</article>`;
}

module.exports = photoArticle;
