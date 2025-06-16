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
const OpenAI = require("openai");
const store = require("app-store-scraper");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // make sure this is set in your .env
});

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

// Credentials (from .env)
const USER_UID = process.env.USER_UID_DEALS_LOCAL;
const API_PATH = process.env.LOCAL_API_PATH;


// const codes = [
//   {
//     code: "ieydypd",
//     appleId: "6502968192",
//     dealDescription: "Description of the deal",
//   },
// ];

const apps = [
  {
    appleId: "1578068536",
  },
];

// fetch helpers

async function fetchAppByAppleId(appleId) {
  const url = `https://itunes.apple.com/lookup?id=${appleId}`;
  const response = await fetch(url);
  const data = await response.json();
  return data.results[0];
}

async function createTopicWithChatGpt(category, app, appDescription) {
  // Generate a short description using OpenAI
  const prompt = `Generate a subcategory (or a topic) for this app: ${app}, which is in this Apple App Store category: ${category}, which has this app description: ${appDescription}. It should be 1 or 2 or 3 words maximum. Ideally 1 or 2 words.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    max_tokens: 100,
  });

  const topic = completion.choices[0].message.content.trim();
  return topic;
}

// async function fetchExistingCategories() {
//   const res = await fetch(`${API_PATH}/categories`);
//   return res.json();
// }

// async function fetchExistingTopics() {
//   const res = await fetch(`${API_PATH}/topics`);
//   return res.json();
// }

// async function fetchExistingApps() {
//   const res = await fetch(`${API_PATH}/apps`);
//   return res.json();
// }

// async function fetchExistingDeals() {
//   const res = await fetch(`${API_PATH}/deals`);
//   return res.json();
// }

async function insertCategory(title, categoryAppleId) {
  const res = await fetch(`${API_PATH}/categories`, {
    method: "POST",
    headers: {
      token: `token ${USER_UID}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title, category_apple_id: categoryAppleId }),
  });
  return await res.json(); // assume it returns { id, full_name }
}

async function insertTopic(title, categoryId) {
  const res = await fetch(`${API_PATH}/topics`, {
    method: "POST",
    headers: {
      token: `token ${USER_UID}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title, category_id: categoryId }),
  });
  return await res.json(); // assume it returns { id, full_name }
}

async function insertApp({ appTitle, appleId, appUrl, topicId }) {
   const body = {
     title: appTitle,
     topic_id: topicId,
   };

   if (appleId) {
     body.apple_id = appleId;
   }

   if (appUrl) {
     body.url = appUrl;
   }
  const res = await fetch(`${API_PATH}/apps/node`, {
    method: "POST",
    headers: {
      token: `token ${USER_UID}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  return await res.json(); // assume it returns { id, full_name }
}

async function insertDeal(title, appleId, appId) {
  const res = await fetch(`${API_PATH}/deals/node`, {
    method: "POST",
    headers: {
      token: `token ${USER_UID}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title,
      apple_id: appleId,
      app_id: appId,
    }),
  });
  return await res.json(); // assume it returns { id, full_name }
}

// async function insertCode(title, dealId) {
//   const res = await fetch(`${API_PATH}/codes/node`, {
//     method: "POST",
//     headers: {
//       token: `token ${USER_UID}`,
//       "Content-Type": "application/json",
//     },
//     body: JSON.stringify({ title, deal_id: dealId }),
//   });
//   return await res.json(); // assume it returns { id, full_name }
// }

const insertApps = async (appsParam) => {
  console.log(appsParam);
  for (const appItem of appsParam) {
    const appleId = appItem[0].id;

    const app = await fetchAppByAppleId(appleId);
    const category = app.primaryGenreName;
    const categoryAppleId = app.primaryGenreId;
    const appTitle = app.trackName;
    const appDescription = app.description;
    const appUrl = app.sellerUrl;

    const newCategory = await insertCategory(category, categoryAppleId);
    const categoryId = newCategory.categoryId;
    console.log("Inserted category:", newCategory);

    const createdTopic = await createTopicWithChatGpt(
      category,
      appTitle,
      appDescription
    );
    console.log("createdTopic", createdTopic);

    const newTopic = await insertTopic(createdTopic, categoryId);
    const topicId = newTopic.topicId;
    console.log("Inserted topic:", newTopic);

    const newApp = await insertApp({ appTitle, appleId, appUrl, topicId });
    const appId = newApp.appId;
    const newAppTitle = newApp.appTitle;
    console.log("Inserted app:", newApp);

    const deal = `${newAppTitle} referral codes`;

    const newDeal = await insertDeal(deal, appleId, appId);
    const dealId = newDeal.dealId;
    console.log("Inserted deal:", newDeal);

    // const newCode = await insertCode(code, dealId);
    // const codeId = newCode.codeId;
    // console.log("Inserted code:", newCode);
  }
};

//insertApps(apps).catch(console.error);

store;
Promise.all([
  store.list({
    collection: store.collection.TOP_FREE_IOS,
    num: 2,
  }),
  store.list({
    collection: store.collection.TOP_GROSSING_IOS,
    num: 2,
  }),
  store.list({
    collection: store.collection.TOP_PAID_IOS,
    num: 2,
  }),
  store.list({
    collection: store.collection.TOP_FREE_IOS,
    category: store.category.ENTERTAINMENT,
    num: 2,
  }),
  store.list({
    collection: store.collection.TOP_FREE_IOS,
    category: store.category.FINANCE,
    num: 2,
  }),
  store.list({
    collection: store.collection.TOP_FREE_IOS,
    category: store.category.LIFESTYLE,
    num: 2,
  }),
  store.list({
    collection: store.collection.TOP_FREE_IOS,
    category: store.category.PHOTO_AND_VIDEO,
    num: 2,
  }),
  store.list({
    collection: store.collection.TOP_FREE_IOS,
    category: store.category.SOCIAL_NETWORKING,
    num: 2,
  }),
])
  .then(insertApps)
  .catch(console.log);
