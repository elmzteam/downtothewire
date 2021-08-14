const { parse } = require("node-html-parser");
const md = require("./markdown");

const parseSummary = (markdown) => {
    const html = md.render(markdown);
    const root = parse(html);
    const imageElements = root.querySelectorAll("img");

    const images = imageElements.map((img) => img.getAttribute("src")).filter((src) => !!src);
    const description = root.structuredText.split(/\^{3,}/)[0];

    return {
        images,
        description,
    };
}


module.exports = {
    parseSummary,
}