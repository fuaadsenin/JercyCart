const User = require("../../models/userSchema");
const Address = require("../../models/addressSchema");
const Order = require("../../models/orderSchema");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const Cart = require("../../models/cartSchema");
const session = require("express-session");
const Wishlist = require("../../models/wishlistSchema");
require("dotenv").config();
function generateOtp() {
  const digits = "1234567890";
  let otp = "";
  for (let i = 0; i < 6; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  console.log("Generated OTP:", otp); // Log OTP to check if it's being generated
  return otp;
}

const sendVerificationEmail = async (email, otp) => {
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

    const mailOptions = {
      from: process.env.NODEMAILER_EMAIL,
      to: email,
      subject: "Your OTP for password reset",
      html: `<b>Your OTP: ${otp}</b>`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent:", info.messageId);
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
};

const securePassword = async (password) => {
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    return passwordHash;
  } catch (error) {}
};

const getForgotPassPage = async (req, res) => {
  try {
    // Check if user is logged in via session or other method
    const user = req.session.user || null; // Default to null if no user is logged in

    // Pass 'user' to the view context
    res.render("forgot-password", { message: null, user });
  } catch (error) {
    console.error("Error rendering forgot-password page:", error);
    res.redirect("/pageNotFound");
  }
};

const forgotEmailValid = async (req, res) => {
  try {
    const { email } = req.body;
    const findUser = await User.findOne({ email });

    if (findUser) {
      const otp = generateOtp();
      const emailSent = await sendVerificationEmail(email, otp);

      if (emailSent) {
        req.session.userOtp = otp;
        req.session.email = email;
        req.session.otpTimestamp = Date.now(); // Store the timestamp for OTP expiry

        // Pass user to the view
        const user = req.session.user || null; // Default to null if no user is logged in
        res.render("forgot-otp", { message: null, user });
      } else {
        res.render("forgot-password", {
          message: "Failed to send OTP. Please try again.",
        });
      }
    } else {
      res.render("forgot-password", {
        message: "User with this email does not exist.",
      });
    }
  } catch (error) {
    console.error("Error in forgotEmailValid:", error);
    res.redirect("/pageNotFound");
  }
};

const verifyForgotPassOtp = async (req, res) => {
  try {
    const enteredOtp = req.body.otp;
    const otpTimestamp = req.session.otpTimestamp;
    const otpExpiryTime = 5 * 60 * 1000; // OTP expires after 5 minutes

    if (!otpTimestamp || Date.now() - otpTimestamp > otpExpiryTime) {
      return res.json({
        success: false,
        message: "OTP has expired. Please request a new one.",
      });
    }

    if (enteredOtp === req.session.userOtp) {
      req.session.isOtpVerified = true;
      res.json({ success: true, redirectUrl: "/reset-password" });
    } else {
      res.json({ success: false, message: "OTP does not match" });
    }
  } catch (error) {
    console.error("Error in OTP verification:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred. Please try again.",
    });
  }
};

const getResetPassPage = async (req, res) => {
  try {
    if (!req.session.isOtpVerified || !req.session.email) {
      return res.redirect("/pageNotFound");
    }

    const findUser = await User.findOne({ email: req.session.email });

    if (!findUser) {
      return res.redirect("/pageNotFound");
    }

    res.render("reset-password", { user: findUser });
  } catch (error) {
    console.error("Error in getResetPassPage:", error);
    res.redirect("/pageNotFound");
  }
};

const resendOtp = async (req, res) => {
  try {
    const otp = generateOtp();
    req.session.userOtp = otp;
    const email = req.session.email;
    console.log("resending OTP to email:", email);
    const emailSent = await sendVerificationEmail(email, otp);
    if (emailSent) {
      console.log("resend Otp:", otp);
      res
        .status(200)
        .json({ success: true, message: "resend OTP successfull" });
    }
  } catch (error) {
    console.error("Erorr in resend OTP ", error);
    res.status(500).json({ success: false, message: "Internal Server ERROR" });
  }
};

const postNewpassword = async (req, res) => {
  try {
    const { newPass1, newPass2 } = req.body;
    const email = req.session.email;
    if (newPass1 === newPass2) {
      const passwordHash = await securePassword(newPass1);
      await User.updateOne(
        { email: email },
        { $set: { password: passwordHash } }
      );
      res.redirect("/login");
    } else {
      res.render("reset-password", {
        message: "password do not match",
        user: findUser,
      });
    }
  } catch (error) {
    res.redirect("/pageNotFound");
  }
};

