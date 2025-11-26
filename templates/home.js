const base = require("./base.js");
const loadCss = require("./partials/css-loader.js");

function home() {
  const combinedCss = loadCss("base.css", "home.css");

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
        <a href="plants">&#127793;&nbsp;plants</a>
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
