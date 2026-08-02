const header = require("./partials/header.js");
const footer = require("./partials/footer.js");

function page(content, heading, { showVideos = false, showPhotos = false } = {}) {
  return `<div class="page-wrapper">
${header(heading, showVideos, showPhotos)}

<main>
${content}
</main>

${footer()}
</div>`;
}

module.exports = page;
