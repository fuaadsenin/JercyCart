const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const product = require("../../models/productSchema");

const loadWishlist = async (req, res) => {
  try {
    const userId = req.session.user || req.session.passport?.user;

    if (!userId) {
      console.error("User not logged in");
      return res.redirect("/login");
    }

    const user = await User.findById(userId);

    if (!user) {
      console.error("User not found");
      return res.redirect("/login");
    }

    const wishlist = user.wishlist || [];

    const products = await Product.find({ _id: { $in: wishlist } }).populate(
      "category"
    );

   
    res.render("wishlist", {
      user,
      wishlist: products,
    });
  } catch (error) {
    console.error("Error in loadWishlist:", error);
    res.redirect("/pageNotFound");
  }
};

const addToWishlist = async (req, res) => {
  try {
    const { productId } = req.body;
    const userId = req.session.user || req.session.passport?.user;

    if (!userId) {
      return res
        .status(401)
        .json({ status: false, message: "User not logged in" });
    }

    if (!productId) {
      return res
        .status(400)
        .json({ status: false, message: "Product ID is required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ status: false, message: "User not found" });
    }

    if (!Array.isArray(user.wishlist)) {
      user.wishlist = [];
    }

    if (user.wishlist.includes(productId)) {
      return res
        .status(409)
        .json({ status: false, message: "Product already in wishlist" });
    }

    user.wishlist.push(productId);
    await user.save();

    return res
      .status(200)
      .json({ status: true, message: "Product added to wishlist" });
  } catch (error) {
    console.error("Error in addToWishlist:", error);
    return res
      .status(500)
      .json({ status: false, message: "An unexpected error occurred" });
  }
};

const removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.body;
    const userId = req.session.user || req.passport?.user;

    if (!userId) {
      return res
        .status(400)
        .json({ status: false, message: "User is not logged in" });
    }

    if (!productId) {
      return res
        .status(400)
        .json({ status: false, message: "Product is required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(400).json({ status: false, message: "User not found" });
    }

    if (!Array.isArray(user.wishlist)) {
      user.wishlist = [];
    }

    const productIndex = user.wishlist.indexOf(productId);
    if (productIndex === -1) {
      return res
        .status(400)
        .json({ status: false, message: "Product is not found in wishlist" });
    }

    user.wishlist.splice(productIndex, 1);
    await user.save();

    return res.status(200).json({
      status: true,
      message: "Product successfully removed from wishlist",
    });
  } catch (error) {
    console.log("Wishlist removing error:", error);
    return res
      .status(500)
      .json({ status: false, message: "An error occurred while removing" });
  }
};

module.exports = {
  loadWishlist,
  addToWishlist,
  removeFromWishlist,
};
