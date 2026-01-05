const passport = require('passport');
const Auth0Strategy = require('passport-auth0');
const dotenv = require('dotenv');

dotenv.config();

// Configure Passport to use Auth0
const strategy = new Auth0Strategy(
  {
    domain: process.env.AUTH0_DOMAIN,
    clientID: process.env.AUTH0_CLIENT_ID,
    clientSecret: process.env.AUTH0_CLIENT_SECRET,
    callbackURL: process.env.AUTH0_CALLBACK_URL || '/callback'
  },
  function (accessToken, refreshToken, extraParams, profile, done) {
    // accessToken is the JWT sent by Auth0 to your client
    // extraParams.id_token has the JSON Web Token
    // profile has all the information from the user
    return done(null, profile);
  }
);

passport.use(strategy);

// You can use this to customize how the user is serialized/deserialized
// for sessions. In this example, we're storing the whole profile in the session.
passport.serializeUser(function (user, done) {
  done(null, user);
});

passport.deserializeUser(function (user, done) {
  done(null, user);
});

module.exports = passport;
