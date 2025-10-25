const base = require("./base.js");
const fs = require("fs");
const path = require("path");

function home() {
  const baseCss = fs.readFileSync(path.join(__dirname, "base.css"), "utf8");
  const homeCss = fs.readFileSync(path.join(__dirname, "home.css"), "utf8");
  const combinedCss = baseCss + "\n" + homeCss;

  const content = `<picture>
    <source srcset="img/me.webp" type="image/webp" />
    <img fetchpriority="high" src="img/me.jpg" alt="me" />
</picture>
<main>
<h1>matthew nash <em><sup>video&nbsp;artist</sup></em></h1>
<p>&#127758; <strong>portland, oregon</strong></p>
<nav>
    <p>
        <a href="videos">&#128249;&nbsp;videos</a>
        <a href="tools">&#128295;&nbsp;tools</a>
    </p>
</nav>
    <p>
        &#128279;
        <a href="https://github.com/nashingofteeth" title="github">gh</a>
        <a href="https://letterboxd.com/nashingofteeth/" title="letterboxd">lb</a>
        <a href="https://rateyourmusic.com/~nashingofteeth" title="rate your music">rym</a>
        <a href="https://www.instagram.com/nashingofteeth/" title="instagram">ig</a>
    </p>
<p>&#128233; <strong>matthew at nash dot video</strong></p>
</main>`;

  return base(content, null, null, combinedCss);
}

module.exports = home;
