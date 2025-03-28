const { createCanvas, registerFont } = require("canvas");
const { format } = require("date-fns");
const Papa = require("papaparse");
// const fetch = require("node-fetch");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

// Register the Norwester font
registerFont("fonts/norwester/norwester.otf", { family: "Norwester" });

// WordPress Credentials (from .env)
const WP_URL = process.env.WP_URL;
const WP_URL_POSTS = process.env.WP_URL_POSTS;
const WP_USERNAME = process.env.WP_USERNAME;
const WP_APPLICATION_PASSWORD = process.env.WP_APPLICATION_PASSWORD;

const quotes = ["Test", "Test2"];
const blogUrl ='https://motivately.co/'

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

// Function to upload image to WordPress
async function uploadToWordPress(imagePath) {
  // Read the file as a binary stream and append it to the form
    const fileBuffer = fs.readFileSync(imagePath);


    // Make a POST request to upload the file
    try {
      const response = await fetch(`${WP_URL}`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${WP_USERNAME}:${WP_APPLICATION_PASSWORD}`
          ).toString("base64")}`,
          "Content-Disposition": 'attachment; filename="Test.png"',
          "Content-Type": "image/png",
        },
        body: fileBuffer,
      });

      if (!response.ok) {
        const errorDetails = await response.text(); // Get the full error response text
        throw new Error(
          `Error uploading: ${response.statusText}. Details: ${errorDetails}`
        );
      }

      const result = await response.json();
      console.log("File uploaded successfully:", result);
      return result;
    } catch (error) {
      console.error("Error uploading file:", error);
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

  for (const quote of quotes) {
    count++;
    const { text, author } = getQuoteAndAuthor(quote);

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#252525";
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "white";
    ctx.font = "85px 'Norwester'";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    const textUpperCase = text.toUpperCase();
    const numberOfLines = wrapText(ctx, textUpperCase, width / 2, height * 0.2, width * 0.9);
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
      ctx2.font = "45px 'Norwester'";
      ctx2.fillText(`– ${author}`, width / 2, height - 150);
    }

    const filename = `${text.substring(0, 60)}.png`;
    const imagePath = path.join(imagesFolderPath, filename);

    const out = fs.createWriteStream(imagePath);
    const stream = canvas2.createPNGStream();
    stream.pipe(out);

    await new Promise((resolve, reject) => {
      out.on("finish", resolve);
      out.on("error", reject);
    });

    console.log(`Image saved: ${imagePath}`);

    // Upload to WordPress
    const mediaUrl = await uploadToWordPress(imagePath, filename);

    if (mediaUrl) {
      const row = {
        Title: quote.substring(0, 100),
        "Media URL": mediaUrl.source_url,
        "Pinterest board": "inspirational-quotes",
        Thumbnail: "",
        Description: "Inspirational quote",
        Link: blogUrl,
        "Publish date": "",
        Keywords: "inspirational, quotes",
      };

      csvData.push(row);
    }
  }

  // Save CSV
  console.log("CSV Data:", csvData);
  const csvFilePath = path.join(imagesFolderPath, "quotes.csv");
  const csv = Papa.unparse(csvData);
  fs.writeFileSync(csvFilePath, csv);
  console.log(`CSV file saved to ${csvFilePath}`);
}

generateImages().catch(console.error);
