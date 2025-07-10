/* eslint-disable no-console */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
require("dotenv").config();

const url = "https://thequoteshub.com/api/";

async function fetchQuotes() {
  const quotes = [];
  for (let i = 0; i < 10; i += 1) {
    try {
      const response = await fetch(url);
      const data = await response.json();
      const quote = `${data.text} - ${data.author}`;
      quotes.push(quote);
      console.log(`Fetch ${i + 1}:`, data);
    } catch (error) {
      console.error(`Error on fetch ${i + 1}:`, error);
    }
  }
  console.log(quotes);
  return quotes;

}

module.exports = fetchQuotes;
// useChatGPT().catch(console.error);
