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

const turndownService = new TurndownService();

turndownService.addRule("divWithClass", {
  filter: "div",
  replacement: function (content, node) {
    const className = node.getAttribute("class");
    return className
      ? `<div class="${className}">${content}</div>\n`
      : `<div>${content}</div>\n`;
  },
});

// Register the Norwester font
registerFont("fonts/norwester/norwester.otf", { family: "Norwester" });

// Credentials (from .env)
const USER_UID = process.env.USER_UID;
// const LOCALHOST_API_PATH = process.env.LOCALHOST_API_PATH;
const PROD_API_PATH = process.env.PROD_API_PATH;

const blog = {
  title: "Barney fife quotes",
  content: `“Sheriff Andy Taylor: Now, you can’t be serious about resignin’. What in the world will you do?

Deputy Barney Fife: Oh, I-I don’t know. I could go up to the pickle factory. They always need a brine tester.”
— Barney Fife, The Andy Griffith Show, season 1: Andy the Matchmaker

“And you better gird your loins, buster. You got a fight on your hands.”
— Barney Fife, The Andy Griffith Show, Season 2: Barney’s Replacement

“I ain’t got time to stand around here and discuss trivial trivialities.”
— Barney Fife, The Andy Griffith Show, Season 2: Barney’s Replacement

“Deputy Barney Fife: He got the drop on me.

Sheriff Andy Taylor: You mean he had a gun?

Deputy Barney Fife: Ugh…well…he has NOW.”
— Barney Fife, The Andy Griffith Show, season 1: The Manhunt

“That poor, blind fool. He don’t know it but he’s headed right for Heartbreak Alley.”
— Barney Fife, The Andy Griffith Show, Season 3: Andy’s Rich Girlfriend

“I’m sick of the whole thing, too. You try to bring two people together and what do you get? Heartaches!”
— Barney Fife, The Andy Griffith Show, Season 5: Man in the Middle

“All I’m saying is that there are some things beyond the ken of mortal man that shouldn’t be tampered with. We don’t know everything, Andy. There’s plenty goin’ on right now in the Twilight Zone that we don’t know anything about and I think we oughta stay clear.”
— Barney Fife, The Andy Griffith Show, Season 4: The Haunted House

“Barney Fife: It won’t work.

Andy Taylor: What won’t work?

Barney Fife: You and Peg. That’s what won’t work. Andy, I hate to have to tell you this but you’re gonna have to give her up. Forget about her. Nip it. Nip it in the bud.

Andy Taylor: What’re you talkin’ about?

Barney Fife: You want me to spell it out for ya, huh? All right, I will. Andy, she is one of the rich, and they are different.

Andy Taylor: Oh, come on.

Barney Fife: No, no, no. They are. They’re different. From the minute they’re born with that silver spoon in their hands…

Andy Taylor: Mouth.

Barney Fife: Right…life is different.”
— Barney Fife, The Andy Griffith Show, Season 3: Andy’s Rich Girlfriend

`,
};


