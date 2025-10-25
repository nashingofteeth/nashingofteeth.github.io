const fs = require("fs");
const path = require("path");

/**
 * Load and combine multiple CSS files from public/css/
 * @param {...string} cssFileNames - CSS file names (without path)
 * @returns {string} Combined CSS content
 */
function loadCss(...cssFileNames) {
  const cssContents = cssFileNames.map((fileName) => {
    const filePath = path.join(__dirname, "..", "..", "public", "css", fileName);
    return fs.readFileSync(filePath, "utf8");
  });

  return cssContents.join("\n");
}

module.exports = loadCss;
