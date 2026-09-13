const MEDIA_BASE = "%%BASE_URL%%";
const TRANSCODES_PATH = "%%TRANSCODES_PATH%%";

function playerSrc(filename, ext) {
  return `${MEDIA_BASE}${TRANSCODES_PATH}${filename}.${ext}`;
}

function downloadUrl(filename, type) {
  if (type === "lossy") {
    return `${MEDIA_BASE}${TRANSCODES_PATH}${filename}.mp4`;
  }
  return `${MEDIA_BASE}videos/${filename}.mov`;
}

// ---------------------------------------------------------------------------
// YouTube embed control. Iframes never fire DOM play events, so exclusive
// playback needs YouTube's postMessage player protocol (requires enablejsapi
// in the embed URL, added at creation below). Assumed state per embed —
// creation defaults to playing (autoplay=1) — kept honest by onStateChange
// subscriptions once each iframe reports ready.
// ---------------------------------------------------------------------------
const YT_ORIGIN = "https://www.youtube-nocookie.com";
let ytCounter = 0;
const ytPlayers = new Map(); // ytId -> { iframe, playing }

function ytCommand(ytId, func, args = []) {
  const entry = ytPlayers.get(ytId);
  if (!entry) {
    return;
  }
  entry.iframe.contentWindow.postMessage(
    JSON.stringify({ event: "command", func, args, id: ytId }),
    YT_ORIGIN,
  );
}

function pauseAllNative(except) {
  for (const v of document.querySelectorAll("video")) {
    if (v !== except && !v.paused) {
      v.pause();
    }
  }
}

function pauseOtherYouTube(exceptId) {
  for (const [ytId, entry] of ytPlayers) {
    if (ytId !== exceptId && entry.playing) {
      entry.playing = false; // assume the command lands; events correct us
      ytCommand(ytId, "pauseVideo");
    }
  }
}

// Explicit start/stop for tracked embeds. Starting takes over exclusivity
// first (native players included); stopping is a lone command.
function playYouTube(ytId) {
  const entry = ytPlayers.get(ytId);
  if (!entry) {
    return;
  }
  pauseAllNative(null);
  pauseOtherYouTube(ytId);
  entry.playing = true;
  ytCommand(ytId, "playVideo");
}

function pauseYouTube(ytId) {
  const entry = ytPlayers.get(ytId);
  if (!entry) {
    return;
  }
  entry.playing = false;
  ytCommand(ytId, "pauseVideo");
}

// Unified media predicates for SPACE: native state is exact, YouTube state
// is tracked (unknown embeds count as stopped — creation always tracks, and
// a stray playVideo to an already-playing embed is a harmless no-op).
function ytIdOf(el) {
  return el.getAttribute("data-yt-player");
}

function mediaPlaying(el) {
  if (el.tagName === "VIDEO") {
    return !el.paused;
  }
  const entry = ytPlayers.get(ytIdOf(el));
  return entry ? entry.playing : false;
}

function playMedia(el) {
  if (el.tagName === "VIDEO") {
    el.play();
  } else {
    playYouTube(ytIdOf(el));
  }
}

function pauseMedia(el) {
  if (el.tagName === "VIDEO") {
    el.pause();
  } else {
    pauseYouTube(ytIdOf(el));
  }
}

// Inbound YouTube player events. Origin-checked + id-matched; anything else
// (including malformed JSON) is ignored. A remote play reports straight into
// the exclusivity invariant, so YouTube-native controls participate too.
window.addEventListener("message", (e) => {
  if (e.origin !== YT_ORIGIN) {
    return;
  }
  let data = null;
  try {
    data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
  } catch (_err) {
    return;
  }
  if (!data || data.id === undefined) {
    return;
  }
  const entry = ytPlayers.get(data.id);
  if (!entry) {
    return;
  }
  if (data.event === "onReady") {
    ytCommand(data.id, "addEventListener", ["onStateChange"]);
  } else if (
    data.event === "infoDelivery" &&
    data.info &&
    typeof data.info.playerState !== "undefined"
  ) {
    const playing = data.info.playerState === 1;
    entry.playing = playing;
    if (playing) {
      pauseAllNative(null);
      pauseOtherYouTube(data.id);
    }
  }
});

const links = document.querySelectorAll(".container a");

