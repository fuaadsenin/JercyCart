const User = require("../../models/userSchema");
const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");
const Banner = require("../../models/BannerSchema");
const Wallet = require("../../models/walletSchema");
const Wishlist=require("../../models/wishlistSchema")
const Cart=require("../../models/cartSchema")
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt")
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
    const today = new Date().toISOString();
    const findBanner = await Banner.find({
      startDate: { $lt: new Date(today) },
      endDate: { $gt: new Date(today) },
    });
    const user = req.session.user || req.session.passport?.user;

    let wishlistCount = 0;
    let cartCount = 0;

    if (user) {
      
     

      const cart = await Cart.findOne({ userId: user });
      cartCount = cart ? cart.items.length : 0;
     
      
    }

    // Fetch user from the session
    const categories = await Category.find({ isListed: true });
    let productData = await Product.find({
      isBlocked: false,
      category: { $in: categories.map((category) => category._id) },
      $or: [
        { "varient.small": { $gt: 0 } },
        { "varient.medium": { $gt: 0 } },
        { "varient.large": { $gt: 0 } },
        { "varient.xLarge": { $gt: 0 } },
      ],
    });

    productData.sort((a, b) => new Date(b.createdOn) - new Date(a.createdOn));
    productData = productData.slice(0, 4);

    if (user) {
      const userData = await User.findById(user);
      wishlistCount=userData.wishlist.length
      
      
      res.render("home", {
        user: userData,
        products: productData,
        banner: findBanner || [],
        wishlistCount,
        cartCount
      }); // Pass user details to EJS
    } else {
      res.render("home", {
        user: null,
        products: productData,
        banner: findBanner || [],
        wishlistCount,
        cartCount
      }); // No user logged in
    }
  } catch (error) {
    console.error("Error loading homepage:", error);
    res.status(500).send("Server error");
  }
};

const loadLoginPage = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.render("login", { message: "" });
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

    const findUser = await User.findOne({ isAdmin: 0, email });

    if (!findUser) {
      return res.render("login", { message: "User not found" });
    }

    if (findUser.isBlocked) {
      return res.render("login", { message: "User is blocked by Admin" });
    }

    const passwordMatch = await bcrypt.compare(password, findUser.password);
    if (!passwordMatch) {
      return res.render("login", { message: "Incorrect password" });
    }

    req.session.user = { _id: findUser._id, name: findUser.name };

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

const generateReferralCode = (name) => {
  return `${name.substring(0, 3)}-${Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase()}`;
};

const signup = async (req, res) => {
  try {
    const { name, phone, email, password, cpassword, referralCode } = req.body;

    const newReferralCode = generateReferralCode(name);

    let referredBy = null;
    let nreferralCode = referralCode.trim();
    if (nreferralCode) {
      const referrer = await User.findOne({ referralCode: nreferralCode });
      console.log(referrer);

      if (!referrer) {
        return res.render("signup", { message: "Invalid referral code" });
      }

      referredBy = nreferralCode; // Save the referral code of the referrer
      console.log("Referred by:", referredBy);

      // Add 50 rupees to the referrer's wallet
      let referrerWallet = await Wallet.findOne({ user: referrer._id });
      if (!referrerWallet) {
        referrerWallet = new Wallet({ user: referrer._id });
      }
      referrerWallet.balance += 50;
      referrerWallet.transactions.push({
        type: "credit",
        amount: 50,
        description: "Referral bonus for referring a new user",
      });
      await referrerWallet.save();
    }

    if (password !== cpassword) {
      return res.render("signup", { message: "Passwords do not match" });
    }

    const findUser = await User.findOne({ email });
    if (findUser) {
      return res.render("signup", {
        message: "User with this email already exists",
      });
    }

    const otp = generateOtp();

    const emailSent = await sendVerificationEmail(email, otp);
    if (!emailSent) {
      return res.json("email-error");
    }

    req.session.userOtp = otp;
    req.session.userData = {
      name,
      phone,
      email,
      password,
      newReferralCode,
      referredBy,
    };

    res.render("verify-otp");
    console.log("OTP sent", otp);
  } catch (error) {
    console.error("Signup error:", error);
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
    const { otp } = req.body;

    console.log(otp);

    // Ensure OTP is stored in the session
    if (!req.session.userOtp) {
      return res.status(400).json({
        success: false,
        message: "Session expired. Please request a new OTP.",
      });
    }

    // Compare OTPs
    if (otp === req.session.userOtp) {
      const { name, phone, email, password, newReferralCode, referredBy } =
        req.session.userData;
      const passwordHash = await securePassword(password);
      console.log(req.session.userData);

      const saveUserData = new User({
        name: name,
        email: email,
        phone: phone,
        password: passwordHash,
        referralCode: newReferralCode,
        referredBy,
      });
      await saveUserData.save();
      req.session.user = saveUserData._id;
      res.json({ success: true, redirectUrl: "/login" });
    } else {
      res
        .status(400)
        .json({ success: false, message: "Invaled OTP , please try again" });
    }
  } catch (error) {
    console.error("Error verify OTP", error);
    res.status(500).json({ success: false, message: "An error occured" });
  }
};

