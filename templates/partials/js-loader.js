const fs = require("fs");
const path = require("path");

/**
 * Load and combine multiple JS files from src/assets/js/
 * @param {...string} jsFileNames - JS file names (without path)
 * @returns {string} Combined JS content
 */
function loadJs(...jsFileNames) {
  const jsContents = jsFileNames.map((fileName) => {
    const filePath = path.join(__dirname, "..", "..", "src", "assets", "js", fileName);
    return fs.readFileSync(filePath, "utf8");
  });

  return jsContents.join("\n");
}

module.exports = loadJs;
