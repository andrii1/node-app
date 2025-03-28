const FormData = require("form-data");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

// WordPress Credentials (from .env)
const WP_URL = process.env.WP_URL;
const WP_URL_POSTS = process.env.WP_URL_POSTS;
const WP_USERNAME = process.env.WP_USERNAME;
const WP_APPLICATION_PASSWORD = process.env.WP_APPLICATION_PASSWORD;
const FILE_PATH = path.join(process.env.HOME, "Downloads", "Test.png"); // Replace with your file path


const uploadFile = async () => {

  // Read the file as a binary stream and append it to the form
  const fileBuffer = fs.readFileSync(FILE_PATH);


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
  } catch (error) {
    console.error("Error uploading file:", error);
  }
};

uploadFile();
