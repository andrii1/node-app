const OpenAI = require("openai");
require("dotenv").config();
const snoowrap = require("snoowrap");
const { writeFile } = require("fs/promises");
const { jsonrepair } = require("jsonrepair");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // make sure this is set in your .env
});

const reddit = new snoowrap({
  userAgent: process.env.REDDIT_USER_AGENT,
  clientId: process.env.REDDIT_CLIENT_ID,
  clientSecret: process.env.REDDIT_CLIENT_SECRET,
  username: process.env.REDDIT_USERNAME,
  password: process.env.REDDIT_PASSWORD,
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

const listOfSubreddits = [
  "quotes",
];

async function fetchRedditWithApi() {
  const allPosts = [];

  for (const subredditName of listOfSubreddits) {
    try {
      const subreddit = await reddit.getSubreddit(subredditName);
      const posts = await subreddit.getTop({ time: "week", limit: 100 });

      const postsMap = posts.map((post) => ({
        title: post.title,
        url: `https://reddit.com${post.permalink}`,
        author: post.author.name,
        selftext: post.selftext,
        upvotes: post.ups,
        created_utc: post.created_utc,
        subreddit: subredditName,
      }));

      allPosts.push(...postsMap);
    } catch (err) {
      console.error(`Failed to fetch from r/${subredditName}:`, err.message);
    }
  }

  return allPosts;
}

// async function fetchReddit() {
//   const url = "https://www.reddit.com/r/referralcodes/top.json?t=month&limit=5";
//   const headers = {
//     "User-Agent": "node:weeklyReferralScraper:v1.0 (by /u/yourusername)",
//   };
//   const response = await fetch(url, { headers });

//   if (!response.ok) {
//     console.error("Failed to fetch posts:", response.statusText);
//     process.exit(1);
//   }
//   const data = await response.json();

//   const posts = data.data.children.map((post) => ({
//     title: post.data.title,
//     url: `https://reddit.com${post.data.permalink}`,
//     author: post.data.author,
//     selftext: post.data.selftext,
//     upvotes: post.data.ups,
//     created_utc: post.data.created_utc,
//   }));
//   console.log(posts);
//   await writeFile("reddit/referral_posts.json", JSON.stringify(posts, null, 2));

//   return posts;
// }

async function formatReddit() {
  // Generate a short description using OpenAI

  const posts = await fetchRedditWithApi();
  const prompt = `${JSON.stringify(posts)} Extract quotes from these Reddit posts and turn them to this format [
  "Do what you can, with what you have, where you are. - Theodore Roosevelt",
  "You are never too old to set another goal or to dream a new dream. - C.S. Lewis",
  "Everything you can imagine is real. - Pablo Picasso",
  "Happiness depends upon ourselves. - Aristotle",
  "Start where you are. Use what you have. Do what you can. - Arthur Ashe" ].  Just return array of objects in json. Do not include any notes, comments, markdown, or additional explanation — only return a clean JSON array of objects, not wrapped inside any other array. `;
  // console.log(prompt);

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    max_tokens: 3000,
  });

  const rawReply = completion.choices[0].message.content.trim();
  const cleanedReply = cleanOpenAIJsonReply(rawReply);

  try {
    const repairedJson = jsonrepair(cleanedReply);
    const parsed = JSON.parse(repairedJson);
    // Normalize: if first element is an array and rest is noise, unwrap it
    if (Array.isArray(parsed) && Array.isArray(parsed[0])) {
      return parsed[0];
    }

    // If it's an array of objects, as expected
    if (Array.isArray(parsed)) {
      return parsed;
    }

    console.warn("Unexpected format from OpenAI:", parsed);
    return [];
  } catch (error) {
    console.error("Failed to parse OpenAI reply:", error);
    console.log("Raw reply was:", rawReply);
    return [];
  }
}

module.exports = formatReddit;
// useChatGPT().catch(console.error);
