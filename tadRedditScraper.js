const OpenAI = require("openai");
require("dotenv").config();
const { writeFile } = require("fs/promises");
const { jsonrepair } = require("jsonrepair");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // make sure this is set in your .env
});

function cleanOpenAIJsonReply(reply) {
  // Remove ```json or ``` at start and ``` at end, if present
  const cleaned = reply
    .replace(/^```json\s*/, "") // remove ```json at start
    .replace(/^```\s*/, "") // remove ``` at start (fallback)
    .replace(/```$/, "") // remove ``` at end
    .trim();

  return cleaned;
}

async function fetchReddit() {
  const url = "https://www.reddit.com/r/referralcodes/top.json?t=month&limit=5";
  const headers = {
    "User-Agent": "node:weeklyReferralScraper:v1.0 (by /u/yourusername)",
  };
  const response = await fetch(url, { headers });

  if (!response.ok) {
    console.error("Failed to fetch posts:", response.statusText);
    process.exit(1);
  }
  const data = await response.json();

  const posts = data.data.children.map((post) => ({
    title: post.data.title,
    url: `https://reddit.com${post.data.permalink}`,
    author: post.data.author,
    selftext: post.data.selftext,
    upvotes: post.data.ups,
    created_utc: post.data.created_utc,
  }));
  console.log(posts);
  await writeFile("reddit/referral_posts.json", JSON.stringify(posts, null, 2));

  return posts;
}

async function formatReddit() {
  // Generate a short description using OpenAI

  const posts = await fetchReddit();
  const prompt = `${JSON.stringify(
    posts
  )} Here are top Reddit posts about referral codes. You need to change to different format. Two options: you can find related appleId or not. If you can find out that this is a referral code for iOS app, then get appleId. To get appleId, you can find link for app in app store. For example, if app is tiktok, then app store link is 'https://apps.apple.com/us/app/tiktok/id835599320' and appleId will be '835599320'. Only include appleId if you are quite sure. For dealDescription field generate related description based on deal and reddit text. If there is also a referral link, use it in codeUrl field, if not - then don't add it. For codeUrl, I don't need reddit link to the post. For codeUrl, I also don't need link to main website. Only include codeUrl, if it is specifically referral link. Use this format: [
  {
    code: "3SKU73",
    codeUrl: '',
    appleId: "1578068536",
    dealDescription: '....'
  },
];
Another option, if you can't find related iOS app - then try to find appUrl - which is a website. If there is also a referral link, use it in codeUrl field, if not - then don't add it. For codeUrl, I also don't need link to main website. Only include codeUrl, if it is specifically referral link. For appUrl, don't include link to reddit. I need link to app or website related to referral code, if possible. [
  {
    code: "3SKU73",
    codeUrl: '',
    appUrl: 'https://example.com'
    dealDescription: '....'
  },
]; NOW THIS IS IMPORTANT: code is required field, if you can't find code in message - skip it. Also, either appleId or appUrl is required. If neither appleId nor appUrl are not available, just skip. Just return array of objects in json. `;
  //console.log(prompt);

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    max_tokens: 600,
  });

  const rawReply = completion.choices[0].message.content.trim();
  const cleanedReply = cleanOpenAIJsonReply(rawReply);

  try {
    const repairedJson = jsonrepair(cleanedReply);
    const parsed = JSON.parse(repairedJson);
    return parsed;
  } catch (error) {
    console.error("Failed to parse OpenAI reply:", error);
    console.log("Raw reply was:", rawReply);
    return [];
  }
}

module.exports = formatReddit;
// useChatGPT().catch(console.error);