const blog3 = {
  title: "Naomi Osaka Opening Minds to Mental Health Issues Of Pro Athletes",
  content: `When tennis star Naomi Osaka announced prior to the French Open that she’d be declining to participate in all required media sessions during the tournament due to the stress and anxiety it caused her, the move was initially met with mixed messages. Some, including tournament officials, took the point of view that the Japanese-American Osaka was shirking her responsibility as a professional athlete. Her media sessions were viewed as a way for her to connect with the tennis public that ultimately pays her salary. French Open officials even vowed to fine Osaka for each media appearance since missed.

“Naomi Osaka” by SkySports is licensed under CC BY 3.0

However, mental health professionals were quick to take up the battle in support of Osaka, citing her decision to pass on regular media sessions as opening a window into the stresses placed on those who are constantly in the public spotlight.

Osaka is one of the top tennis players in the world. She’s been ranked No. 1 in the world by the Women’s Tennis Association and is a four-time Grand Slam winner. Osaka is the reigning champion at both the Australian and US Opens. Whenever Osaka enters a tennis tournament, the best sports betting sites always list her among the top contenders to win the title.

That doesn’t mean that Osaka is above feeling the pressures of her status as an elite tennis pro. She admitted to fits of anxiety prior to media sessions following matches and Osaka, 23, also acknowledged that she’s battled depression since she was a teenager.

“I communicated that I wanted to skip press conferences at Roland Garros to exercise self-care and preservation of my mental health,” Osaka wrote in a first-person article published by Time Magazine. “I stand by that.

“Athletes are humans. Tennis is our privileged profession, and of course there are commitments off the court that coincide. But I can’t imagine another profession where a consistent attendance record (I have missed one press conference in my seven years on tour) would be so harshly scrutinized.”



“Naomi Osaka” by Matthew Stockman/Getty is licensed under CC BY 3.0

Plenty Of Support For Osaka

Those who exist under the glare of the spotlight, such as athletes and other celebrities, were quick to step up to not only offer support to Osaka, but also to credit her decision as perhaps opening a path to enable others feeling this stress to also take steps to benefit their own mental health and well-being.

“Michael Phelps told me that by speaking up I may have saved a life,” Osaka wrote. “If that’s true, then it was all worth it.”

Phelps, the greatest swimmer in history, a winner of 23 Olympic medals, also has acknowledged his own difficult battles with depression. Initially, Phelps was taken aback by the vitriol directed toward Osaka.

“I was almost shocked in a way,” Phelps told Time, “especially with everything I feel like the world has learned about mental health over the last year.”

As he saw the tide turn toward support for Osaka, Phelps breathed easier. “That does bring a smile to my face,” he said. “Because yes, then we are understanding that this is something that, it doesn’t matter if you’re number one in the world or the average Joe, anybody can go through this. It is real. I hope this is the breaking point of really being able to open up and save more lives.”

Others who have reached out to offer their support to Osaka include former First Lady Michelle Obama, ​​tennis star Novak Djokovic, Royal Family member Meghan Markle and NBA star Stephen Curry.

Changing The Discussion

That Osaka was willing to put her mental health ahead of a chance to win Grand Slam titles – she also opted out of Wimbledon – spoke louder than any words she could say.

“It’s groundbreaking,” said Lisa Bonta Sumii. She’s a therapist with Galea Health, a company that connects athletes with mental health providers. “(Osaka) has prioritized mental health, and has said so. And that’s a great example.”

Osaka believes that sporting organizations need to recognize that there are athletes who struggle with the obligations placed upon their shoulders and more must be done to help them through these difficult times.

​​“There can be moments for any of us where we are dealing with issues behind the scenes,” Osaka said. “Each of us as humans is going through something on some level.”`,
};

const blog2 = {
  title: "You didn't love her grey's anatomy",
  content: `
“You didn't love her! You just didn't want to be alone. Or maybe, maybe she was good for your ego. Or, or maybe she made you feel better about your miserable life, but you didn't love her, because you don't destroy the person that you love!”
— Dr. Callie Torres, Grey's Anatomy, Grey's Anatomy Season 4: The Heart of the Matter

##About the author

This page was created by our editorial team. Each page is manually curated, researched, collected, and issued by our staff writers. Quotes contained on this page have been double checked for their citations, their accuracy and the impact it will have on our readers.

Kelly Peacock is an accomplished poet and social media expert based in Brooklyn, New York. Kelly has a Bachelor's degree in creative writing from Farieligh Dickinson University and has contributed to many literary and cultural publications. Kelly assists on a wide variety of quote inputting and social media functions for Quote Catalog. Visit her personal website here.

Kendra Syrdal is a writer, editor, partner, and senior publisher for The Thought & Expression Company. Over the last few years she has been personally responsible for writing, editing, and producing over 30+ million pageviews on Thought Catalog.
`,
};




// markdown
function convertContentToMarkdown(content) {
  if (!content) return "";

  const urlRegex = /(https?:\/\/[^\s]+)/g;

  return content
    .trim()
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();

      if (!trimmed) return ""; // blank line → paragraph break

      // Headings (lines in ALL CAPS or start with ###)
      if (/^#{2,3}\s/.test(trimmed)) {
        return trimmed;
      } else if (/^[A-Z\s\d]+$/.test(trimmed) && trimmed.length < 100) {
        return `## ${trimmed}`;
      }

      // Bullet points
      if (/^[-*•]\s+/.test(trimmed)) {
        return `- ${trimmed.replace(/^[-*•]\s+/, "")}`;
      }

      // Blockquotes
      if (/^>\s+/.test(trimmed)) {
        return `> ${trimmed.replace(/^>\s+/, "")}`;
      }

      // Convert plain URLs to [text](url)
      let lineWithLinks = trimmed.replace(urlRegex, (url) => {
        const display = url.replace(/^https?:\/\//, "").replace(/\/$/, "");
        return `[${display}](${url})`;
      });

      return lineWithLinks;
    })
    .join("\n\n");
}


// Define the async function to create a post

const createPost = async (postDataParam) => {
  try {
    const response = await fetch(`${PROD_API_PATH}/blogs`, {
      method: "POST",
      headers: {
        token: `token ${USER_UID}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(postDataParam),
    });

    // Check if the response is OK (status code 200-299)
    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }

    // Parse the JSON response
    const data = await response.json();
    console.log("Post created successfully:", data);
  } catch (error) {
    console.error("Error creating post:", error);
  }
};

// Function to create blogs

const markdownContent = convertContentToMarkdown(blog.content);

const postData = {
  title: blog.title,
  content: markdownContent,
  status: "published",
  user_id: "1",
};

createPost(postData);
