const base = require("./base.js");
const loadCss = require("./partials/css-loader.js");

function notFound() {
  const combinedCss = loadCss("base.css", "404.css");

  const content = `<img src="../img/404.jpg"/>
<p><em>You 404'ed it, silly goose.</em></p>`;

  return base(content, "404 - Page not found!", null, combinedCss);
}

module.exports = notFound;
