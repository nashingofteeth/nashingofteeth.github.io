const metadata = require("../src/_data/metadata.js");

function base(content, title, description, css = null, js = null) {
  return `<!--
This website is a potato (https://potato.cheap/).
Built with custom Node.js static site generator.
Media hosted by Storj (https://storj.io/).
-->
<!doctype html>
<html lang="${metadata.language}">
	<head>
		<meta charset="utf-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<meta name="description" content="${description || metadata.description}">
		<meta name="keywords" content="${metadata.keywords}" >

		<title>${title || metadata.title}</title>

		<link rel="icon" type="image/x-icon" href="/img/favicon.ico">

		<link rel="alternate" href="/feed/feed.xml" type="application/atom+xml" title="${metadata.title}">
		<link rel="alternate" href="/feed/feed.json" type="application/json" title="${metadata.title}">

		<style>${css}</style>
	</head>
	<body>
		${content}

		<script 
      data-goatcounter="https://nashingofteeth.goatcounter.com/count" 
      async src="//gc.zgo.at/count.js"
    ></script>
${js ? `    <script>${js}</script>\n` : ""}	
  </body>
</html>`;
}

module.exports = base;