const resendOtp = async (req, res) => {
  try {
    const { email } = req.session.userData;
    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email not found in session" });
    }
    const otp = generateOtp();
    req.session.userOtp = otp;

    const emailSent = await sendVerificationEmail(email, otp);
    if (emailSent) {
      console.log("Resend OTP", otp);
      res
        .status(200)
        .json({ success: true, message: "OTP Resend Successfuly" });
    } else {
      res.status(500).json({
        success: false,
        message: "faild to resend OTP,please try again",
      });
    }
  } catch (error) {
    console.error("Error resend OTP", error);
    res.status(500).json({
      success: false,
      message: "Internal server error,please try again",
    });
  }
};

const loadShoppingPage = async (req, res) => {
  try {
    const user = req.session.user || req.session.passport?.user;

    
    let cartCount = 0;

    if (user) {
      

      const cart = await Cart.findOne({ userId: user });
      cartCount = cart ? cart.items.length : 0;
    }
    if (!user) {
      return res.redirect("/login");
    }

    const userData = await User.findOne({ _id: user });
    if (!userData) {
      return res.redirect("/login");
    }
    wishlistCount=userData.wishlist.length
    
    const categories = await Category.find({ isListed: true });
    const sortOption = req.query.sort || "";
    const search = req.query.search || ""; // Adjust search handling here
    const categoryId = req.query.category || null;

    let query = {
      isBlocked: false,
      $or: [
        { "varient.small": { $gt: 0 } },
        { "varient.medium": { $gt: 0 } },
        { "varient.large": { $gt: 0 } },
        { "varient.xLarge": { $gt: 0 } },
      ],
    };

    if (categoryId) query.category = categoryId;
    if (search) query.productName = { $regex: search, $options: "i" };

    let sortCriteria = {};
    if (sortOption === "new") sortCriteria = { createdOn: -1 };
    if (sortOption === "asc") sortCriteria = { productName: 1 };
    if (sortOption === "desc") sortCriteria = { productName: -1 };

    const products = await Product.find(query).sort(sortCriteria);
    const totalProducts = await Product.countDocuments(query);

    res.render("shop", {
      user: userData,
      products,
      categories,
      totalProducts,
      sortOption,
      selectedCategory: categoryId,
      search,
      wishlistCount,
      cartCount,
    });
  } catch (error) {
    console.error("Error loading shop page:", error.message);
    res.redirect("/pageNotFound");
  }
};

const filterProduct = async (req, res) => {
  try {
    const user = req.session.user || req.session.passport?.user;

    let cartCount = 0;

    if (user) {
      

      const cart = await Cart.findOne({ userId: user });
      cartCount = cart ? cart.items.length : 0;
    }
    const category = req.query.category || null;
    const search = req.body.query || null;
    const sortOption = req.query.sort || null;
    const minPrice = parseFloat(req.query.gt) || 0;
    const maxPrice = parseFloat(req.query.lt) || Infinity;

    const query = {
      isBlocked: false,
      $or: [
        { "varient.small": { $gt: 0 } },
        { "varient.medium": { $gt: 0 } },
        { "varient.large": { $gt: 0 } },
        { "varient.xLarge": { $gt: 0 } },
      ],
    };

    if (category) query.category = category;
    if (search) query.productName = { $regex: search, $options: "i" };
    if (minPrice || maxPrice)
      query.salePrice = { $gte: minPrice, $lte: maxPrice };

    let products = await Product.find(query).lean();

    // Sorting Logic
    if (sortOption === "new") {
      products.sort((a, b) => new Date(b.createdOn) - new Date(a.createdOn));
    } else if (sortOption === "asc") {
      products.sort((a, b) => a.productName.localeCompare(b.productName));
    } else if (sortOption === "desc") {
      products.sort((a, b) => b.productName.localeCompare(a.productName));
    }

    const categories = await Category.find({ isListed: true }).lean();
    const userData = user ? await User.findOne({ _id: user }) : null;
    wishlistCount=userData.wishlist.length
    res.render("shop", {
      user: userData,
      products,
      categories,
      selectedCategory: category || null,
      sortOption,
      query,
      search: search || "", // Pass the search value
      wishlistCount,
      cartCount
    });
  } catch (error) {
    console.error("Error filtering products:", error);
    res.redirect("/pageNotFound");
  }
};

