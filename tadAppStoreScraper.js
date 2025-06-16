const store = require("app-store-scraper");

store
  .list({
    collection: store.collection.TOP_FREE_IOS,
    num: 50,
  })
  .then(console.log)
  .catch(console.log);
