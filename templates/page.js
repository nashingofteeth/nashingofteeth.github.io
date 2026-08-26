const header = require("./partials/header.js");
const footer = require("./partials/footer.js");

const HOME_LINK = { label: "HOME", href: "/" };

function page(content, { heading = null, nav = [] } = {}) {
  const fullNav = [HOME_LINK, ...nav];

  return `<div class="page-wrapper">
${header(heading, fullNav)}

<main>
${content}
</main>

${footer()}
</div>`;
}

module.exports = page;
