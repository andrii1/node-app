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
const { v4: uuidv4 } = require("uuid");
const OpenAI = require("openai");

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
const API_PATH = process.env.API_PATH_LOCAL;

// const codes = [
//   {
//     code: "ieydypd",
//     appleId: "6502968192",
//     appUrl: "https://instawork.com",
//     dealDescription: "Description of the deal",
//   },
// ];

// const codes = [
//   {
//     code: "0dfgdfg",
//     appUrl: "https://instawork.com",
//   },
// ];

// const codes = [
//   {
//     code: "087sfg",
//     appleId: "098213409",
//   },
// ];

const codes = [
  {
    code: "A9AJLKH",
    codeUrl: "https://www.ubank.com.au/refer-a-friend",
    appUrl: "https://www.ubank.com.au/mobile-banking-app",
    dealDescription:
      "Sign up for a Ubank account using the referral code A9AJLKH to get $30 free after making 5 small card purchases within 30 days.",
  },
];

// fetch helpers

async function fetchExistingTopics() {
  const res = await fetch(`${API_PATH}/topics`);
  const data = await res.json();
  const topics = data.map((topic) => topic.title);
  return topics;
}

async function fetchAppByAppleId(appleId) {
  const url = `https://itunes.apple.com/lookup?id=${appleId}`;
  const response = await fetch(url);
  const data = await response.json();
  return data.results[0];
}

async function createTopicWithChatGpt(category, app, appDescription) {
  const existingTopics = await fetchExistingTopics();
  console.log("existingTopics", existingTopics);

  // Generate a short description using OpenAI
  const prompt = `Select a topic for this app ${app} from list of existing topics: "${existingTopics}". Return only topic name, without any additional text, e.g. "Video". This is preferred. But, if none of the topics is suitable, than generate a subcategory (or a topic) for this app: ${app}, which is in this Apple App Store category: ${category}, which has this app description: ${appDescription}. It should be 1 or 2 or 3 words maximum. Ideally 1 or 2 words.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    max_tokens: 100,
  });

  const topic = completion.choices[0].message.content.trim();
  return topic;
}

async function createWebsiteDataWithChatGpt(url) {
  // Generate a short description using OpenAI
  const prompt = `Select a category for this website: ${url}. You need to select one category from this list: "Books, Business, Catalogs, Education, Entertainment, Finance, Food and Drink, Games, Health and Fitness, Lifestyle, Medical, Music, Navigation, News, Photo and Video, Productivity, Reference, Shopping, Social Networking, Sports, Travel, Utilities, Weather". Return only category name, without any additional text, e.g. "Education."`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    max_tokens: 300,
  });

  const promptTitle = `Get app title based on its website: ${url}. Return only app title, without any additional text, e.g. "Duolingo"`;

  const completionTitle = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: promptTitle }],
    temperature: 0.7,
    max_tokens: 300,
  });

  const promptDescription = `Create app description based on its website: ${url}.`;

  const completionDescription = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: promptDescription }],
    temperature: 0.7,
    max_tokens: 300,
  });

  const category = completion.choices[0].message.content.trim();
  const appTitle = completionTitle.choices[0].message.content.trim();
  const appDescription =
    completionDescription.choices[0].message.content.trim();
  return { category, appTitle, appDescription };
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
  return await res.json();
}

async function insertDeal({ deal, dealDescription, appleId, appUrl, appId }) {
  const res = await fetch(`${API_PATH}/deals/node`, {
    method: "POST",
    headers: {
      token: `token ${USER_UID}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: deal,
      description: dealDescription,
      apple_id: appleId,
      url: appUrl,
      app_id: appId,
    }),
  });
  return await res.json(); // assume it returns { id, full_name }
}

async function insertCode(title, dealId) {
  const res = await fetch(`${API_PATH}/codes/node`, {
    method: "POST",
    headers: {
      token: `token ${USER_UID}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title, deal_id: dealId }),
  });
  return await res.json(); // assume it returns { id, full_name }
}

const insertCodes = async (codesParam) => {
  for (const codeItem of codesParam) {
    const { code, appleId, appUrl, dealDescription } = codeItem;
    let app;
    let category;
    let categoryAppleId;
    let appTitle;
    let appDescription;

    if (appleId) {
      app = await fetchAppByAppleId(appleId);
      category = app.primaryGenreName;
      categoryAppleId = app.primaryGenreId;
      appTitle = app.trackName;
      appDescription = app.description;
    } else {
      ({ category, appTitle, appDescription } =
        await createWebsiteDataWithChatGpt(appUrl));
    }

    const newCategory = await insertCategory(category, categoryAppleId);
    const categoryId = newCategory.categoryId;
    console.log("Inserted category:", newCategory);

    const createdTopic = await createTopicWithChatGpt(
      category,
      appTitle,
      appDescription
    );

    const newTopic = await insertTopic(createdTopic, categoryId);
    const topicId = newTopic.topicId;
    console.log("Inserted topic:", newTopic);

    const newApp = await insertApp({ appTitle, appleId, appUrl, topicId });
    const appId = newApp.appId;
    const newAppTitle = newApp.appTitle;
    console.log("Inserted app:", newApp);

    const deal = `${newAppTitle} referral codes`;

    const newDeal = await insertDeal({
      deal,
      dealDescription,
      appleId,
      appUrl,
      appId,
    });
    const dealId = newDeal.dealId;
    console.log("Inserted deal:", newDeal);

    if (code) {
      const newCode = await insertCode(code, dealId);
      const codeId = newCode.codeId;
      console.log("Inserted code:", newCode);
    }
  }
};

insertCodes(codes).catch(console.error);
