require("dotenv").config();


function apiURL() {
  if (process.env.NODE_ENV === "production") {
    return process.env.REACT_APP_API_PATH;
  }
  return `http://localhost:5001/api`;
}

module.exports = apiURL;
