const base = require("./base.js");
const page = require("./page.js");
const loadCss = require("./partials/css-loader.js");
const loadJs = require("./partials/js-loader.js");
const { generatePlantList } = require("../src/assets/js/plants.js");
const { formatDate } = require("./utils.js");
const { SITE_TITLE_SUFFIX } = require("./partials/constants.js");

function plants(plantData) {
  const combinedCss = loadCss("base.css", "page.css", "plants.css");
  const combinedJs = loadJs("plants.js");

  // Format the generated date
  const formattedDate = formatDate(plantData.generated);

  const plantListHtml = `<div class="plant-list">
  <ul id="plant-tree">
    ${generatePlantList(plantData.taxonomy)}
  </ul>
</div>`;

  const mainContent = `<section class="description">
  <p>A taxonomical list of plants I've catalogued.</p>
</section>

<div class="plant-search-container">
  <input type="search" id="plant-search" disabled placeholder="🏗️ Loading search\u2026" autocomplete="off">
  <div class="plant-controls">
    <button onclick="collapseAll()">collapse all</button>
    <button onclick="expandAll()">expand all</button>
  </div>
</div>
<noscript>
  <style>#plant-search,.plant-controls,.plant-photo-link{display:none}</style>
  <p class="muted no-js-note">Search requires JavaScript — the full list is shown.</p>
</noscript>

${plantListHtml}

<section class="last-updated muted">
  Last updated: ${formattedDate}
</section>`;

  const pageContent = page(mainContent, { heading: "&#127793;&nbsp;PLANTS" });
  return base(
    pageContent,
    `plants${SITE_TITLE_SUFFIX}`,
    "Taxonomical list of discovered plants",
    combinedCss,
    combinedJs,
  );
}

module.exports = plants;
