const base = require('./base.js');
const page = require('./page.js');
const fs = require('fs');
const path = require('path');

function tools() {
  const baseCss = fs.readFileSync(path.join(__dirname, 'base.css'), 'utf8');
  const pageCss = fs.readFileSync(path.join(__dirname, 'page.css'), 'utf8');
  const toolsCss = fs.readFileSync(path.join(__dirname, 'tools.css'), 'utf8');
  const combinedCss = baseCss + '\n' + pageCss + '\n' + toolsCss;

  const mainContent = `<article>
	<p><a href="https://github.com/nashingofteeth/sequitur">video sequencer</a></p>
	<p><a href="/ratio">aspect ratio calculator</a></p>
	<p><a href="/sand">html editor</a></p>
	<p><a href="/mt">metric clock</a></p>
	<p><a href="/bolus-calculator">bolus calculator</a></p>
	<p><a href="/color">random color</a></p>
	<p><a href="/randBet">random number between</a></p>
	<p><a href="/unicode">ascii -> unicode</a></p>
	<p><a href="/charShuff">word shuffler</a></p>
	<p><a href="/charPerms">word permuter</a></p>
</article>`;

  const pageContent = page(mainContent, 'TOOLS&nbsp;&#129520;');
  return base(pageContent, 'tool shed - matthew nash', null, combinedCss);
}

module.exports = tools;
