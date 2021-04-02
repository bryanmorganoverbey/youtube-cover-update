var fs = require("fs");
var readline = require("readline");
var google = require("googleapis");
var youtube = google.youtube("v3");
var googleAuth = require("google-auth-library");
var SCOPES = ["https://www.googleapis.com/auth/youtube"];

var CREDS_DIR =
  (process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE) +
  "/.credentials/";
var TOKEN_PATH = "_google_token.json";
var VIDEO_ID_PATH = CREDS_DIR + "_video_id.json";
var PLAYLIST_PATH = CREDS_DIR + "playlistID.json";
var YT_CREDS = "./youtubeCREDS.json";

// var purgeCache = require("./purgeCache");
// var debug = require("./debug").debug;

var credentials = JSON.stringify(YT_CREDS);

/**
 * Reads in Youtube JSON credentials, parses it then sends to the authorize() function and runs the Youtube API function.
 *
 * fs.readfile
 * Reads contents from provided JSON by Youtube for authorizing.
 *
 ** processClientSecrets()
 ** @param err
 ** @param content
 */
fs.readFile(YT_CREDS, function processClientSecrets(err, content) {
  if (err) {
    console.log("Error loading client secret file: " + err);
    return;
  }

  authorize(JSON.parse(content), doWork);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  var clientSecret = credentials.installed.client_secret;
  var clientId = credentials.installed.client_id;
  var redirectUrl = credentials.installed.redirect_uris[0];
  var auth = new googleAuth();
  var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);
  var api_key = credentials.installed.api_key;

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, function (err, token) {
    if (err) {
      //if not get new token
      getNewToken(oauth2Client, callback);
    } else {
      //if yes parse json for token
      oauth2Client.credentials = JSON.parse(token);
      oauth2Client.api_key = api_key;
      callback(oauth2Client);
    }
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
function getNewToken(oauth2Client, callback) {
  var authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
  });
  console.log("Authorize this app by visiting this url: ", authUrl);
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question("Enter the code from that page here: ", function (code) {
    rl.close();
    oauth2Client.getToken(code, function (err, token) {
      if (err) {
        console.log(
          "youtube.js:81: Error while trying to retrieve access token",
          err
        );
        console.log(
          "\n Try deleting " + TOKEN_PATH + " located at " + CREDS_DIR
        );
        return;
      }
      oauth2Client.credentials = token;
      storeToken(token);
      callback(oauth2Client);
    });
  });
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken(token) {
  try {
    fs.mkdirSync(CREDS_DIR);
  } catch (err) {
    if (err.code != "EEXIST") {
      debug.log("youtube.js:101: ");
      throw err;
    }
  }
  try {
    fs.writeFile(TOKEN_PATH, JSON.stringify(token), function (err, token) {
      console.log("Token stored to " + TOKEN_PATH);
    });
  } catch (error) {
    console.log("error: ", error);
  }
}

function doWork(auth) {
  console.log("auth: ", auth);
  var res = youtube.subscriptions.list({
    part: ["snippet"],
    mySubscribers: true,
    key: auth.api_key,
  });
  console.log(res);
  // .then(
  //   function (response) {
  //     // Handle the results here (response.result has the parsed body).
  //     console.log("Response", response);
  //     console.log();
  //   },
  //   function (err) {
  //     console.error("Execute error", err);
  //   }
  // );
}