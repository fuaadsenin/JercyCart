const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema");
const productDetails = async (req, res) => {
  try {
    const userId = req.session.user || req.session.passport?.user;
    const userData = await User.findById(userId);
    const productId = req.query.id;

    if (!productId) {
      throw new Error("Product ID not provided");
    }

    const product = await Product.findById(productId).populate("category");
    if (
      !product ||
      !product.productImage ||
      product.productImage.length === 0
    ) {
      throw new Error("Product or images not found");
    }

    const categoryOffer = product.category?.categoryOffer || 0;
    const productOffer = product.productOffer || 0;
    const totalOffer = categoryOffer + productOffer;

    const relatedProduct = await Product.find({
      category: product.category,
      _id: { $ne: product._id },
    })
      .select("productName productImage salePrice")
      .limit(4);

    // Ensure `variants` is always defined
    product.variants = product.variants || [];

    res.render("product-detail", {
      user: userData,
      product: product,
      quantity: product.quantity || 0,
      totalOffer: totalOffer,
      category: product.category,
      relatedProduct,
    });
  } catch (error) {
    console.error(
      "Error fetching product detail for productId:",
      req.query.id,
      error.message
    );
    res.redirect("/pageNotFound");
  }
};

module.exports = {
  productDetails,
};
