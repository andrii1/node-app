const { createCanvas, registerFont } = require("canvas");
const fs = require("fs");
const path = require("path");
const { format } = require("date-fns");
const Papa = require("papaparse");

// Register the Norwester font (adjust the path to the font file)
registerFont("fonts/norwester/norwester.otf", { family: "Norwester" });

// Function to get the quote and author
function getQuoteAndAuthor(quote) {
  const match = quote.match(/^(.*?)[\s"”]?[–-]\s*([\w\s.]+)$/);
  if (match) {
    return { text: match[1].trim(), author: match[2].trim() };
  }
  return { text: quote.trim(), author: "Unknown" };
}

// Array of quotes
const quotes = [
  "Do it with passion or not at all.",
  "Happy people plan actions, they don’t plan results. – Dennis Waitley",
  "If it matters to you, you’ll find a way. – Charlie Gilkey",
  "You don’t have to be perfect.",
  "The unhappy derive comfort from the misfortunes of others. – Aesop",
  "Live out of your imagination, not your history. – Stephen Covey",
];

console.log(quotes.length);

// Base URL and folder for images
const baseUrl = "https://motivately.co/wp-content/uploads/";
const defaultDomain = "motivately.co";
const pinterestBoard = "inspirational-quotes";

// Define canvas dimensions
const width = 1000;
const height = 1500;
const lineHeight = 120; // Set line height to control spacing between lines

function formatFilename(quote) {
  return quote
    .replace(/[^\w\s-]/g, "") // Remove punctuation (keep words, spaces, dashes)
    .replace(/\s+/g, "-"); // Replace spaces with dashes
}

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
  lines.push(line); // Push the last line

  // Draw each line
  lines.forEach((line, index) => {
    ctx.fillText(line, x, y + index * lineHeight);
  });

  return lines.length; // Return the number of lines drawn
}

// Function to get a unique folder name
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

// Create a new folder for saving all quotes
const baseFolderPath = path.join(
  process.env.HOME || process.env.USERPROFILE,
  "Downloads",
  "quotes_images"
);

// Get a unique folder path by checking for conflicts
const imagesFolderPath = getUniqueFolderName(baseFolderPath);

// Create the folder if it doesn't exist
fs.mkdirSync(imagesFolderPath, { recursive: true });

// Create array to store CSV data
const csvData = [];

let count = 0;
// Loop through each quote and save all in the new folder
quotes.forEach((quote, index) => {
  count++;
  // Get the quote text and author using the getQuoteAndAuthor function
  const { text, author } = getQuoteAndAuthor(quote);

  // Create a canvas and get the context
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Set background color to #252525
  ctx.fillStyle = "#252525";
  ctx.fillRect(0, 0, width, height);

  // Set text properties using Norwester font and size 85
  ctx.fillStyle = "white";
  ctx.font = "85px 'Norwester'";
  ctx.textAlign = "center";
  ctx.textBaseline = "top"; // Align from the top of each line

  // Convert the quote to uppercase
  const textUpperCase = text.toUpperCase();

  // Wrap the text to fit within the canvas and calculate the number of lines
  const numberOfLines = wrapText(
    ctx,
    textUpperCase,
    width / 2,
    height * 0.2,
    width * 0.9
  ); // 90% of canvas width

  // Calculate the total height of the text block
  const totalTextHeight = numberOfLines * lineHeight;

  // Calculate the starting vertical position to center the text
  const centerY = (height - totalTextHeight) / 2; // Vertically center the text

  // Create the canvas again to use the calculated centerY for positioning
  const canvas2 = createCanvas(width, height);
  const ctx2 = canvas2.getContext("2d");

  // Set background color and text properties again for second canvas
  ctx2.fillStyle = "#252525";
  ctx2.fillRect(0, 0, width, height);
  ctx2.fillStyle = "white";
  ctx2.font = "85px 'Norwester'";
  ctx2.textAlign = "center";
  ctx2.textBaseline = "top";

  // Draw the wrapped and centered text
  wrapText(ctx2, textUpperCase, width / 2, centerY, width * 0.9); // 90% of canvas width

  // If the author is known, draw the author at the bottom
  if (author !== "Unknown") {
    ctx2.font = "45px 'Norwester'";
    ctx2.fillText(`– ${author}`, width / 2, height - 150); // Draw author at the bottom
  }

  // Generate filename based on the quote (first 50 characters of the quote)
  const filename = `${text.substring(0, 60)}.png`; // Example: quote_1.png
  const filenameMedia = `${text.substring(0, 60)}`;
  // Set the full path where the image will be saved
  const downloadsPath = path.join(imagesFolderPath, filename);

  // Log where the image will be saved
  //console.log(`Saving image for quote "${quote}" to:`, downloadsPath);

  // Save the image to the images folder
  const out = fs.createWriteStream(downloadsPath);
  const stream = canvas2.createPNGStream();

  // Pipe the stream to the writable file stream
  stream.pipe(out);

  // Handle the finish and error events
  out.on("finish", () => {
    console.log(
      `Image saved successfully for quote "${quote}" to ${downloadsPath}`
    );

    // Construct the media URL
    const today = new Date();
    const year = today.getFullYear();
    const month = format(today, "MM");
    const mediaUrl = `${baseUrl}${year}/${month}/${formatFilename(
      filenameMedia
    )}.png`;

    // Prepare the CSV entry
    const row = {
      Title: quote.substring(0, 100), // Ensure the title is within 100 characters
      "Media URL": mediaUrl,
      "Pinterest board": pinterestBoard,
      Thumbnail: "", // No thumbnail for image quotes
      Description: "Inspirational quote", // Short description
      Link: `https://${defaultDomain}`,
      "Publish date": "", // Set this if necessary
      Keywords: "inspirational, quotes",
    };

    // Push the row to the CSV data
    csvData.push(row);

    // Once all images are saved, generate the CSV
    if (count === quotes.length) {
      const csvFilePath = path.join(imagesFolderPath, "quotes.csv");
      const csv = Papa.unparse(csvData);

      // Write the CSV to the file
      fs.writeFileSync(csvFilePath, csv);
      console.log(`CSV file saved to ${csvFilePath}`);
    }
    console.log(index, quotes.length);
  });

  out.on("error", (err) => {
    console.error("Error saving image:", err);
  });
});