const filterByPrice = async (req, res) => {
  try {
    const user = req.session.user || req.session.passport?.user;

    
    let cartCount = 0;

    if (user) {
      

      const cart = await Cart.findOne({ userId: user });
      cartCount = cart ? cart.items.length : 0;
    }
    const userData = await User.findOne({ _id: user });
    wishlistCount=userData.wishlist.length
    const categories = await Category.find({ isListed: true }).lean();

    const minPrice = parseFloat(req.query.gt) || 0;
    const maxPrice = parseFloat(req.query.lt) || Infinity;

    let findProducts = await Product.find({
      salePrice: { $gt: minPrice, $lt: maxPrice },
      isBlocked: false,
      $or: [
        { "varient.small": { $gt: 0 } },
        { "varient.medium": { $gt: 0 } },
        { "varient.large": { $gt: 0 } },
        { "varient.xLarge": { $gt: 0 } },
      ],
    }).lean();

    if (req.query.sort === "new") {
      findProducts.sort(
        (a, b) => new Date(b.createdOn) - new Date(a.createdOn)
      );
    } else if (req.query.sort === "asc") {
      findProducts.sort((a, b) => a.productName.localeCompare(b.productName));
    } else if (req.query.sort === "desc") {
      findProducts.sort((a, b) => b.productName.localeCompare(a.productName));
    }

    // Pagination logic
    const page = parseInt(req.query.page) || 1;
    const itemsPerPage = 9;
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const totalPages = Math.ceil(findProducts.length / itemsPerPage);
    const currentProduct = findProducts.slice(startIndex, endIndex);

    res.render("shop", {
      user: userData,
      products: currentProduct,
      categories,
      totalPages,
      currentPage: page,
      selectedCategory: req.query.category || "",
      sortOption: req.query.sort || "",
      search: req.query.search || "", // Pass search if needed
      wishlistCount,
      cartCount
    });
  } catch (error) {
    console.log(error);
    res.redirect("/pageNotFound");
  }
};

const searchProducts = async (req, res) => {
  try {
    const user = req.session.user || req.session.passport?.user;

    
    let cartCount = 0;

    if (user) {
      

      const cart = await Cart.findOne({ userId: user });
      cartCount = cart ? cart.items.length : 0;
    }
    const userData = await User.findOne({ _id: user });
    wishlistCount=userData.wishlist.length

    const search = req.body.query;
    const category = req.body.category || req.query.category || null;

    const categories = await Category.find({ isListed: true }).lean();

    let searchResult = [];

   
    if (category) {
      searchResult = await Product.find({
        productName: { $regex: ".*" + search + ".*", $options: "i" },
        isBlocked: false,
        category: category,
        $or: [
          { "varient.small": { $gt: 0 } },
          { "varient.medium": { $gt: 0 } },
          { "varient.large": { $gt: 0 } },
          { "varient.xLarge": { $gt: 0 } },
        ],
      }).lean();
    } else {
      searchResult = await Product.find({
        productName: { $regex: ".*" + search + ".*", $options: "i" },
        isBlocked: false,
        $or: [
          { "varient.small": { $gt: 0 } },
          { "varient.medium": { $gt: 0 } },
          { "varient.large": { $gt: 0 } },
          { "varient.xLarge": { $gt: 0 } },
        ],
      }).lean();
    }

    // Handle no results found
    if (searchResult.length === 0) {
      return res.render("shop", {
        user: userData,
        products: [],
        categories: categories,
        count: 0,
        currentPage: 1,
        totalPages: 1,
        sortOption: req.query.sort || "",
        search,
        selectedCategory: category || null,
        message: "No products found",
        wishlistCount,
        cartCount
      });
    }

    // Pagination setup
    const productsPerPage = 10;
    const page = parseInt(req.query.page) || 1;
    const startIndex = (page - 1) * productsPerPage;
    const endIndex = page * productsPerPage;

    const currentProduct = searchResult.slice(startIndex, endIndex);

    res.render("shop", {
      user: userData,
      products: currentProduct,
      categories: categories,
      count: searchResult.length,
      currentPage: page,
      totalPages: Math.ceil(searchResult.length / productsPerPage),
      sortOption: req.query.sort,
      search,
      selectedCategory: category,
      wishlistCount,
      cartCount,
    });
  } catch (error) {
    console.log("Error:", error);
    res.redirect("/pageNotFound");
  }
};

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
  loadShoppingPage,
  filterProduct,
  filterByPrice,
  searchProducts,
};
