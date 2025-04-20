const TurndownService = require("turndown");

const turndownService = new TurndownService();

// Rule 1: Preserve <FavoritesBar quoteid="4" /> as JSX
turndownService.addRule("favoritesBarComponent", {
  filter: function (node) {
    return node.nodeType === 1 && node.tagName === "FAVORITESBAR";
  },
  replacement: function (content, node) {
    const quoteId = node.getAttribute("quoteid");
    return `<FavoritesBar quoteId={${quoteId}} />`;
  },
});

// Rule 2: Preserve <p> tags correctly
turndownService.addRule("preserveParagraphs", {
  filter: "p",
  replacement: function (content) {
    return `<p>${content}</p>`; // Preserve <p> tags correctly
  },
});

// Rule 3: Preserve divs with their class
turndownService.addRule("divWithClass", {
  filter: "div",
  replacement: function (content, node) {
    const className = node.getAttribute("class");
    return className
      ? `<div class="${className}">${content}</div>\n`
      : `<div>${content}</div>\n`;
  },
});

// Test content
const testContent = `
  <div>
    <a href="../quotes/4" target="_blank">
      <img src="4" alt="4" class="image-single-blog" />
    </a>
    <div><FavoritesBar quoteid="4" /></div>
    <div>3</div>
  </div>
`;

const testMarkdown = turndownService.turndown(testContent);
console.log(testMarkdown);
