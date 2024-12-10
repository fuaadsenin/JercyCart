const User = require("../../models/userSchema");
const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const category = require("../../models/categorySchema");
const product = require("../../models/productSchema");
const env = require("dotenv").config();

const pageNotFound = async (req, res) => {
  try {
    return res.render("page.404");
  } catch (error) {
    res.redirect("/pageNotFound");
  }
};

const loadHomepage = async (req, res) => {
  try {
    const user = req.session.user || req.session.passport?.user;

    // Fetch user from the session
    const categories = await Category.find({ isListed: true });
    let productData = await Product.find({
      isBlocked: false,
      category: { $in: categories.map((category) => category._id) },
      quantity: { $gt: 0 },
    });

    productData.sort((a, b) => new Date(b.createdOn) - new Date(a.createdOn));
    productData = productData.slice(0, 4);

    if (user) {
      const userData = await User.findById(user);
      // Optional: Fetch full user details
      res.render("home", { user: userData, products: productData }); // Pass user details to EJS
    } else {
      res.render("home", { user: null, products: productData }); // No user logged in
    }
  } catch (error) {
    console.error("Error loading homepage:", error);
    res.status(500).send("Server error");
  }
};

const loadLoginPage = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.render("login",{ message: "" });
    } else {
      res.redirect("/");
    }
  } catch (error) {
    res.redirect("/pageNotFound");
  }
};
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find the user by email and ensure they are not an admin
    const findUser = await User.findOne({ isAdmin: 0, email });

    if (!findUser) {
      return res.render("login", { message: "User not found" });
    }

    // Check if the user is blocked
    if (findUser.isBlocked) {
      return res.render("login", { message: "User is blocked by Admin" });
    }

    // Compare the provided password with the stored hash
    const passwordMatch = await bcrypt.compare(password, findUser.password);
    if (!passwordMatch) {
      return res.render("login", { message: "Incorrect password" });
    }

    // Set session data after successful login
    req.session.user = { _id: findUser._id, name: findUser.name };

    console.log("User logged in:", req.session.user); // Debugging line to check session data

    // Redirect to the home page or user dashboard
    res.redirect("/");
  } catch (error) {
    console.error("Login error:", error);
    res.render("login", { message: "Login failed, please try again" });
  }
};

const logout = async (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.log("session Destruction Error", err.message);
        return res.redirect("/pageNotFound");
      }
      return res.redirect("/login");
    });
  } catch (error) {
    console.log("Logout error", error);
    res.redirect("/pageNotFound");
  }
};

const loadSignupPage = async (req, res) => {
  try {
    return res.render("signup");
  } catch {
    res.redirect("/pageNotFound");
  }
};
const loadForgetpassword = async (req, res) => {
  try {
    return res.render("forgetpassword");
  } catch (error) {
    res.redirect("/pageNotFound");
  }
};

function generateOtp() {
  return Math.floor(10000 + Math.random() * 900000).toString();
}
async function sendVerificationEmail(email, otp) {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD,
      },
    });
    const info = await transporter.sendMail({
      from: process.env.NODEMAILER_EMAIL,
      to: email,
      subject: "verify your account",
      text: `your otp is ${otp}`,
      html: `<b>Your OTP:${otp}</b>`,
    });
    return info.accepted.length > 0;
  } catch (error) {
    console.error("Erorr sending email", error);
    return false;
  }
}

const signup = async (req, res) => {
  try {
    const { name, phone, email, password, cpassword } = req.body;

    if (password !== cpassword) {
      return res.render("signup", { message: "password do not match" });
    }
    const findUser = await User.findOne({ email });
    if (findUser) {
      return res.render("signup", {
        message: "user with this email already exists",
      });
    }
    const otp = generateOtp();

    const emailSent = await sendVerificationEmail(email, otp);
    if (!emailSent) {
      return res.json("email-error");
    }
    req.session.userOtp = otp;
    req.session.userData = { name, phone, email, password };
    res.render("verify-otp");
    console.log("OTP sent", otp);
  } catch (error) {
    console.error("signup error", error);
    res.redirect("/pageNotFound");
  }
};

const securePassword = async (password) => {
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    return passwordHash;
  } catch (error) {}
};

const verifyotp = async (req, res) => {
  try {
      const { otp } = req.body

      console.log(otp);

      // Ensure OTP is stored in the session
      if (!req.session.userOtp) {
          return res.status(400).json({ success: false, message: "Session expired. Please request a new OTP." });
      }

      // Compare OTPs
      if (otp === req.session.userOtp) {
          const user = req.session.userData;
          const passwordHash = await securePassword(user.password);

          const saveUserData = new User({
              name: user.name,
              email: user.email,
              phone: user.phone,
              password: passwordHash,
          })
          await saveUserData.save()
          req.session.user = saveUserData._id;
          res.json({ success: true, redirectUrl: "/login" })
      } else {
          res.status(400).json({ success: false, message: "Invaled OTP , please try again" });
      }

  } catch (error) {
      console.error("Error verify OTP", error);
      res.status(500).json({ success: false, message: "An error occured" })

  }
}


const resendOtp = async (req, res) => {
  try {
      const { email } = req.session.userData;
      if (!email) {
          return res.status(400).json({ success: false, message: "Email not found in session" })
      }
      const otp = generateOtp();
      req.session.userOtp = otp;

      const emailSent = await sendVerificationEmail(email, otp);
      if (emailSent) {
          console.log("Resend OTP", otp);
          res.status(200).json({ success: true, message: "OTP Resend Successfuly" })

      } else {
          res.status(500).json({ success: false, message: "faild to resend OTP,please try again" })
      }

  } catch (error) {
      console.error("Error resend OTP", error);
      res.status(500).json({ success: false, message: "Internal server error,please try again" })
  }
}

module.exports = {
  loadHomepage,
  pageNotFound,
  loadLoginPage,
  loadSignupPage,
  loadForgetpassword,
  signup,
  verifyotp,
  resendOtp,
  login,
  logout,
};
