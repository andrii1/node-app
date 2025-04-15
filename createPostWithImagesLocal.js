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

// WordPress Credentials (from .env)
const WP_URL = process.env.WP_URL;
const WP_URL_POSTS = process.env.WP_URL_POSTS;
const WP_USERNAME = process.env.WP_USERNAME;
const WP_APPLICATION_PASSWORD = process.env.WP_APPLICATION_PASSWORD;
const USER_UID = process.env.USER_UID;
const LOCALHOST_API_PATH = process.env.LOCALHOST_API_PATH;

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const auth =
  "Basic " +
  Buffer.from(`${WP_USERNAME}:${WP_APPLICATION_PASSWORD}`).toString("base64"); // Basic Auth token

const quotes = [
  {
    id: 1,
    title:
      "You just gotta keep going and fighting for everything, and one day you'll get to where you want. - Naomi Osaka",
  },
  {
    id: 2,
    title:
      "Success is not just about making money. It's about making a difference.",
  },
  {
    id: 3,
    title:
      "The only way to do something in depth is to work hard. It's that simple.",
  },
];

const blogTitle = "3 Naomi Osaka quotes - best collection";

// const blogUrl = "https://motivately.co/";

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

async function updateMediaTitle(mediaId, title) {
  try {
    const response = await fetch(`${WP_URL}/${mediaId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: auth,
      },
      body: JSON.stringify({ title: title }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update media title: ${response.statusText}`);
    }

    const updatedMedia = await response.json();
    console.log("Media title updated successfully:", updatedMedia);
  } catch (error) {
    console.error("Error updating media title:", error);
  }
}

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
  let galleryContent = "";

  for (const quote of quotes) {
    count++;
    const { text, author } = getQuoteAndAuthor(quote.title);

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

    const filename = `${quote.id}.png`;
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

      imagesContent += `
  <div>
    <a href="../quotes/${quote.id}" target="_blank">
      <img
        src="${uploadResult.Location}"
        alt="${quote.title}"
        class="image-single-blog"
      />
    </a>
    <p>${quote.title}</p>
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

  //createPost(postData);
}

generateImages().catch(console.error);