const userProfile = async (req, res) => {
  try {
    const userId = req.session.user || req.session.passport?.user;
    const puser = req.session.passport?.user;
    const userData = await User.findById(userId);
    wishlistCount = userData.wishlist.length;
    let cartCount = 0;

    if (userId) {
      const cart = await Cart.findOne({ userId: userId });
      cartCount = cart ? cart.items.length : 0;
    }

    const addressData = await Address.findOne({ userId: userId });
    const orders = await Order.find({ userId })
      .populate({
        path: "orderedItems.product",
        model: "Product",
      })
      .sort({ createdOn: -1 });
    res.render("profile", {
      user: userData,
      userAddress: addressData,
      orders,
      puser,
      wishlistCount,
      cartCount,
    });
  } catch (error) {
    console.error("Error for retrive profile data", error);
    res.redirect("/pageNotFound");
  }
};

const changePassword = async (req, res) => {
  try {
    const user = req.session.user || req.session.passport?.user;
    const userData=await User.findOne({_id:user._id})
    wishlistCount=userData.wishlist.length

    const cart=await Cart.findOne({userId:user._id})
    cartCount = cart ? cart.items.length : 0;


    if (!user) {
      return res.redirect("/login"); // Redirect to login if the user is not logged in
    }

    res.render("profile-changePassword", { user,wishlistCount,cartCount });
  } catch (error) {
    console.error("Error in changePassword:", error);
    res.redirect("/pageNotFound");
  }
};

