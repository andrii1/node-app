require("dotenv").config();
const fs = require("fs");
const path = require("path");
const request = require("request");
const PINTEREST_TOKEN = process.env.PINTEREST_ACCESS_TOKEN;
const pinterest = require("pinterest-node-api")(PINTEREST_TOKEN);
const { pipeline } = require("stream");
const { promisify } = require("util");

const streamPipeline = promisify(pipeline);

const getPinterestAnalytics = async () => {
  try {
    let query = {
      start_date: "2025-02-01",
      end_date: "2025-03-01",
      sort_by: "ENGAGEMENT",
      // from_claimed_content: String(),
      // pin_format: String(),
      // app_types: String(),
      // metric_types: Array(String()),
      num_of_pins: 50,
      // created_in_last_n_days: Number(),
      // ad_account_id: String(),
    };
    let response = await pinterest.user_account.getTopPinsAnalytics({ query });
    console.log(response);
  } catch (error) {
    return;
  }
};

var pin_id = "723461127676527443";
var query = {
  ad_account_id: String(),
};

const getPinById = async (pinIdParam) => {
  try {
    const response = await pinterest.pins.get(pinIdParam);
console.log(response.media.images["1200x"].url);
    return response;
  } catch (error) {
    console.error(error);
  }
};


// const postToPinterest = async (payloadParam) => {
//   try {
//     const response = await pinterest.pins.create(payloadParam);
//     // if (!response.ok) {
//     //   throw new Error(`Error: ${response.status}`);
//     // }
//     console.log("Message:", response);
//   } catch (error) {
//     console.error("Error creating post:", error);
//   }
// };

// let payload = {
//   link: "https://motivately.co",
//   title: "Test quote",
//   // description: "string",
//   // dominant_color: "#6E7874",
//   // alt_text: "string",
//   board_id: "22723461196329741366",
//   // board_section_id: "string",
//   media_source: {
//     source_type: "image_url",
//     url: "https://motivately.co/wp-content/uploads/2025/03/Test-15.png",
//   },
//   // parent_pin_id: "string",
// };
// postToPinterest(payload);

//getPinterestAnalytics();

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

const downloadTopPins = async () => {
  console.log("hello");

  try {
    const baseFolderPath = path.join(
      process.env.HOME || process.env.USERPROFILE,
      "Downloads",
      "quotes_downloads"
    );

    //Get a unique folder path by checking for conflicts
    const imagesFolderPath = getUniqueFolderName(baseFolderPath);

    // Create the folder if it doesn't exist
    fs.mkdirSync(imagesFolderPath, { recursive: true });

    let query = {
      start_date: "2025-01-01",
      end_date: "2025-03-01",
      sort_by: "IMPRESSION",
      // from_claimed_content: String(),
      // pin_format: String(),
      // app_types: String(),
      // metric_types: Array(String()),
      num_of_pins: 3,
      // created_in_last_n_days: Number(),
      // ad_account_id: String(),
    };
    const response = await pinterest.user_account.getTopPinsAnalytics({
      query,
    });
    console.log(response);



  } catch (error) {
    console.error("Error:", error);
  }
};

const downloadPins = async (array) => {
  const baseFolderPath = path.join(
    process.env.HOME || process.env.USERPROFILE,
    "Downloads",
    "quotes_downloads"
  );

  //Get a unique folder path by checking for conflicts
  const imagesFolderPath = getUniqueFolderName(baseFolderPath);

  // Create the folder if it doesn't exist
  fs.mkdirSync(imagesFolderPath, { recursive: true });
  for (const pin of array) {
      const pinData = await getPinById(pin);
      console.log(pinData);

      const imageUrl = pinData.media.images["1200x"].url;
      const filename = `${pin}.png`;
      const imagePath = path.join(imagesFolderPath, filename);

      await downloadImage(imageUrl, imagePath);
    }
}

const downloadImage = async (url, filepath) => {
  try {
    const response = await fetch(url);

    if (!response.ok)
      throw new Error(`Failed to fetch ${url}: ${response.statusText}`);

    const fileStream = fs.createWriteStream(filepath);

    // Use stream pipeline for proper stream handling
    await streamPipeline(response.body, fileStream);
    console.log(`Downloaded: ${filepath}`);
  } catch (error) {
    console.error(`Error downloading image: ${error.message}`);
    throw error;
  }
};

//downloadPins(pinIds);
getPinterestAnalytics();