for (const link of links) {
  link.addEventListener("click", function (e) {
    e.preventDefault();

    // Check if this is a YouTube video
    const youtubeId = this.getAttribute("data-youtube-id");

    if (youtubeId) {
      // Create YouTube iframe
      const iframe = document.createElement("iframe");
      const ytId = `yt-player-${++ytCounter}`;

      // enablejsapi wires the postMessage player protocol (see ytPlayers
      // above); origin is runtime-computed since embeds are same-origin-agnostic
      iframe.setAttribute("src", `https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}&widget_referrer=https%3A%2F%2Fnash.video`);
      iframe.setAttribute("id", ytId);
      iframe.setAttribute("data-yt-player", ytId);
      iframe.setAttribute("frameborder", "0");
      iframe.setAttribute("allowfullscreen", "true");
      iframe.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
      iframe.setAttribute("allow", "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share");

      // Track as playing (autoplay=1); the load handshake subscribes to state
      // events from here on. A fresh autoplay embed takes over exclusivity now.
      ytPlayers.set(ytId, { iframe, playing: true });
      iframe.setAttribute("title", mediaTitle());
      iframe.addEventListener("load", () => {
        iframe.contentWindow.postMessage(
          JSON.stringify({ event: "listening", id: ytId }),
          YT_ORIGIN,
        );
      });

      // Replace the link with the iframe
      this.parentElement.replaceChild(iframe, this);
      pauseAllNative(null);
      pauseOtherYouTube(ytId);
      repaintHints();
    } else {
      // Regular video handling for cloud-hosted videos
      const filename = this.getAttribute("data-filename");
      const video = document.createElement("video");
      const videoMp4Src = document.createElement("source");
      const videoWebMSrc = document.createElement("source");

      video.setAttribute("controls", true);
      video.setAttribute("loop", true);
      video.setAttribute("autoplay", true);
      video.setAttribute(
        "width",
        this.firstElementChild.lastElementChild.getAttribute("width"),
      );
      video.setAttribute(
        "height",
        this.firstElementChild.lastElementChild.getAttribute("height"),
      );

      videoMp4Src.setAttribute("type", "video/mp4");
      videoWebMSrc.setAttribute("type", "video/webm");

      videoMp4Src.setAttribute("src", playerSrc(filename, "mp4"));
      videoWebMSrc.setAttribute("src", playerSrc(filename, "webm"));

      video.appendChild(videoWebMSrc);
      video.appendChild(videoMp4Src);
      video.setAttribute("title", mediaTitle());

      this.parentElement.replaceChild(video, this);
      repaintHints();
    }
  });
}

const downloadLinks = document.querySelectorAll(".download .download-btn");

for (const downloadLink of downloadLinks) {
  downloadLink.addEventListener("click", function (e) {
    e.preventDefault();
    const filename = this.getAttribute("data-filename");
    const type = this.getAttribute("data-download");

    // Open in a new tab via a click-generated anchor. window.open() gets
    // blocked by popup blockers; this reliably triggers the download.
    const anchor = document.createElement("a");
    anchor.href = downloadUrl(filename, type);
    anchor.target = "_blank";
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  });
}

// ---------------------------------------------------------------------------
// Keybinds via onKey() (keybind-utils.js, loaded first). Grid-only behaviors
// resolve to no-ops on single-video pages: the grid renders bookmark
// permalinks (showBookmark) and multiple articles, the single page neither.
// Active-video binds (Enter permalink, Space play, F fullscreen, D
// downloads) resolve through firstTopVisibleArticle(), falling back to the
// lone article on single pages. Hint titles are runtime-only (never baked)
// so touch devices never advertise dead keys; the ? overlay renders them.
// ---------------------------------------------------------------------------
function isVideosGrid() {
  const p = window.location.pathname || "/";
  return p === "/videos/" || p === "/videos/index.html";
}

function isVideoSinglePage() {
  return /^\/videos\/[^/]+\/?$/.test(window.location.pathname || "/");
}

// First top-visible article (same eligibility as digit hints). ENTER + SPACE
// both resolve through it so they always act on the same video.
function firstTopVisibleArticle() {
  return Array.from(document.querySelectorAll("main article")).find((a) =>
    isFullyInViewport(a),
  );
}

// Persist grid scroll at departure + restore on Esc returns from singles.
if (isVideosGrid()) {
  trackGridScroll();
}

