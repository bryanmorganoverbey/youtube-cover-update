const fs = require("fs");
const readline = require("readline");
const { google } = require("googleapis");
const OAuth2Data = require("./credentials.json");
const TOKEN_PATH = "_google_token.json";
const CLIENT_ID = OAuth2Data.web.client_id;
const CLIENT_SECRET = OAuth2Data.web.client_secret;
const REDIRECT_URL = OAuth2Data.web.redirect_uris[0];

// If modifying these scopes, delete token.json.
const SCOPES = "https://www.googleapis.com/auth/youtube.force-ssl";

(function main() {
  // Authorize a client with the loaded credentials, then call the YouTube API.
  function job1() {
    return new Promise(function (resolve, reject) {
      resolve(authorize((auth) => fetchRecentSubs(auth)));
    });
  }

  function job2() {
    return new Promise(function (resolve, reject) {
      resolve(authorize((auth) => uploadPhoto(auth)));
    });
  }

  job1()
    .then(function (data1) {
      console.log(data1);
      return job2();
    })
    .then((data2) => {
      console.log(data2);
      console.log("done");
    });
})();

function fetchRecentSubs(auth) {
  const youtube = google.youtube({
    version: "v3",
    auth: auth,
  });
  youtube.subscriptions
    .list({
      part: ["snippet"],
      mySubscribers: true,
    })
    .then(function (response) {
      // do something with the response
      if (response && response.data && response.data.items) {
        const channelIdList = response.data.items.map(
          (a) => a.snippet.channelId
        );
        return channelIdList;
      }
    });
}

/**
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(callback) {
  const oAuth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URL
  );
  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, function (err, token) {
    if (err) {
      getNewToken(oAuth2Client, callback);
    } else {
      oAuth2Client.credentials = JSON.parse(token);
      callback(oAuth2Client);
    }
  });
}

function getNewToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
  });
  console.log("Authorize this app by visiting this url: ", authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question("Enter the code from that page here: ", function (code) {
    rl.close();
    oAuth2Client.getToken(code, function (err, token) {
      if (err) {
        console.log("Error while trying to retrieve access token", err);
        return;
      }
      oAuth2Client.credentials = token;
      storeToken(token);
      callback(oAuth2Client);
    });
  });
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken(token) {
  fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
    if (err) throw err;
    console.log("Token stored to " + TOKEN_PATH);
  });
}

function uploadPhoto(auth) {
  const youtube = google.youtube({
    version: "v3",
    auth: auth,
  });

  try {
    youtube.channelBanners.insert(
      {
        media: {
          mimeType: "image/jpeg",
          body: fs.createReadStream("banner.jpeg"),
        },
      },
      function (err, uploadResponse, response) {
        if (err) {
          console.error(err);
        }
        console.log(uploadResponse);
        console.log(response);
      }
    );
  } catch (error) {
    console.log(error);
  }
}
