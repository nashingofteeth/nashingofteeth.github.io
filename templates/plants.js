const base = require("./base.js");
const page = require("./page.js");
const loadCss = require("./partials/css-loader.js");
const loadJs = require("./partials/js-loader.js");
const { generatePlantList } = require("../src/assets/js/plants.js");

function plants(plantData) {
  const combinedCss = loadCss("base.css", "page.css", "plants.css");
  const combinedJs = loadJs("plants.js");

  // Format the generated date
  const generatedDate = new Date(plantData.generated);
  const formattedDate = generatedDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const plantListHtml = `<div class="plant-list">
  <ul id="plant-tree">
    ${generatePlantList(plantData.taxonomy)}
  </ul>
</div>`;

  const mainContent = `<section class="description">
  <p>A taxonomical list of plants I've discovered and documented.</p>
</section>

<div class="plant-search-container">
  <input type="search" id="plant-search" disabled placeholder="Loading search\u2026" autocomplete="off">
</div>

${plantListHtml}

<section class="last-updated muted">
  Last updated: ${formattedDate}
</section>`;

  const pageContent = page(mainContent, "&#127793;&nbsp;PLANTS");
  return base(
    pageContent,
    "plants - matthew nash",
    "Taxonomical list of discovered plants",
    combinedCss,
    combinedJs,
  );
}

module.exports = plants;
