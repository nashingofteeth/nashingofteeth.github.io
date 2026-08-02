const fs = require("fs");
const path = require("path");

const { BASE_URL, TRANSCODES_PATH } = require("./constants.js");

/**
 * Load and combine multiple JS files from src/assets/js/
 * @param {...string} jsFileNames - JS file names (without path)
 * @returns {string} Combined JS content
 *
 * Placeholders like %%BASE_URL%% are replaced with values from constants.js
 * during build so media URLs/paths are defined in a single place.
 */
function loadJs(...jsFileNames) {
  const jsContents = jsFileNames.map((fileName) => {
    const filePath = path.join(__dirname, "..", "..", "src", "assets", "js", fileName);
    return fs
      .readFileSync(filePath, "utf8")
      .replace(/%%BASE_URL%%/g, BASE_URL)
      .replace(/%%TRANSCODES_PATH%%/g, TRANSCODES_PATH);
  });

  return jsContents.join("\n");
}

module.exports = loadJs;