const changePasswordPost = async (req, res) => {
  try {
    const userId = req.session.user || req.session.passport?.user;

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized access." });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Both current and new passwords are required.",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    // Ensure User schema has a method to verify password
    const bcrypt = require("bcrypt"); // Use bcrypt for password comparison

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ success: false, message: "Current password is incorrect." });
    }

    // Hash new password before saving
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    await user.save();

    res
      .status(200)
      .json({ success: true, message: "Password updated successfully." });
  } catch (error) {
    console.error("Error in changePasswordPost:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};
const getAddress = async (req, res) => {
  try {
    const user = req.session.user || req.session.passport?.user;

    if (!user) {
      return res.redirect("/login"); // Redirect to login if no user session
    }
    if (user) {
      const cart = await Cart.findOne({ userId: user });
      cartCount = cart ? cart.items.length : 0;
    }
    const userData=await User.findOne({_id:user._id})
    wishlistCount=userData.wishlist.length

   


    // Fetch user's addresses from the database
    const userAddress = await Address.findOne({ userId: user._id });

    res.render("my-address", {
      user,
      userAddress,
      wishlistCount,
      cartCount // Pass the user's address to the view
    });
  } catch (error) {
    console.error("Error fetching user address:", error);
    res.redirect("/pageNotFound");
  }
};

const addAddress = async (req, res) => {
  try {
    const user = req.session.user || req.session.passport?.user;
    res.render("add-address", { user: user });
  } catch (error) {
    res.redirect("/pageNotFound");
  }
};

const postAddAddress = async (req, res) => {
  try {
    const userId = req.session.user || req.session.passport?.user;
    const userData = await User.findOne({ _id: userId });

    if (!userData) {
      return res.status(404).json({ message: "User not found" });
    }

    const { addressType, city, landMark, state, pincode, phone, altPhone } =
      req.body;

    // Find if the user already has an address
    let userAddress = await Address.findOne({ userId: userData._id });

    if (!userAddress) {
      // Create a new address document
      const newAddress = new Address({
        userId: userData._id,
        address: [
          { addressType, city, landMark, state, pincode, phone, altPhone },
        ],
      });
      await newAddress.save();
    } else {
      // Add the new address to the existing document
      userAddress.address.push({
        addressType,
        city,
        landMark,
        state,
        pincode,
        phone,
        altPhone,
      });
      await userAddress.save();
    }

    res.status(200).json({ message: "Address added successfully" });
  } catch (error) {
    console.error("Error in adding address:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const deleteAddress = async (req, res) => {
  try {
    const addressId = req.query.id;
    const findAddress = await Address.findOne({ "address._id": addressId });
    if (!findAddress) {
      return res.status(400).send("Address not found");
    }
    await Address.updateOne(
      {
        "address._id": addressId,
      },
      {
        $pull: {
          address: {
            _id: addressId,
          },
        },
      }
    );
    res.redirect("/getaddress");
  } catch (error) {
    console.error("Error in delete adress", error);
    res.redirect("/pageNotFound");
  }
};

const editAddress = async (req, res) => {
  try {
    const addressId = req.query.id; // Extracting id from query
    const user = req.session.user || req.session.passport?.user;
    const userData=await User.findOne({_id:user._id})
    wishlistCount=userData.wishlist.length

    const cart=await Cart.findOne({userId:user._id})
    cartCount = cart ? cart.items.length : 0;

    // Validate addressId
    if (!addressId || !mongoose.Types.ObjectId.isValid(addressId)) {
      console.error("Invalid address ID:", addressId);
      return res.redirect("/pageNotFound");
    }

    // Fetch the parent document containing the address
    const currentAddress = await Address.findOne({
      "address._id": addressId,
    });

    if (!currentAddress) {
      console.error("Address not found for ID:", addressId);
      return res.redirect("/pageNotFound");
    }

    // Find the specific address in the array
    const addressData = currentAddress.address.find((item) => {
      return item._id.toString() === addressId.toString();
    });

    if (!addressData) {
      console.error("Specific address not found in array for ID:", addressId);
      return res.redirect("/pageNotFound");
    }

    // Render the edit address page
    res.render("edit-address", { address: addressData, user: user ,wishlistCount,cartCount});
  } catch (error) {
    console.error("Error in editAddress:", error);
    res.redirect("/pageNotFound");
  }
};

const postEditAddress = async (req, res) => {
  try {
    const data = req.body; // Data from the client
    const addressId = req.query.id; // Address ID from the query
    const user = req.session.user || req.session.passport?.user;

    // Find the address by user ID and address ID
    const findAddress = await Address.findOne({
      "address._id": addressId,
      userId: user,
    });

    if (!findAddress) {
      return res.status(404).json({ message: "Address not found" });
    }

    // Update the address
    await Address.updateOne(
      { "address._id": addressId },
      {
        $set: {
          "address.$": {
            _id: addressId,
            addressType: data.addressType,
            city: data.city,
            landMark: data.landMark,
            state: data.state,
            pincode: data.pincode,
            phone: data.phone,
            altPhone: data.altPhone,
          },
        },
      }
    );

    res.status(200).json({ message: "Address updated successfully" });
  } catch (error) {
    console.error("Error in edit address:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getEditUser = async (req, res) => {
  try {
    const userId = req.session.user || req.session.passport?.user;
    const userData = await User.findOne({ _id: userId });
    wishlistCount=userData.wishlist.length

    const cart=await Cart.findOne({userId:user._id})
    cartCount = cart ? cart.items.length : 0;
    res.render("edit-user", {
      user: userData,
      wishlistCount,
      cartCount,
    });
  } catch (error) {
    res.redirect("/pageNotFound");
  }
};
const postEditUser = async (req, res) => {
  try {
    const userId = req.session.user || req.session.passport?.user;

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized access." });
    }

    const { name, phone } = req.body;

    // Validate input
    if (!name || !phone) {
      return res
        .status(400)
        .json({ success: false, message: "Name and phone are required." });
    }

    if (!/^[0-9]{10}$/.test(phone)) {
      return res
        .status(400)
        .json({ success: false, message: "Phone number must be 10 digits." });
    }

    // Update the user details in the database
    await User.updateOne({ _id: userId }, { $set: { name, phone } });

    return res
      .status(200)
      .json({ success: true, message: "User details updated successfully." });
  } catch (error) {
    console.error("Error in postEditUser:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while updating user details.",
    });
  }
};

const aboutUs = async (req, res) => {
  try {
    const user = req.session.user || req.passport?.user;

    if (!user) {
      return res.redirect("/login");
    }

    const userData = await User.findOne({ _id: user });

   
    wishlistCount=userData.wishlist.length

    const cart=await Cart.findOne({userId:user._id})
    cartCount = cart ? cart.items.length : 0;
    if (!userData) {
      return res.redirect("/login");
    }

    res.render("aboutUs", { user: userData,cartCount,wishlistCount });
  } catch (error) {
    console.error("Error fetching aboutpage", error.message);
    res.redirect("/pageNotFound");
  }
};
const faq = async (req, res) => {
  try {
    const user = req.session.user || req.passport?.user;

    if (!user) {
      return res.redirect("/login");
    }

    const userData = await User.findOne({ _id: user });
    wishlistCount=userData.wishlist.length

    const cart=await Cart.findOne({userId:user._id})
    cartCount = cart ? cart.items.length : 0;

    if (!userData) {
      return res.redirect("/login");
    }

    res.render("faq", { user: userData,wishlistCount ,cartCount});
  } catch (error) {
    console.error("Error fetching faqpage", error.message);
    res.redirect("/pageNotFound");
  }
};

module.exports = {
  getForgotPassPage,
  forgotEmailValid,
  verifyForgotPassOtp,
  getResetPassPage,
  postNewpassword,
  resendOtp,
  userProfile,
  changePassword,
  addAddress,
  postAddAddress,
  editAddress,
  postEditAddress,
  deleteAddress,
  changePasswordPost,
  getAddress,
  getEditUser,
  postEditUser,
  aboutUs,
  faq,
};
