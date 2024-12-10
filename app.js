const express = require("express");
const app = express();
const path = require("path");
const session = require("express-session");
const passport = require("./config/passport");
const env = require("dotenv").config();
const userRouter = require("./routes/userRouter");
const adminRouter = require("./routes/adminRouter");
const db = require("./config/db");
db();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 72 * 60 * 60 * 1000,
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
  res.set("cache-control", "no-store");
  next();
});

app.set("view engine", "ejs");
app.set("views", [
  path.join(__dirname, "views/user"),
  path.join(__dirname, "views/admin"),
]);
app.use(express.static(path.join(__dirname, "public")));




app.use("/admin", adminRouter);
app.use("/", userRouter);

const PORT = process.env.PORT || 3002;

app.listen(PORT, (err) => {
  if (err) {
    console.error("Failed to start server:", err.message);
  } else {
    console.log(`Server running on port ${PORT}`);
  }
});

module.exports = app;
