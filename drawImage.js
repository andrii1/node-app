const { createCanvas } = require("canvas");
const fs = require("fs");
const path = require("path");

// Define canvas dimensions
const width = 1000;
const height = 1500;

// Create a canvas and get the context
const canvas = createCanvas(width, height);
const ctx = canvas.getContext("2d");

// Set background color to #252525
ctx.fillStyle = "#252525";
ctx.fillRect(0, 0, width, height);

// Set text properties
ctx.fillStyle = "white";
ctx.font = "48px Arial";
ctx.textAlign = "center";
ctx.textBaseline = "middle";

// Draw text in the center
ctx.fillText("Hello from Node.js!", width / 2, height / 2);

// Get the Downloads folder path (works on macOS and Linux)
const downloadsPath = path.join(
  process.env.HOME || process.env.USERPROFILE,
  "Downloads",
  "output.png"
);

// Save the image to the Downloads folder
const out = fs.createWriteStream(downloadsPath);
const stream = canvas.createPNGStream();

stream.pipe(out);
out.on("finish", () => console.log(`Image saved as ${downloadsPath}`));
