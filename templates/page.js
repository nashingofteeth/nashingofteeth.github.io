const header = require("./partials/header.js");
const footer = require("./partials/footer.js");

function page(content, heading) {
  return `${header(heading, false)}

<main>
${content}
</main>

${footer()}`;
}

module.exports = page;
