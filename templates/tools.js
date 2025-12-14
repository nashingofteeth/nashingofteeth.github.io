const base = require("./base.js");
const page = require("./page.js");
const loadCss = require("./partials/css-loader.js");

function tools() {
  const combinedCss = loadCss("base.css", "page.css", "tools.css");

  const mainContent = `<article>
	<p><a href="https://github.com/nashingofteeth/sequitur">video sequencer</a></p>
	<p><a href="/ratio">aspect ratio calculator</a></p>
	<p><a href="http://nash.video/sand">html editor</a></p>
	<p><a href="/mt">metric clock</a></p>
	<p><a href="http://nash.video/bolus-calculator">bolus calculator</a></p>
	<p><a href="/color">random color</a></p>
	<p><a href="/randBet">random number between</a></p>
	<p><a href="/unicode">ascii -> unicode</a></p>
	<p><a href="/charShuff">word shuffler</a></p>
	<p><a href="/charPerms">word permuter</a></p>
</article>`;

  const pageContent = page(mainContent, "&#129520;&nbsp;TOOLS");
  return base(pageContent, "tools - matthew nash", null, combinedCss);
}

module.exports = tools;
