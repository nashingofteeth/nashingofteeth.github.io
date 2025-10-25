const base = require('./base.js');
const fs = require('fs');
const path = require('path');

function notFound() {
  const baseCss = fs.readFileSync(path.join(__dirname, 'base.css'), 'utf8');
  const notFoundCss = fs.readFileSync(path.join(__dirname, '404.css'), 'utf8');
  const combinedCss = baseCss + '\n' + notFoundCss;

  const content = `<img src="../img/404.jpg"/>
<p><em>You 404'ed it, silly goose.</em></p>`;

  return base(content, '404 - Page not found!', null, combinedCss);
}

module.exports = notFound;
