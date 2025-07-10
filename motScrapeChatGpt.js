const OpenAI = require("openai");
require("dotenv").config();
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


async function createQuotesChatGpt() {
  // Generate a short description using OpenAI

  const prompt = `Create 10 quotes in this format [
  "Do what you can, with what you have, where you are. - Theodore Roosevelt",
  "You are never too old to set another goal or to dream a new dream. - C.S. Lewis",
  "Everything you can imagine is real. - Pablo Picasso",
  "Happiness depends upon ourselves. - Aristotle",
  "Start where you are. Use what you have. Do what you can. - Arthur Ashe" ]. Just return array of quotes in json. Do not include any notes, comments, markdown, or additional explanation — only return a clean JSON array, not wrapped inside any other array. `;
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

module.exports = createQuotesChatGpt;
// useChatGPT().catch(console.error);
