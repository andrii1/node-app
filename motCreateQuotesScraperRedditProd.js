const { createCanvas, registerFont } = require("canvas");
const { format } = require("date-fns");
const Papa = require("papaparse");
// const fetch = require("node-fetch");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");
require("dotenv").config();
const { apiURL } = require("./utils/apiURL");
const TurndownService = require("turndown");
const AWS = require("aws-sdk");
const { v4: uuidv4 } = require("uuid");
const formatReddit = require("./motScrapeRedditApi");

// const turndownService = new TurndownService();

// // Rule 1: Preserve <FavoritesBar quoteid="3" /> as JSX
// turndownService.addRule("favoritesBarComponent", {
//   filter: function (node) {
//     return (
//       node.nodeType === 1 &&
//       node.tagName === "FAVORITESBAR"
//     );
//   },
//   replacement: function (content, node) {
//     const quoteId = node.getAttribute("quoteid");
//     return `<FavoritesBar quoteId={${quoteId}} />`;
//   },
// });

// // Rule 2: Preserve divs with their class
// turndownService.addRule("divWithClass", {
//   filter: "div",
//   replacement: function (content, node) {
//     const className = node.getAttribute("class");
//     return className
//       ? `<div class="${className}">${content}</div>\n`
//       : `<div>${content}</div>\n`;
//   },
// });

// // Rule 3: Preserve p tags
// turndownService.addRule("preserveParagraphs", {
//   filter: "p",
//   replacement: function (content) {
//     return `<p>${content}</p>`;
//   },
// });

// Register the Norwester font
registerFont("fonts/norwester/norwester.otf", { family: "Norwester" });

// Credentials (from .env)
const USER_UID = process.env.USER_UID_MOT_PROD;
const API_PATH = process.env.API_PATH_MOT_PROD;

const quotesExample = [
  "You are never too old to set another goal ew dream. – C.S. Lewis",
  "The only limit to our r tomorrow is our doubts of today. – Franklin D. Roosevelt",
  "It always seems ’s done. – Nelson Mandela",
];

const quotes = [
  "Success is not final, failure is not fatal: It is the courage to continue that counts. - Winston Churchill",
  "What lies behind us and what lies before us are tiny matters compared to what lies within us. - Ralph Waldo Emerson",
  "Act as if what you do makes a difference. It does. - William James",
  "The only limit to our realization of tomorrow is our doubts of today. - Franklin D. Roosevelt",
  "In the middle of every difficulty lies opportunity. - Albert Einstein",
  "The best way to predict the future is to create it. - Peter Drucker",
  "Your time is limited, so don’t waste it living someone else’s life. - Steve Jobs",
  "It always seems impossible until it's done. - Nelson Mandela",
  "You miss 100% of the shots you don’t take. - Wayne Gretzky",
];

// const tag = "nostalgia";

// const blogUrl = "https://motivately.co/";

// fetch helpers
async function fetchExistingQuotes() {
  const res = await fetch(`${API_PATH}/quotes`);
  return res.json();
}

async function fetchExistingAuthors() {
  const res = await fetch(`${API_PATH}/authors`);
  return res.json();
}

async function fetchExistingTags() {
  const res = await fetch(`${API_PATH}/tags`);
  return res.json();
}

