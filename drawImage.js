const { createCanvas, registerFont } = require("canvas");
const fs = require("fs");
const path = require("path");

// Register the Norwester font (adjust the path to the font file)
registerFont("fonts/norwester/norwester.otf", { family: "Norwester" });

// Array of quotes
const quotes = [
  "The only way to do great work is to love what you do.",
  "Life is 10% what happens to us and 90% how we react to it.",
  "Believe you can and you're halfway there.",
  "Success is not the key to happiness. Happiness is the key to success.",
  "In the middle of every difficulty lies opportunity."
];

// Define canvas dimensions
const width = 1000;
const height = 1500;
const lineHeight = 120; // Set line height to control spacing between lines

// Function to wrap text to fit within canvas width
function wrapText(ctx, text, x, y, maxWidth) {
  const words = text.split(' ');
  let line = '';
  let lines = [];

  for (let i = 0; i < words.length; i++) {
    let testLine = line + words[i] + ' ';
    let testWidth = ctx.measureText(testLine).width;

    if (testWidth > maxWidth && i > 0) {
      lines.push(line);
      line = words[i] + ' ';
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
const baseFolderPath = path.join(process.env.HOME || process.env.USERPROFILE, 'Downloads', 'quotes_images');

// Get a unique folder path by checking for conflicts
const imagesFolderPath = getUniqueFolderName(baseFolderPath);

// Create the folder if it doesn't exist
fs.mkdirSync(imagesFolderPath, { recursive: true });

// Loop through each quote and save all in the new folder
quotes.forEach((quote, index) => {
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
  const text = quote.toUpperCase();

  // Wrap the text to fit within the canvas and calculate the number of lines
  const numberOfLines = wrapText(ctx, text, width / 2, height * 0.2, width * 0.9); // 90% of canvas width

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
  wrapText(ctx2, text, width / 2, centerY, width * 0.9); // 90% of canvas width

  // Generate a unique filename for each quote
  const filename = `${quote.substring(0,50)}.png`; // Example: quote_1.png

  // Set the full path where the image will be saved
  const downloadsPath = path.join(imagesFolderPath, filename);

  // Log where the image will be saved
  console.log(`Saving image for quote "${quote}" to:`, downloadsPath);

  // Save the image to the images folder
  const out = fs.createWriteStream(downloadsPath);
  const stream = canvas2.createPNGStream();

  // Pipe the stream to the writable file stream
  stream.pipe(out);

  // Handle the finish and error events
  out.on("finish", () => {
    console.log(`Image saved successfully for quote "${quote}" to ${downloadsPath}`);
  });

  out.on("error", (err) => {
    console.error("Error saving image:", err);
  });
});
