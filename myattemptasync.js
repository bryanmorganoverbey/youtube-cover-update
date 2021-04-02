const fs = require("fs");
const fetch = require("node-fetch");
const readline = require("readline");
const { google } = require("googleapis");
const OAuth2Data = require("./credentials.json");
const TOKEN_PATH = "_google_token.json";
const COMMENTERS_PATH = "_youtube_commenters.json";
const VIDEO_ID = "GuOeZ2jTpu8";
const CLIENT_ID = OAuth2Data.web.client_id;
const CLIENT_SECRET = OAuth2Data.web.client_secret;
const REDIRECT_URL = OAuth2Data.web.redirect_uris[0];

// If modifying these scopes, delete token.json.
const SCOPES = "https://www.googleapis.com/auth/youtube.force-ssl";
(function main() {
  authorize()
    .then((auth) => {
      console.log("first one executed");
      return fetchMostRecentCommenter(auth);
    })
    .then((mostRecentCommenter) => {
      return checkForNewCommenters(mostRecentCommenter);
    })
    .then(
      (mostRecentCommenter) => {
        console.log("do further processing with new commenter");
        return savePhoto(mostRecentCommenter);
      },
      (rejectedReason) => {
        console.log("End of Program: ", rejectedReason);
      }
    )
    .then(
      () => {
        return authorize();
      },
      (rejectedReason) => {
        throw Error("Failed to fetch photo: ", rejectedReason);
      }
    )
    .then((auth) => {
      uploadPhoto(auth);
    })
    .catch((err) => {
      console.log(err);
    });
})();

// Check for new subs. Resolve with string of new sub ID or reject.
function checkForNewCommenters(mostRecentCommenter) {
  return new Promise((resolve, reject) => {
    // fetch previous subs from file. If file is empty, return []
    fs.readFile(COMMENTERS_PATH, "utf8", function (err, storedCommenter) {
      if (err) {
        saveCommenter(mostRecentCommenter);
        resolve(mostRecentCommenter);
      }
      if (storedCommenter) {
        // we had some previous subs stored.
        console.log("mostRecentCommenter: ", mostRecentCommenter);
        console.log("storedCommenter: ", storedCommenter);
        if (mostRecentCommenter !== storedCommenter) {
          resolve(mostRecentCommenter);
        } else {
          reject("No new comments.");
        }
      } else {
        // no subs were in SUBS_IDS_PATH. Any sub data is a new sub. Resolve with most recent id.
        resolve(mostRecentCommenter);
      }
    });
  });
}

function saveCommenter(commenter) {
  fs.writeFile(COMMENTERS_PATH, commenter, (err) => {
    if (err) throw err;
    console.log("Stored Most Recent Commenter's Name to " + COMMENTERS_PATH);
  });
}

function authorize() {
  return new Promise((resolve, reject) => {
    const oAuth2Client = new google.auth.OAuth2(
      CLIENT_ID,
      CLIENT_SECRET,
      REDIRECT_URL
    );
    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, async function (err, token) {
      if (err) {
        await getNewToken(oAuth2Client);
        resolve(oAuth2Client);
      } else {
        oAuth2Client.credentials = JSON.parse(token);
        resolve(oAuth2Client);
      }
    });
  });
}

function fetchMostRecentCommenter(auth) {
  return new Promise((resolve, reject) => {
    const youtube = google.youtube({
      version: "v3",
      auth: auth,
    });
    youtube.commentThreads
      .list({
        part: ["snippet"],
        videoId: VIDEO_ID,
      })
      .then(function (response) {
        // do something with the response
        if (response && response.data && response.data.items) {
          const commentersList = response.data.items.map(
            (a) => a.snippet.topLevelComment.snippet.authorDisplayName
          );
          if (commentersList.length > 0) {
            resolve(commentersList[0]);
          } else {
            reject("No comments yet on this video!");
          }
        }
      });
  });
}

function getNewToken(oAuth2Client) {
  return new Promise((resolve, reject) => {
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
        resolve(oAuth2Client);
      });
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
  return new Promise((resolve, reject) => {
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
            reject(err);
            console.error(err);
          }
          console.log(uploadResponse);
          resolve(response);
        }
      );
    } catch (error) {
      console.log(error);
    }
  });
}

function savePhoto(mostRecentCommenter) {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await fetch(
        `https://dummyimage.com/2560x1440/${
          Math.floor(Math.random() * 900) + 100
        }/${
          Math.floor(Math.random() * 900) + 100
        }.jpg&text=${mostRecentCommenter}`
      );
      const buffer = await response.buffer();
      fs.writeFile("./banner.jpeg", buffer, () => {
        console.log("finished saving photo!");
        resolve();
      });
    } catch (error) {
      console.log("error: ", error);
      reject(error);
    }
  });
}
