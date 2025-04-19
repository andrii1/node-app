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
const PROD_API_PATH = process.env.PROD_API_PATH;

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
  "Sometimes you just gotta stay silent, cause no words can explain the shit that's going on in your mind and heart.",
  "I don't have the energy to pretend to like you today.",
  "When the heart gets too heavy with pain, people don't cry—they become silent. Completely silent.",
  "Sometimes it's easier to pretend that you don't care, than to admit it's killing you.",
  "Yeah, she's smiling. But don't let that fool you. Look into her eyes—she's breaking inside.",
  "The worst distance between two people is misunderstanding.",
  "I don't need perfect people in my life. I just need honest, good-hearted ones.",
  "I'm proud of my heart. It's been played, stabbed, cheated, burned, and broken—but somehow still works.",
  "You look sad today... Yeah, I'm sad every day, I just didn't have the energy to hide it today. – Donna Waag",
  "There comes a point where you no longer care if there's a light at the end of the tunnel or not. You're just sick of the tunnel. – Ranata Suzuki",
  "The worst kind of sad is not being able to explain why.",
  "If you focus on the hurt, you will continue to suffer. If you focus on the lesson, you will continue to grow.",
  "Some say I'm too sensitive, but truth is I just feel too much. Every word, every action, every energy goes straight to my heart.",
  "I don't hold grudges. I remember facts.",
  "If you know me you know that: 1) I hate liars 2) I'm loyal 3) I'm honest 4) I'm weird 5) I hate being ignored 6) I text back fast.",
  "I think the saddest people always try their hardest to make people happy because they know what it's like to feel absolutely worthless and they don't want anyone else to feel like that. – Robin Williams",
  "If you hate me, hate me alone. Don't be out there lying about me trying to recruit people to hate me with you.",
  "You see a person's true colors when you are no longer beneficial to their life. – Unknown",
  "Today my forest is dark. The trees are sad and all the butterflies have broken wings. – Raine Cooper",
  "I felt so much, that I started to feel nothing.",
  "Be silly. Be fun. Be different. Be crazy. Be you, because life is too short to be anything but happy.",
  "My stomach drops when I think of anyone else having you.",
  "Don't think people understand how stressful it is to explain what's going on in your head when you don't even understand it yourself.",
  "You'll never know how damaged someone is until you try to love them.",
];

const blogTitle = "SO TRUE QUOTES - ultimate list";

// const blogUrl = "https://motivately.co/";

// fetch helpers
async function fetchExistingQuotes() {
  const res = await fetch(`${PROD_API_PATH}/quotes`);
  return res.json();
}

async function fetchExistingAuthors() {
  const res = await fetch(`${PROD_API_PATH}/authors`);
  return res.json();
}

async function insertAuthor(name) {
  const res = await fetch(`${PROD_API_PATH}/authors`, {
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
  const res = await fetch(`${PROD_API_PATH}/quotes`, {
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
  const res = await fetch(`${PROD_API_PATH}/quotes/${quoteId}`, {
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

  const quoteMap = new Map(
    existingQuotes.map((q) => [q.title.toLowerCase().trim(), q.id])
  );
  const authorMap = new Map(
    existingAuthors.map((a) => [
      a.fullName.toLowerCase().trim(),
      { id: a.id, fullName: a.fullName },
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
      authorId = newAuthor.id;
      authorFullName = newAuthor.authorFullName;
      authorMap.set(normalizedAuthor, {
        id: authorId,
        fullName: authorFullName,
      });
    }

    // New quote
    console.log("Inserting quote:", text);
    const newQuote = await insertQuote({
      title: text,
      author_id: authorId,
      user_id: "1",
    });
    console.log("Inserted quote:", newQuote);
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
    const response = await fetch(`${PROD_API_PATH}/blogs`, {
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

      imagesContent += `
  <div>
   <a href="../quotes/${quote.id}" target="_blank">
      <img
        src="${uploadResult.Location}"
        alt="${text} - ${author}"
        class="image-single-blog"
      />
   </a>
    <p>"${text}" - ${author}</p>
  </div>
`;
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

  const postContentHTML = `<div class="images-blog-container">${imagesContent}</div>`;
  const postContent = turndownService.turndown(postContentHTML);

  const postData = {
    title: blogTitle,
    content: postContent,
    status: "published",
    user_id: "1",
  };

  createPost(postData);
}

generateImages().catch(console.error);
