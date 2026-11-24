// For external site verification, hence passport

// Different necessary utilities
const passport = require('passport'); // For authentication
const GoogleStrategy = require('passport-google-oauth20').Strategy; // Google
const FacebookStrategy = require('passport-facebook').Strategy; // Facebook
const bcrypt = require('bcrypt'); // To encrypt
const db = require('./Database/index.js'); // To access database

// Serialize user for session
passport.serializeUser((user, done) => {
    done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
    try {
        const result = await db.query('SELECT id, username, email FROM accounts WHERE id = $1', [id]);
        done(null, result.rows[0]);
    } catch (error) {
        done(error, null);
    }
});

// Google Strategy (Handles the difference between register nad login too)
passport.use(new GoogleStrategy({
    // Credentials and routing necessary
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: 'http://localhost:3000/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => { // Parameters
    try {
        // Check on Google with data entered
        const email = profile.emails[0].value;
        const username = profile.displayName.replace(/\s/g, '') + '_google';
        // SQL request retrieve user if it exists
        const userCheck = await db.query('SELECT * FROM accounts WHERE email = $1', [email]);
        // If there's results...
        if (userCheck.rows.length > 0) {
            // ... return them
            return done(null, userCheck.rows[0]);
        } else { // Or
            // Create new user
            const randomPassword = Math.random().toString(36).slice(-16);
            const hashedPassword = await bcrypt.hash(randomPassword, 10);
            //SQL request to create user
            const newUser = await db.query(
                'INSERT INTO accounts (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email',
                [username, email, hashedPassword]
            );
            // Return new user
            return done(null, newUser.rows[0]);
        }
    } catch (error) { //In case of error
        return done(error, null);
    }
}));

// Facebook Strategy (Handles the difference between register nad login too)
passport.use(new FacebookStrategy({
    // Credentials and routing necessary
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: 'http://localhost:3000/auth/facebook/callback',
    profileFields: ['id', 'emails', 'name']
}, async (accessToken, refreshToken, profile, done) => { //Parameters
    try {
        //Check on Facebook with data entered
        const email = profile.emails[0].value;
        const username = profile.displayName.replace(/\s/g, '') + '_facebook';
        // SQL request retrieve user if it exists
        const userCheck = await db.query('SELECT * FROM accounts WHERE email = $1', [email]);
        // If there's results...
        if (userCheck.rows.length > 0) {
            // ... return them
            return done(null, userCheck.rows[0]);
        } else {
            // Create new user
            const randomPassword = Math.random().toString(36).slice(-16);
            const hashedPassword = await bcrypt.hash(randomPassword, 10);
            //SQL request to create user
            const newUser = await db.query(
                'INSERT INTO accounts (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email',
                [username, email, hashedPassword]
            );
            // Return new user
            return done(null, newUser.rows[0]);
        }
    } catch (error) { //In case of error
        return done(error, null);
    }
}));

module.exports = passport;