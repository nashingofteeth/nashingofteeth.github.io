/**
 * Generate header HTML
 * @param {string|null} heading - Page heading text (null to omit)
 * @param {Array<{label: string, href: string}>} nav - Section links
 * @returns {string} Header HTML
 */
function header(heading, nav) {
  const links = nav
    .map(
      (link) =>
        `	<a href="${link.href}"><span class="up-arrow">&uarr;</span>${link.label}</a>`,
    )
    .join("\n");
  const headingHtml = heading ? `\n	<h1>${heading}</h1>` : "";
  return `<header>
${links}${headingHtml}
</header>`;
}

module.exports = header;