// j/k snap to the previous/next video instead of the global half-viewport
// scroll (keybinds.js carves the grid out for exactly this reason). Current
// video is the last article whose top edge sits in the viewport's upper half
// (not <= 1: the scroll-margin-top offset leaves a snapped video ~100px down,
// which must still count as current or j recomputes the same target forever).
// j from the page top (description above the fold) lands the first video.
if (isVideosGrid()) {
  onKey(["j", "k"], (e, key) => {
    const articles = Array.from(document.querySelectorAll("main article"));
    if (!articles.length) {
      return;
    }
    const cutoff = window.innerHeight / 2;
    let idx = -1;
    articles.forEach((article, i) => {
      if (article.getBoundingClientRect().top < cutoff) {
        idx = i;
      }
    });
    const next = key === "j"
      ? articles[Math.min(idx + 1, articles.length - 1)]
      : articles[Math.max(idx - 1, 0)];
    if (next) {
      e.preventDefault();
      // Navigating away stops playback — exclusivity means only the video
      // being left can be playing, so pausing all is precisely scoped.
      pauseAllNative(null);
      pauseOtherYouTube(null);
      next.scrollIntoView();
    }
  });

  // Enter opens the permalink of the first top-visible article — the same
  // video SPACE acts on. Skipped on interactive targets so native keyboard
  // activation (focused play/download links) is never hijacked.
  onKey("enter", (e) => {
    if (e.target && e.target.closest && e.target.closest("a, button")) {
      return;
    }
    const article = firstTopVisibleArticle();
    const first = article && article.querySelector("a.bookmark[href]");
    if (first) {
      e.preventDefault();
      window.location.href = first.href;
    }
  });
}

// Enter on a single-video page starts the video — never pauses. If the
// in-page player already exists, play it when paused; otherwise activate the
// play link, which swaps in the autoplaying player (native or YouTube embed).
// Skipped on interactive targets so native keyboard activation (focused
// play/download links) is never hijacked.
if (isVideoSinglePage()) {
  // Clicking the header VIDEOS up-link restores the grid's scroll position,
  // same as Esc (flag-before-navigate). Click bookkeeping, not a keybind, so
  // it also runs on touch devices.
  bindUpNavRestore("/videos/");

  // Esc returns to the grid (global keybinds.js up-nav + scroll restore).
  // Hinted here because the baked header href ("/videos") misses that
  // file's exact-href lookup ("/videos/"). Mirrors photo-single.js.
  if (KEYBINDS_ENABLED) {
    const videosLink = document.querySelector('header a[href^="/videos"]');
    if (videosLink) {
      videosLink.setAttribute("title", "View videos (Esc)");
    }
  }

  onKey("enter", (e) => {
    if (e.target && e.target.closest && e.target.closest("a, button")) {
      return;
    }
    const player = document.querySelector("video");
    if (player) {
      if (player.paused) {
        e.preventDefault();
        player.play();
      }
      return;
    }
    const playLink = document.querySelector(".container .media a[href]");
    if (playLink) {
      e.preventDefault();
      playLink.click();
    }
  });
}

// Only one in-page player at a time, on every path — not just keybinds.
// The play event doesn't bubble, so capture it at the document: whenever any
// native <video> starts (click-created autoplay, native controls, SPACE
// below), pause the rest — including tracked YouTube embeds, which never fire
// DOM play events themselves. Pausing never re-fires play, so this can't loop.
document.addEventListener(
  "play",
  (e) => {
    pauseAllNative(e.target);
    pauseOtherYouTube(null);
  },
  true,
);

// Space always controls the first top-visible article on grid + single pages,
// regardless of focus (only text-editing targets and modifiers opt out via
// the central onKey guard) — the same video ENTER acts on. A player in the
// article toggles, otherwise its cover link starts (exclusivity pauses
// anything playing elsewhere). preventDefault only when handling, so plain
// spacebar-scroll still works with no video UI on screen.
onKey("space", (e) => {
  const article = firstTopVisibleArticle();
  if (!article) {
    return;
  }
  e.preventDefault();
  const player = article.querySelector("video, iframe[data-yt-player]");
  if (player) {
    if (mediaPlaying(player)) {
      pauseMedia(player);
    } else {
      playMedia(player);
    }
    return;
  }
  const playLink = article.querySelector(".container .media a[href]");
  if (playLink) {
    playLink.click();
  }
});

// f toggles fullscreen on the first top-visible article — the same video
// ENTER + SPACE act on. Uninitialized covers initialize first: activating the
// play link swaps in the player synchronously, so the fresh player in the same
// article is fullscreened within the same keydown gesture. Native players
// show their own controls fullscreened; YouTube iframes carry
// allowfullscreen. Keybinds stay live while fullscreened, so f itself exits.
onKey("f", (e) => {
  if (document.fullscreenElement) {
    e.preventDefault();
    document.exitFullscreen();
    return;
  }
  const article = firstTopVisibleArticle();
  if (!article) {
    return;
  }
  e.preventDefault();
  const player = article.querySelector("video, iframe[data-yt-player]");
  if (player) {
    player.requestFullscreen();
    return;
  }
  const playLink = article.querySelector(".container .media a[href]");
  if (playLink) {
    const media = playLink.parentElement; // .media survives the swap
    playLink.click();
    const fresh = media.querySelector("video, iframe");
    if (fresh) {
      fresh.requestFullscreen();
    }
  }
});

