require("dotenv").config();
const fs = require("fs");
const request = require("request");
const PINTEREST_TOKEN = process.env.PINTEREST_ACCESS_TOKEN;
const pinterest = require("pinterest-node-api")(PINTEREST_TOKEN);

const getPinterestAnalytics = async () => {
try {
  let query = {
    start_date: '2025-01-01',
    end_date: '2025-03-01',
    sort_by: 'IMPRESSION',
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
}

var pin_id = 1055599906965838;
var query = {
  ad_account_id: String(),
};
const getPinById = async () => {
try {
  var response = await pinterest.pins.get(pin_id);
  console.log(response);

} catch (error) {
  return;
}
}
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

// var stream = function () {
//   request(
//     "https://assets.pinterest.com/ext/embed.html?id=11822017765917991"
//   ).pipe(fs.createWriteStream("test1.png"));
// };
// stream();

//getPinById();
