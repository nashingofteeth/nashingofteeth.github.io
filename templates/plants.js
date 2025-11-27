const base = require("./base.js");
const page = require("./page.js");
const loadCss = require("./partials/css-loader.js");
const loadJs = require("./partials/js-loader.js");

// Generate HTML list from JSON tree
function generatePlantList(taxonomy, level = 0) {
  let html = "";
  const indent = "  ".repeat(level);

  for (let i = 0; i < taxonomy.length; i++) {
    const node = taxonomy[i];
    const totalChildren = node.children.length + node.otherFiles.length;
    let hasMultipleChildren = totalChildren > 1;

    // If exactly 1 child, check if that child has children (grandchildren exist)
    if (totalChildren === 1 && node.children.length === 1) {
      const singleChild = node.children[0];
      const grandchildrenCount = singleChild.children.length + singleChild.otherFiles.length;
      if (grandchildrenCount > 0) {
        hasMultipleChildren = true;
      }
    }

    // Generate content for this node
    let content = "";
    if (node.file) {
      // Node has a file - create link or plain text
      const displayName = node.name;
      let aliasText = "";
      if (node.file.aliases && node.file.aliases.length > 0) {
        aliasText = ` <span class="aliases">(${node.file.aliases.join(", ")})</span>`;
      }

      if (node.file.wikipedia) {
        content = `<a href="${node.file.wikipedia}" target="_blank">${displayName}</a>${aliasText}`;
      } else {
        content = displayName + aliasText;
      }
    } else {
      // Node has no file - muted text
      content = `<span class="muted">${node.name}</span>`;
    }

    // Create list item - only add toggle if more than 1 child
    if (hasMultipleChildren) {
      html += `${indent}<li class="has-children" onclick="toggleNode(this, event)">${content}</li>\n`;
    } else {
      html += `${indent}<li>${content}</li>\n`;
    }

    // Add other files at this level
    if (node.otherFiles.length > 0) {
      html += `${indent}<ul>\n`;
      for (const file of node.otherFiles) {
        let fileContent = "";
        let aliasText = "";
        if (file.aliases && file.aliases.length > 0) {
          aliasText = ` <span class="aliases">(${file.aliases.join(", ")})</span>`;
        }

        if (file.wikipedia) {
          fileContent = `<a href="${file.wikipedia}" target="_blank">${file.fileName}</a>${aliasText}`;
        } else {
          fileContent = file.fileName + aliasText;
        }

        html += `${indent}  <li>${fileContent}</li>\n`;
      }
      html += `${indent}</ul>\n`;
    }

    // Add children
    if (node.children.length > 0) {
      html += `${indent}<ul>\n`;
      html += generatePlantList(node.children, level + 1);
      html += `${indent}</ul>\n`;
    }
  }

  return html;
}

function plants(plantData) {
  const combinedCss = loadCss("base.css", "page.css", "plants.css");
  const combinedJs = loadJs("plants.js");

  // Format the generated date
  const generatedDate = new Date(plantData.generated);
  const formattedDate = generatedDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const plantListHtml = `<div class="plant-list">
  <ul>
    ${generatePlantList(plantData.taxonomy)}
  </ul>
</div>`;

  const mainContent = `<section class="description">
  <p>A taxonomical list of plants I've discovered and documented.</p>
</section>

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
