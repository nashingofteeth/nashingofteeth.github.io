const fs = require("fs");
const path = require("path");

/**
 * Load and combine multiple JS files
 * @param {...string} jsFileNames - JS file names (with path relative to project root)
 * @returns {string} Combined JS content
 */
function loadJs(...jsFileNames) {
  const jsContents = jsFileNames.map((fileName) => {
    const filePath = path.join(__dirname, "..", "..", fileName);
    return fs.readFileSync(filePath, "utf8");
  });

  return jsContents.join("\n");
}

module.exports = loadJs;
