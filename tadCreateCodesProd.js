// const fetch = require("node-fetch");

require("dotenv").config();
const { apiURL } = require("./utils/apiURL");

const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // make sure this is set in your .env
});

// Credentials (from .env)
const USER_UID = process.env.USER_UID_DEALS_PROD;
const API_PATH = process.env.API_PATH_DEALS_PROD;

// INSTRUCTION

// WITH CODE

// ALL FIELDS

// const codes = [
//   {
//     code: "ieydypd",
//     codeUrl: "https://instawork.com/htYgsgh",
//     appleId: "6502968192",
//     appUrl: "https://instawork.com",
//     dealTitle: "Instawork promo codes",
//     dealDescription: "Description of the deal",
//   },
// ];

// ONLY APPLEID

// const codes = [
//   {
//     code: "ieydypd",
//     codeUrl: "https://instawork.com/htYgsgh",
//     appleId: "6502968192",
//     dealTitle: "Instawork promo codes",
//     dealDescription: "Description of the deal",
//   },
// ];

// ONLY APPURL
// const codes = [
//   {
//     code: "0dfgdfg",
//     codeUrl: "https://instawork.com/htYgsgh",
//     appUrl: "https://instawork.com",
//     dealTitle: "Instawork promo codes",
//     dealDescription: "Description of the deal",
//   },
// ];

// WITHOUT CODE
// const codes = [
//   {
//     appleId: "6502968192",
//     appUrl: "https://instawork.com",
//     dealTitle: "Instawork promo codes",
//     dealDescription: "Description of the deal",
//   },
// ];


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

async function insertCode({ code, codeUrl, dealId }) {
  const body = {
    title: code,
    deal_id: dealId,
  };

  if (codeUrl) {
    body.url = codeUrl;
  }
  const res = await fetch(`${API_PATH}/codes/node`, {
    method: "POST",
    headers: {
      token: `token ${USER_UID}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  return await res.json(); // assume it returns { id, full_name }
}

const insertCodes = async (codesParam) => {
  for (const codeItem of codesParam) {
    const { code, codeUrl, appleId, appUrl, dealTitle, dealDescription } =
      codeItem;
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

    let deal;
    if (dealTitle) {
      deal = dealTitle;
    } else {
      const match = newAppTitle.match(/^(.*?)(?:-|:)/);
      const appName = match ? match[1].trim() : newAppTitle;
      deal = `${appName} referral codes`;
    }

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
      const newCode = await insertCode({ code, codeUrl, dealId });
      const codeId = newCode.codeId;
      console.log("Inserted code:", newCode);
    }
  }
};

insertCodes(codes).catch(console.error);
