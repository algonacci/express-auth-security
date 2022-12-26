const fs = require("fs");
const https = require("https");
const path = require("path");
const express = require("express");
const helmet = require("helmet");
const passport = require("passport");
const { Strategy } = require("passport-google-oauth20");
const cookieSession = require("cookie-session");

const PORT = 3000;

require("dotenv").config();

const CONFIG = {
  CLIENT_ID: process.env.CLIENT_ID,
  CLIENT_SECRET: process.env.CLIENT_SECRET,
  COOKIE_KEY_1: process.env.COOKIE_KEY_1,
  COOKIE_KEY_2: process.env.COOKIE_KEY_2,
};

const AUTH_OPTIONS = {
  callbackURL: "/auth/google/callback",
  clientID: CONFIG.CLIENT_ID,
  clientSecret: CONFIG.CLIENT_SECRET,
};

function verifyCallback(accessToken, refreshToken, profile, done) {
  console.log("Google profile", profile);
  console.log(accessToken);
  console.log(refreshToken);
  done(null, profile);
}

passport.use(new Strategy(AUTH_OPTIONS, verifyCallback));

// Save the session to the cookie
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Read the session from the cookie
passport.deserializeUser((id, done) => {
  // User.findById(id).then(user => {
  //   done(null, user);
  // });
  done(null, id);
});

const app = express();

app.use(helmet());
app.use(
  cookieSession({
    name: "session",
    maxAge: 24 * 60 * 60 * 1000,
    keys: [CONFIG.COOKIE_KEY_1, CONFIG.COOKIE_KEY_2],
  })
);
app.use(passport.initialize());
app.use(passport.session());

function checkLoggedIn(req, res, next) {
  console.log("Current user id:", req.user);
  const isLoggedIn = req.isAuthenticated() && req.user;
  if (!isLoggedIn) {
    return res.status(401).json({
      error: "Unauthorized",
    });
  }
  next();
}

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["email"],
  })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/failure",
    successRedirect: "/",
    session: true,
  }),
  (req, res) => {
    console.log("Google called us back!");
  }
);

app.get("/auth/logout", (req, res) => {
  req.logout(); //Removes req.user and clears any logged in session
  return res.redirect("/");
});

app.get("/failure", (req, res) => {
  return res.send("Failed to log in!");
});

app.get("/auth/google/logout", (req, res) => {});

app.get("/secret", checkLoggedIn, (req, res) => {
  console.log(req.user);
  return res.send(`Your personal secret value is ${req.user}!`);
});

https
  .createServer(
    {
      key: fs.readFileSync("key.pem"),
      cert: fs.readFileSync("cert.pem"),
    },
    app
  )
  .listen(PORT, () => {
    console.log(`🚀 [SERVER] is running on port http://localhost:${PORT}`);
  });
