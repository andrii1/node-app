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
const USER_UID = process.env.USER_UID;
const API_PATH = process.env.PROD_API_PATH;

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const quotesExample = [
  "You are never too old to set another goal ew dream. – C.S. Lewis",
  "The only limit to our r tomorrow is our doubts of today. – Franklin D. Roosevelt",
  "It always seems ’s done. – Nelson Mandela",
];

const blogTitleExample = "3 inspirational quotes - best collection";

const quotes = [
  "Can we start over? Can we be strangers again? Let me introduce myself. We can laugh and talk and relearn what we already know and come up with new inside jokes and create new memories and give each other a second chance. – e.l.",
  "I remember when you meant nothing to me. I wasn't aware of your existence, but now you're the reason I have these awful bags under my eyes; I stay up till 4AM thinking about you. It's bizarre how a person could mean nothing to you but in a matter of hours, days, weeks, or months, they could mean the world to you—even if they make your heart drown in a sea of regret and leave a hurricane of bittersweet memories behind. – A.E.",
  "I wish we could go back in time. To before it all went wrong. When we were pointlessly flirting, and joking around. Before I fell for you. Before we broke each other's hearts.",
  "Some nights I wish I could go back in life. Not to change shit, just to feel a couple things twice. – Drake, 6PM In New York",
  "Looking back at our old chats, holding back tears.",
  "I wish we could go back to how we used to be. I miss that.",
  "Everything was simple.",
  "Let's go somewhere and never come back.",
  "I really wish I could turn back time and take back the hurt I have inflicted on you. And show you how much you mean to me. And how I do truly love you.",
  "If I could turn back time, I would do it—just to see you again. – ST",
];


const blogTitle = "I wish i could go back to those days quotes";

const tag = "nostalgia";

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

////// fs helpers

function getUniqueFolderName(baseFolderPath) {
  let folderPath = baseFolderPath;
  let counter = 1;

  // Check if the folder exists and if so, create a unique name
  while (fs.existsSync(folderPath)) {
    folderPath = `${baseFolderPath}(${counter})`;
    counter++;
  }

  return folderPath;
}

