const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const dotenv = require('dotenv');
dotenv.config();

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((obj, done) => {
    done(null, obj);
});

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: process.env.GOOGLE_OAUTH_REDIRECT_URL,
        },
        (accessToken, refreshToken, profile, cb) => {
            const gooogleData = {
                profile: profile._json,
            }
            return cb(null, gooogleData);
        }
    )
);

module.exports = passport;
