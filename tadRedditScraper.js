const OpenAI = require("openai");
require("dotenv").config();
const { writeFile } = require("fs/promises");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // make sure this is set in your .env
});

async function fetchReddit() {
  const url = "https://www.reddit.com/r/referralcodes/top.json?t=month&limit=30";
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

async function useChatGPT() {
  // Generate a short description using OpenAI

  const posts = await fetchReddit();
  const prompt = `${JSON.stringify(
    posts
  )} Here are top Reddit posts about referral codes. You need to change to different format. Two options: you can find related appleId or not. If you can find out that this is a referral code for iOS app, then get appleId. To get appleId, you can find link for app in app store. For example, if app is tiktok, then app store link is 'https://apps.apple.com/us/app/tiktok/id835599320' and appleId will be '835599320'. Only include appleId if you are quite sure. For description field generated related description based on deal and reddit text. If there is also a referral link, use it in codeUrl field, if not - then don't add it. For codeUrl, I don't need reddit link to the post. For codeUrl, I also don't need link to main website. Only include codeUrl, if it is specifically referral link. Use this format: [
  {
    code: "3SKU73",
    codeUrl: '',
    appleId: "1578068536",
    description: '....'
  },
];
Another option, if you can't find related iOS app - then use this format. If there is also a referral link, use it in codeUrl field, if not - then don't add it. For codeUrl, I also don't need link to main website. Only include codeUrl, if it is specifically referral link. For website, don't include link to reddit. I need link to app or website related to referral code, if possible. [
  {
    code: "3SKU73",
    codeUrl: '',
    website: 'https://example.com'
    description: '....'
  },
]; Just return array of objects. `;
console.log(prompt);


  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    max_tokens: 600,
  });

  const reply = completion.choices[0].message.content.trim();
  console.log(reply);
  return reply;
}


useChatGPT().catch(console.error);
