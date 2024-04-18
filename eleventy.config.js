const { DateTime } = require("luxon");

const pluginRss = require("@11ty/eleventy-plugin-rss");
const pluginBundle = require("@11ty/eleventy-plugin-bundle");
const { EleventyHtmlBasePlugin } = require("@11ty/eleventy");

module.exports = function(eleventyConfig) {

	eleventyConfig.addPassthroughCopy("public");
	eleventyConfig.addPassthroughCopy("tools");
	eleventyConfig.addPassthroughCopy(".htaccess");
	eleventyConfig.addPassthroughCopy("CNAME");

	// Official plugins
	eleventyConfig.addPlugin(pluginRss);
	eleventyConfig.addPlugin(EleventyHtmlBasePlugin);
	eleventyConfig.addPlugin(pluginBundle);

	// Filters
	eleventyConfig.addFilter("readableDate", (dateObj, format, zone) => {
		// Formatting tokens for Luxon: https://moment.github.io/luxon/#/formatting?id=table-of-tokens
		return DateTime.fromJSDate(dateObj, { zone: zone || "utc" }).toFormat(format || "yyyy, LLLL dd");
	});

	eleventyConfig.addFilter('htmlDateString', (dateObj) => {
		// dateObj input: https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#valid-date-string
		return DateTime.fromJSDate(dateObj, {zone: 'utc'}).toFormat('yyyy-LL-dd');
	});

	return {
		templateFormats: [
			"md",
			"njk",
			"html",
		],

		markdownTemplateEngine: "njk",

		htmlTemplateEngine: "njk",

		dir: {
			input: "src",
			includes: "_includes",
			data: "_data",
			output: "dist"
		},

		pathPrefix: "/",
	};
};