const dedupeQuotesAndAuthors = async (quotesParam) => {
  const existingQuotes = await fetchExistingQuotes();
  const existingAuthors = await fetchExistingAuthors();
  const existingTags = await fetchExistingTags();

  const quoteMap = new Map(
    existingQuotes.map((q) => [q.title.toLowerCase().trim(), q.id])
  );
  const authorMap = new Map(
    existingAuthors.map((a) => [
      a.fullName.toLowerCase().trim(),
      { id: a.id, fullName: a.fullName },
    ])
  );

  const tagMap = new Map(
    existingTags.map((a) => [
      a.title.toLowerCase().trim(),
      { id: a.id, title: a.title },
    ])
  );

  const insertedQuotes = [];

  for (const quote of quotesParam) {
    const { text, author } = getQuoteAndAuthor(quote);

    // Skip if quote exists
    if (quoteMap.has(text.toLowerCase())) {
      console.log("Duplicate quote skipped:", text);
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
    let tagId;
    let tagTitle;
    if (tag) {
      const normalizedTag = tag.toLowerCase().trim();

      if (tagMap.has(normalizedTag)) {
        const tagData = tagMap.get(normalizedTag);
        tagId = tagData.id;
        tagTitle = tagData.title;
      } else {
        const newTag = await insertTag(tag);
        tagId = newTag.tagId;
        tagTitle = newTag.tagTitle;
        tagMap.set(normalizedTag, {
          id: tagId,
          title: tagTitle,
        });
      }
    }

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

    if (tag) {
      const newQuoteToTag = await insertQuoteToTag(
        {
          quote_id: newQuote.quoteId,
        },
        tagId
      );
      console.log("Inserted quoteToTag:", newQuoteToTag);
    }

    insertedQuotes.push({
      id: newQuote.quoteId,
      title: text,
      author: authorFullName,
    });
  }

  return insertedQuotes;
};

// Function to upload image to S3
// Upload to AWS S3
async function uploadToS3(imagePath, filename) {
  const fileContent = fs.readFileSync(imagePath);
  const s3 = new AWS.S3();

  const params = {
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: `quotes/${filename}`,
    Body: fileContent,
    ContentType: "image/png",
  };

  try {
    const data = await s3.upload(params).promise();
    console.log("Uploaded to S3:", data.Location);
    return data;
  } catch (err) {
    console.error("S3 Upload Error:", err);
    return null;
  }
}

// Define the async function to create a post

const createPost = async (postDataParam) => {
  try {
    const response = await fetch(`${API_PATH}/blogs`, {
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

// Function to get the quote and author
function getQuoteAndAuthor(quote) {
  const match = quote.match(/^(.*?)[\s"”]?[–-]\s*([\w\s.]+)$/);
  if (match) {
    return { text: match[1].trim(), author: match[2].trim() };
  }
  return { text: quote.trim(), author: "Unknown" };
}

// Array of quotes

// Define canvas dimensions
const width = 1000;
const height = 1500;
const lineHeight = 120;

// Function to wrap text to fit within canvas width
function wrapText(ctx, text, x, y, maxWidth) {
  const words = text.split(" ");
  let line = "";
  let lines = [];

  for (let i = 0; i < words.length; i++) {
    let testLine = line + words[i] + " ";
    let testWidth = ctx.measureText(testLine).width;

    if (testWidth > maxWidth && i > 0) {
      lines.push(line);
      line = words[i] + " ";
    } else {
      line = testLine;
    }
  }
  lines.push(line);

  lines.forEach((line, index) => {
    ctx.fillText(line, x, y + index * lineHeight);
  });

  return lines.length;
}

// Function to create images
async function generateImages() {
  const baseFolderPath = path.join(
    process.env.HOME || process.env.USERPROFILE,
    "Downloads",
    "quotes_images"
  );

  // Get a unique folder path by checking for conflicts
  const imagesFolderPath = getUniqueFolderName(baseFolderPath);

  // Create the folder if it doesn't exist
  fs.mkdirSync(imagesFolderPath, { recursive: true });

  const csvData = [];
  let count = 0;
  let imagesContent = "";

  const updatedQuotes = await dedupeQuotesAndAuthors(quotes);

  for (const quote of updatedQuotes) {
    count++;
    const text = quote.title;
    const author = quote.author;
    console.log("quote id", quote.id);

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#252525";
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "white";
    ctx.font = "85px 'Norwester'";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    const textUpperCase = text.toUpperCase();
    const numberOfLines = wrapText(
      ctx,
      textUpperCase,
      width / 2,
      height * 0.2,
      width * 0.9
    );
    const totalTextHeight = numberOfLines * lineHeight;
    const centerY = (height - totalTextHeight) / 2;

    const canvas2 = createCanvas(width, height);
    const ctx2 = canvas2.getContext("2d");

    ctx2.fillStyle = "#252525";
    ctx2.fillRect(0, 0, width, height);
    ctx2.fillStyle = "white";
    ctx2.font = "85px 'Norwester'";
    ctx2.textAlign = "center";
    ctx2.textBaseline = "top";

    wrapText(ctx2, textUpperCase, width / 2, centerY, width * 0.9);

    if (author !== "Unknown") {
      const authorUpperCase = author.toUpperCase();
      ctx2.font = "45px 'Norwester'";
      ctx2.fillText(`– ${authorUpperCase}`, width / 2, height - 150);
    }

    const filename = `${uuidv4()}.png`;
    const imagePath = path.join(imagesFolderPath, filename);

    const out = fs.createWriteStream(imagePath);
    const stream = canvas2.createPNGStream();
    stream.pipe(out);

    await new Promise((resolve, reject) => {
      out.on("finish", resolve);
      out.on("error", reject);
    });

    console.log(`Image saved: ${imagePath}`);

    // Upload to S3
    const uploadResult = await uploadToS3(imagePath, filename);

    if (uploadResult) {
      // const row = {
      //   Title: quote.substring(0, 100),
      //   "Media URL": uploadResult.Location,
      //   "Pinterest board": "inspirational-quotes",
      //   Thumbnail: "",
      //   Description: "Inspirational quote",
      //   Link: blogUrl,
      //   "Publish date": "",
      //   Keywords: "inspirational, quotes",
      // };

      // // const row = {
      // //   Link: blogUrl,
      // //   "Media URL": uploadResult.source_url,
      // //   Title: quote.substring(0, 100),
      // //   "Pinterest board": "inspirational-quotes",
      // // };

      // csvData.push(row);
      await updateQuote(quote.id, { image_url: uploadResult.Location });

      let quoteInBlog;
      if (author !== "Unknown") {
        quoteInBlog = `"${text}" - ${author}`;
      } else {
        quoteInBlog = `"${text}"`;
      }
      console.log(quoteInBlog);

      //       imagesContent += `
      //   <div>
      //    <a href="../quotes/${quote.id}" target="_blank">
      //       <img
      //         src="${uploadResult.Location}"
      //         alt="${quoteInBlog}"
      //         class="image-single-blog"
      //       />
      //    </a>
      //    <FavoritesBar quoteid="${quote.id}" />
      //    <p>${quoteInBlog}</p>
      //   </div>
      // `;
      imagesContent += `
  <div>
    [![${quoteInBlog}](${uploadResult.Location})](../quotes/${quote.id})<FavoritesBar quoteId={${quote.id}} /><p>${quoteInBlog}</p>
  </div>`;
    }
  }

  // Save CSV
  // console.log("CSV Data:", csvData);
  // const csvFilePath = path.join(imagesFolderPath, "quotes.csv");
  // const csv = Papa.unparse(csvData);
  // fs.writeFileSync(csvFilePath, csv);
  // console.log(`CSV file saved to ${csvFilePath}`);

  // Post content
  //   let postContent = `<!-- wp:gallery {"linkTo":"none"} -->
  // <figure class="wp-block-gallery has-nested-images columns-default is-cropped">${galleryContent}</figure>
  // <!-- /wp:gallery -->`;

  if (updatedQuotes.length > 0) {
    const postContent = `<div class="images-blog-container">${imagesContent}</div>`;
    // const postContent = turndownService.turndown(postContentHTML);
    console.log("Markdown output:", postContent);

    const postData = {
      title: blogTitle,
      content: postContent,
      status: "published",
      user_id: "1",
    };

    createPost(postData);
  }
}

generateImages().catch(console.error);
