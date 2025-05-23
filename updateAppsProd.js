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

// Credentials (from .env)
const USER_UID = process.env.USER_UID_DEALS;
// const LOCALHOST_API_PATH = process.env.LOCALHOST_API_PATH;
const PROD_API_PATH = process.env.PROD_API_PATH_DEALS;

async function fetchExistingApps() {
  const res = await fetch(`${PROD_API_PATH}/apps`);
  const data = await res.json();
  return data;
}

async function getAppleIdText(appleId) {
  try {

    const url = `https://itunes.apple.com/lookup?id=${appleId}`;
    const response = await fetch(url);

    // const response = await fetch(`${PROD_API_PATH}/blogs`, {
    //   method: "POST",
    //   headers: {
    //     token: `token ${USER_UID}`,
    //     "Content-Type": "application/json",
    //   },
    //   body: JSON.stringify(postDataParam),
    // });

    // Check if the response is OK (status code 200-299)
    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }

    // Parse the JSON response
    // const data = await response.json();
    const data = await response.json();
    return data.results[0].description;
  } catch (error) {
    console.error("Error creating post:", error);
  }
}

async function addTextToApp(id, description) {
  const res = await fetch(`${PROD_API_PATH}/apps/${id}`, {
    method: "PATCH",
    headers: {
      token: `token ${USER_UID}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ description }),
  });
  return await res.json(); // assume it returns { id, full_name }
}

// Define the async function to create a post
updateApp = async () => {
  const apps = await fetchExistingApps();
  console.log("apps", apps);
  for (const app of apps) {
    console.log("app", app.apple_id);
    const text = await getAppleIdText(app.apple_id);
    console.log(text);
    const updatedApp = await addTextToApp(app.id, text);
    console.log(updatedApp);
  }
};

updateApp();
