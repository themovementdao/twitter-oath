const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const { default: axios } = require('axios');
var cors = require('cors')

require('dotenv').config();

const app = express();
const port = 3000;
const oauth = require('./lib/oauth-promise')("");
const COOKIE_NAME = 'oauth_token';

//our in-memory secrets database.
//Can be a key-value store or a relational database
let tokens = {};


app.use(bodyParser.json());
app.use(cookieParser());
app.use(cors());

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const {oauth_token: req_oauth_token, oauth_verifier} = req.query;
    const oauth_token = req.cookies[COOKIE_NAME];
    const oauth_token_secret = tokens[oauth_token].oauth_token_secret;
    
    if (oauth_token !== req_oauth_token) {
      res.status(403).json({message: "Request tokens do not match"});
      return;
    }
    
    const {oauth_access_token, oauth_access_token_secret} = await oauth.getOAuthAccessToken(oauth_token, oauth_token_secret, oauth_verifier);
    tokens[oauth_token] = { ...tokens[oauth_token], oauth_access_token, oauth_access_token_secret };

    const response = await oauth.getProtectedResource(
      "https://api.twitter.com/1.1/account/verify_credentials.json", 
      "GET", 
      oauth_access_token, 
      oauth_access_token_secret
    );
    const { screen_name } = JSON.parse(response.data);
    res.redirect(`${process.env.REDIRECT_URL}/?username=${screen_name}`);
  } catch(error) {
    res.status(403).json({message: "Missing access token"});
  } 
});

router.get('/api/twitter/oauth/request_token', async (req, res) => {
  try {
    const {oauth_token, oauth_token_secret} = await oauth.getOAuthRequestToken();
    res.cookie(COOKIE_NAME, oauth_token , {
      maxAge: 15 * 60 * 1000, // 15 minutes
      secure: true,
      httpOnly: true,
      sameSite: true,
    });
    tokens[oauth_token] = { oauth_token_secret };
    res.redirect(`https://api.twitter.com/oauth/authenticate?oauth_token=${oauth_token}`);
  }catch (err) {
    console.log(err);
  }
});
  
router.get('/api/twitter/user', async (req, res) => {
  try {
    const { data } = await axios.get(`https://api.twitter.com/2/users/by/username/${req.query.handle}?user.fields=profile_image_url`, {
      headers: {
        Authorization: `Bearer ${process.env.CONSUMER_BEARER}`
      }
    });
    res.json(data);
  }catch(e) {
    console.log(e);
  }
});

router.get('/api/twitter/latest-tweet', async (req, res) => {
  try {
    const { data } = await axios.get(`https://api.twitter.com/2/tweets/search/recent?query=from:${req.query.handle}`, {
      headers: {
        Authorization: `Bearer ${process.env.CONSUMER_BEARER}`
      }
    });
    res.json(data);
  }catch(e) {
    console.log(e);
  }
});


app.use('/', router);
app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});