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

const turndownService = new TurndownService();

turndownService.addRule("divWithClass", {
  filter: "div",
  replacement: function (content, node) {
    const className = node.getAttribute("class");
    return className
      ? `<div class="${className}">${content}</div>\n`
      : `<div>${content}</div>\n`;
  },
});

// Register the Norwester font
registerFont("fonts/norwester/norwester.otf", { family: "Norwester" });

// Credentials (from .env)
const USER_UID = process.env.USER_UID;
const LOCALHOST_API_PATH = process.env.LOCALHOST_API_PATH;


const blog = {
  title: "You didn't love her grey's anatomy",
  content: `
“You didn't love her! You just didn't want to be alone. Or maybe, maybe she was good for your ego. Or, or maybe she made you feel better about your miserable life, but you didn't love her, because you don't destroy the person that you love!”
— Dr. Callie Torres, Grey's Anatomy, Grey's Anatomy Season 4: The Heart of the Matter

##About the author

This page was created by our editorial team. Each page is manually curated, researched, collected, and issued by our staff writers. Quotes contained on this page have been double checked for their citations, their accuracy and the impact it will have on our readers.

Kelly Peacock is an accomplished poet and social media expert based in Brooklyn, New York. Kelly has a Bachelor's degree in creative writing from Farieligh Dickinson University and has contributed to many literary and cultural publications. Kelly assists on a wide variety of quote inputting and social media functions for Quote Catalog. Visit her personal website here.

Kendra Syrdal is a writer, editor, partner, and senior publisher for The Thought & Expression Company. Over the last few years she has been personally responsible for writing, editing, and producing over 30+ million pageviews on Thought Catalog.
`,
};




// markdown
function convertContentToMarkdown(content) {
  if (!content) return "";

  const urlRegex = /(https?:\/\/[^\s]+)/g;

  return content
    .trim()
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();

      if (!trimmed) return ""; // blank line → paragraph break

      // Headings (lines in ALL CAPS or start with ###)
      if (/^#{2,3}\s/.test(trimmed)) {
        return trimmed;
      } else if (/^[A-Z\s\d]+$/.test(trimmed) && trimmed.length < 100) {
        return `## ${trimmed}`;
      }

      // Bullet points
      if (/^[-*•]\s+/.test(trimmed)) {
        return `- ${trimmed.replace(/^[-*•]\s+/, "")}`;
      }

      // Blockquotes
      if (/^>\s+/.test(trimmed)) {
        return `> ${trimmed.replace(/^>\s+/, "")}`;
      }

      // Convert plain URLs to [text](url)
      let lineWithLinks = trimmed.replace(urlRegex, (url) => {
        const display = url.replace(/^https?:\/\//, "").replace(/\/$/, "");
        return `[${display}](${url})`;
      });

      // Auto-link keywords
      // for (const [keyword, url] of Object.entries(keywordLinks)) {
      //   const keywordRegex = new RegExp(`\\b(${keyword})\\b`, "gi");
      //   lineWithLinks = lineWithLinks.replace(keywordRegex, `[$1](${url})`);
      // }

      return lineWithLinks;
    })
    .join("\n\n");
}


// Define the async function to create a post

const createPost = async (postDataParam) => {
  try {
    const response = await fetch(`${LOCALHOST_API_PATH}/blogs`, {
      method: "POST",
      headers: {
        token: `token ${USER_UID}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(postDataParam),
    });

    // Check if the response is OK (status code 200-299)
    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }

    // Parse the JSON response
    const data = await response.json();
    console.log("Post created successfully:", data);
  } catch (error) {
    console.error("Error creating post:", error);
  }
};

// Function to create blogs

const markdownContent = convertContentToMarkdown(blog.content);

const postData = {
  title: blog.title,
  content: markdownContent,
  status: "published",
  user_id: "1",
};

createPost(postData);
