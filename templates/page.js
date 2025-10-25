const header = require("./partials/header.js");
const footer = require("./partials/footer.js");

function page(content, heading) {
  return `<div class="page-wrapper">
${header(heading, false)}

<main>
${content}
</main>

${footer()}
</div>`;
}

module.exports = page;