// d downloads the active video — lossy (d) or lossless (Shift+D) — via the
// article's download buttons (absent on YouTube videos, where this no-ops).
// onKey normalizes to lowercase, so the Shift variant reads off the event.
onKey("d", (e) => {
  const article = activeVideoArticle();
  if (!article) {
    return;
  }
  const btn = article.querySelector(
    `.download-btn[data-download="${e.shiftKey ? "lossless" : "lossy"}"]`,
  );
  if (btn) {
    e.preventDefault();
    btn.click();
  }
});

// ---------------------------------------------------------------------------
// Keybind hint titles for the ? overlay (keybinds.js): the permalink
// bookmark (Enter), the media cover/player (Space + fullscreen), and the
// download buttons (d lossy / D lossless) of the active video. Runtime-only
// and touch-skipped, mirroring photo-single.js. Grid hints track the
// top-visible article on scroll/resize; the single page has one article, so
// its hints apply once (plus re-hinting after play swaps cover for player).
// ---------------------------------------------------------------------------
function mediaTitle() {
  return isVideoSinglePage() ? "Play (Enter/Space/F)" : "Play (Space/F)";
}

function activeVideoArticle() {
  if (isVideoSinglePage()) {
    return document.querySelector("main article");
  }
  return firstTopVisibleArticle() || null;
}

const savedVideoHintTitles = new WeakMap();
let hintedVideoEls = [];

function hintVideoEl(el, title) {
  if (!el) {
    return;
  }
  if (!savedVideoHintTitles.has(el)) {
    savedVideoHintTitles.set(el, el.getAttribute("title"));
  }
  el.setAttribute("title", title);
  hintedVideoEls.push(el);
}

function refreshVideoHints() {
  if (!KEYBINDS_ENABLED) {
    return;
  }
  const article = activeVideoArticle();
  const next = [];
  if (article) {
    if (isVideosGrid()) {
      const bookmark = article.querySelector("a.bookmark[href]");
      if (bookmark) {
        next.push([bookmark, "Go to video page (Enter)"]);
      }
    }
    const media = article.querySelector(".container .media a[href]") ||
      article.querySelector("video, iframe[data-yt-player]");
    if (media) {
      next.push([media, mediaTitle()]);
    }
    const lossy = article.querySelector('.download-btn[data-download="lossy"]');
    if (lossy) {
      next.push([lossy, "Download lossy (d)"]);
    }
    const lossless = article.querySelector(
      '.download-btn[data-download="lossless"]',
    );
    if (lossless) {
      next.push([lossless, "Download lossless (D)"]);
    }
  }
  // Same active set (the common scroll frame) — skip the restore + rewrite.
  const same = next.length === hintedVideoEls.length &&
    next.every(([el], i) => el === hintedVideoEls[i]);
  if (same) {
    return;
  }
  for (const el of hintedVideoEls) {
    if (savedVideoHintTitles.has(el)) {
      const original = savedVideoHintTitles.get(el);
      if (original) {
        el.setAttribute("title", original);
      } else {
        el.removeAttribute("title");
      }
    }
  }
  hintedVideoEls = [];
  for (const [el, title] of next) {
    hintVideoEl(el, title);
  }
}

// Re-hint (covers cover→player swaps, which fire no scroll event) and ask
// an open ? overlay to repaint. The shared notifier is typeof-guarded so a
// standalone videos.js never throws if keybind-utils.js failed to load.
function repaintHints() {
  refreshVideoHints();
  if (typeof notifyHintsChanged === "function") {
    notifyHintsChanged();
  }
}

if (KEYBINDS_ENABLED) {
  let videoHintsRaf = false;
  const scheduleVideoHints = () => {
    if (videoHintsRaf) {
      return;
    }
    videoHintsRaf = true;
    const raf = window.requestAnimationFrame || ((fn) => setTimeout(fn, 0));
    raf(() => {
      videoHintsRaf = false;
      refreshVideoHints();
    });
  };
  // Scroll/resize ordering vs the overlay's own listeners is safe: this
  // file loads (and registers) before keybinds.js, so titles land first.
  document.addEventListener("scroll", scheduleVideoHints, { passive: true });
  window.addEventListener("resize", scheduleVideoHints);
  refreshVideoHints();
}
