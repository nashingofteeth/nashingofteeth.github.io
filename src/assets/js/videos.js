const MEDIA_BASE = "https://f004.backblazeb2.com/file/nash-potato/";
const TRANSCODES_PATH = "videos/transcodes/";

function playerSrc(filename, ext) {
  return `${MEDIA_BASE}${TRANSCODES_PATH}${filename}.${ext}`;
}

function downloadUrl(filename, type) {
  if (type === "lossy") {
    return `${MEDIA_BASE}${TRANSCODES_PATH}${filename}.mp4`;
  }
  return `${MEDIA_BASE}videos/${filename}.mov`;
}

const links = document.querySelectorAll(".container a");

for (const link of links) {
  link.addEventListener("click", function (e) {
    e.preventDefault();

    // Check if this is a YouTube video
    const youtubeId = this.getAttribute("data-youtube-id");

    if (youtubeId) {
      // Create YouTube iframe
      const iframe = document.createElement("iframe");

      // Set YouTube iframe attributes
      iframe.setAttribute("src", `https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&widget_referrer=https%3A%2F%2Fnash.video`);
      iframe.setAttribute("frameborder", "0");
      iframe.setAttribute("allowfullscreen", "true");
      iframe.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
      iframe.setAttribute("allow", "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share");

      // Replace the link with the iframe
      this.parentElement.replaceChild(iframe, this);
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

      this.parentElement.replaceChild(video, this);
    }
  });
}

const downloadLinks = document.querySelectorAll(".download .download-btn");

for (const downloadLink of downloadLinks) {
  downloadLink.addEventListener("click", function (e) {
    e.preventDefault();
    const filename = this.getAttribute("data-filename");
    const type = this.getAttribute("data-download");
    window.open(downloadUrl(filename, type), "_blank", "noopener");
  });
}