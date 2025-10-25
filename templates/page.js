function page(content, heading) {
  return `<header>
	<a href="/"><span class="up-arrow">&uarr;</span>HOME</a>
	<h1>${heading}</h1>
</header>

<main>
${content}
</main>

<footer class="top-space">
	<a href="https://potato.cheap/" target="_blank" aria-label="Potato" title="This website is a potato.">&#129364;</a>
</footer>`;
}

module.exports = page;