async function insertAuthor(name) {
  const res = await fetch(`${API_PATH}/authors`, {
    method: "POST",
    headers: {
      token: `token ${USER_UID}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ full_name: name }),
  });
  return await res.json(); // assume it returns { id, full_name }
}

async function insertQuote(quoteObj) {
  const res = await fetch(`${API_PATH}/quotes`, {
    method: "POST",
    headers: {
      token: `token ${USER_UID}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(quoteObj),
  });
  return await res.json(); // assume it returns { id, title }
}

async function insertTag(title) {
  const res = await fetch(`${API_PATH}/tags`, {
    method: "POST",
    headers: {
      token: `token ${USER_UID}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title }),
  });
  return await res.json(); // assume it returns { id, full_name }
}

async function insertQuoteToTag(quoteObj, tag) {
  const res = await fetch(`${API_PATH}/quotes?tag=${tag}`, {
    method: "POST",
    headers: {
      token: `token ${USER_UID}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(quoteObj),
  });
  return await res.json(); // assume it returns { id, title }
}

async function updateQuote(quoteId, quoteObj) {
  const res = await fetch(`${API_PATH}/quotes/${quoteId}`, {
    method: "PATCH",
    headers: {
      token: `token ${USER_UID}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(quoteObj),
  });
  if (!res.ok) {
    const errorBody = await res.text(); // <- read text, not json
    console.error(`Failed to update quote (${res.status}):`, errorBody);
    throw new Error(`Failed to update quote: ${res.statusText}`);
  }
  console.log("Updated quote:", quoteObj);
  return await res.json();
}

// Function to get the quote and author
function getQuoteAndAuthor(quote) {
  const match = quote.match(/^(.*?)[\s"”]?[–-]\s*([\w\s.]+)$/);
  if (match) {
    return { text: match[1].trim(), author: match[2].trim() };
  }
  return { text: quote.trim(), author: "Unknown" };
}

const createQuotes = async () => {
  const existingQuotes = await fetchExistingQuotes();
  const existingAuthors = await fetchExistingAuthors();
  // const existingTags = await fetchExistingTags();

  const quoteMap = new Map(
    existingQuotes.map((q) => [q.title.toLowerCase().trim(), q.id])
  );
  const authorMap = new Map(
    existingAuthors.map((a) => [
      a.fullName.toLowerCase().trim(),
      { id: a.id, fullName: a.fullName },
    ])
  );

  // const tagMap = new Map(
  //   existingTags.map((a) => [
  //     a.title.toLowerCase().trim(),
  //     { id: a.id, title: a.title },
  //   ])
  // );

  const quotes = await formatReddit();
  console.log("quotes", quotes);
  for (const quote of quotes) {
    const { text, author } = getQuoteAndAuthor(quote);
    const wordCount = text.trim().split(/\s+/).length;

    // Skip if quote exists
    if (quoteMap.has(text.toLowerCase())) {
      console.log("Duplicate quote skipped:", text);
      continue;
    }

    if (wordCount > 38) {
      console.log("Too big quote skipped:", text);
      continue;
    }

    // Get or insert author
    let authorId;
    let authorFullName;
    const normalizedAuthor = author.toLowerCase().trim();

    if (authorMap.has(normalizedAuthor)) {
      const authorData = authorMap.get(normalizedAuthor);
      authorId = authorData.id;
      authorFullName = authorData.fullName;
    } else {
      const newAuthor = await insertAuthor(author);
      authorId = newAuthor.authorId;
      authorFullName = newAuthor.authorFullName;
      authorMap.set(normalizedAuthor, {
        id: authorId,
        fullName: authorFullName,
      });
    }

    // Get or insert tag
    // let tagId;
    // let tagTitle;
    // if (tag) {
    //   const normalizedTag = tag.toLowerCase().trim();

    //   if (tagMap.has(normalizedTag)) {
    //     const tagData = tagMap.get(normalizedTag);
    //     tagId = tagData.id;
    //     tagTitle = tagData.title;
    //   } else {
    //     const newTag = await insertTag(tag);
    //     tagId = newTag.tagId;
    //     tagTitle = newTag.tagTitle;
    //     tagMap.set(normalizedTag, {
    //       id: tagId,
    //       title: tagTitle,
    //     });
    //   }
    // }

    // New quote
    console.log("Inserting quote:", text);
    const newQuote = await insertQuote({
      title: text,
      author_id: authorId,
      user_id: "1",
    });

    // Skip if quote exists
    if (newQuote.existing) {
      console.log("Duplicate quote skipped:", text);
      continue;
    }
    console.log("Inserted quote:", newQuote);

    // if (tag) {
    //   const newQuoteToTag = await insertQuoteToTag(
    //     {
    //       quote_id: newQuote.quoteId,
    //     },
    //     tagId
    //   );
    //   console.log("Inserted quoteToTag:", newQuoteToTag);
    // }
  }
};

createQuotes().catch(console.error);
