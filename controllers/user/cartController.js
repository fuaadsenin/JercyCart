const Cart = require("../../models/cartSchema");
const Product = require("../../models/productSchema");
const User = require("../../models/userSchema");
const mongoose = require("mongoose");

const getCartPage = async (req, res) => {
  const userId = req.session.user || req.session.passport?.user;

  try {
    const userData = await User.findById(userId);
    if (!userData) {
      return res.redirect("/login"); // Redirect to login if user is not found
    }

    const cart = await Cart.findOne({ userId }).populate("items.productId");

    if (!cart || cart.items.length === 0) {
      return res.render("cart", {
        user: userData,
        cart: [], // Empty cart array
        totalItems: 0,
        totalPrice: 0,
      });
    }

    const totalItems = cart.items.reduce((acc, item) => acc + item.quantity, 0);
    const totalPrice = cart.items.reduce(
      (acc, item) => acc + item.totalPrice,
      0
    );

    // Pass the data to the view
    res.render("cart", {
      user: userData,
      cart: cart.items,
      totalItems: totalItems,
      totalPrice: totalPrice,
    });
  } catch (error) {
    console.error(error);
    res.redirect("/pageNotFound"); // Handle errors by redirecting to a page not found
  }
};

const addCart = async (req, res) => {
  const {
    productId,
    quantity,
    size,
    productName,
    productImage,
    regularPrice,
    salePrice,
  } = req.body;

  const userId = req.session.user || req.session.passport?.user;

  if (!userId) {
    return res
      .status(401)
      .json({ success: false, message: "User not authenticated" });
  }

  const quantityNum = parseInt(quantity);
  const selectedSize = size;
  const MAX_LIMIT = 5;

  try {
    const product = await Product.findById(productId);

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    if (!product.varient.hasOwnProperty(selectedSize)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid size selected." });
    }

    let cart = await Cart.findOne({ userId });
    let currentCartQuantity = 0;

    if (cart) {
      const existingItem = cart.items.find(
        (item) =>
          item.productId.toString() === productId && item.size === selectedSize
      );

      if (existingItem) {
        currentCartQuantity = existingItem.quantity;
      }
    }

    const availableStock = product.varient[selectedSize];
    const totalRequestedQuantity = currentCartQuantity + quantityNum;

    // Check if requested quantity exceeds stock
    if (totalRequestedQuantity > availableStock) {
      return res.status(400).json({
        success: false,
        message: `Only ${
          availableStock - currentCartQuantity
        } more units of size ${selectedSize} are available in stock.`,
      });
    }

    // Check if requested quantity exceeds cart limit
    if (totalRequestedQuantity > MAX_LIMIT) {
      return res.status(400).json({
        success: false,
        message: `You can only add up to ${MAX_LIMIT} units of a product per size. You already have ${currentCartQuantity} in your cart.`,
      });
    }

    // Deduct requested quantity from stock
    product.varient[selectedSize] -= quantityNum;
    await product.save();

    if (!cart) {
      // Create a new cart if it doesn't exist
      const newCart = new Cart({
        userId,
        items: [
          {
            productId,
            productName,
            productImage,
            quantity: quantityNum,
            size: selectedSize,
            price: salePrice || regularPrice,
            totalPrice: (salePrice || regularPrice) * quantityNum,
          },
        ],
      });

      await newCart.save();
      return res.status(200).json({
        success: true,
        message: "Product added to cart",
        cart: newCart,
      });
    }

    const existingItemIndex = cart.items.findIndex(
      (item) =>
        item.productId.toString() === productId && item.size === selectedSize
    );

    if (existingItemIndex !== -1) {
      const existingItem = cart.items[existingItemIndex];
      existingItem.quantity += quantityNum;
      existingItem.totalPrice =
        existingItem.quantity * (salePrice || regularPrice);

      await cart.save();
      return res.status(200).json({
        success: true,
        message: "Quantity updated in the cart",
        cart,
      });
    }

    cart.items.push({
      productId,
      productName,
      productImage,
      quantity: quantityNum,
      size: selectedSize,
      price: salePrice || regularPrice,
      totalPrice: (salePrice || regularPrice) * quantityNum,
    });

    await cart.save();
    return res.status(200).json({
      success: true,
      message: "Product added to the cart",
      cart,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "An error occurred, please try again later",
    });
  }
};

const updateQuantity = async (req, res) => {
  const { productId, quantity } = req.body;
  const userId = req.session.user || req.session.passport?.user;

  try {
    const cart = await Cart.findOne({ userId });
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).send("Product not found");
    }

    const size = req.body.size;
    const availableStock = product.varient[size];

    if (quantity > availableStock) {
      return res.status(400).json({
        message: `Cannot add more than ${availableStock} items to the cart.`,
      });
    }

    const item = cart.items.find((i) => i.productId.toString() === productId);

    if (!item) return res.status(404).send("Item not found in cart");

    item.quantity = quantity;
    item.totalPrice = item.quantity * product.salePrice;

    await cart.save();

    const totalItems = cart.items.reduce((acc, item) => acc + item.quantity, 0);
    const totalPrice = cart.items.reduce(
      (acc, item) => acc + item.totalPrice,
      0
    );

    res.json({
      itemTotalPrice: item.totalPrice,
      totalItems,
      totalPrice,
      message: "Cart updated successfully!",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong." });
  }
};

const removeItem = async (req, res) => {
  const { productId, size } = req.body;
  const userId = req.session.user || req.session.passport?.user;
  if (!productId || !size) {
    return res.status(400).json({ error: "Product ID and size are required" });
  }

  console.log(
    "Received request to remove item with productId:",
    productId,
    "and size:",
    size
  );

  try {
    const cart = await Cart.findOne({ userId });

    if (!cart) {
      console.log("Cart not found for user:", userId);
      return res.status(404).json({ error: "Cart not found" });
    }

    if (!cart.items || cart.items.length === 0) {
      console.log("Cart is empty.");
      return res.status(404).json({ error: "Cart is empty." });
    }

    const sizeLowerCase = size.trim().toLowerCase();
    const productObjectId = new mongoose.Types.ObjectId(productId);

    // Debug cart items
    console.log("Cart items before removal:", cart.items);

    // Find the index of the item
    const itemIndex = cart.items.findIndex((item) => {
      const isProductMatch =
        item.productId.toString() === productObjectId.toString();
      const isSizeMatch = item.size.toLowerCase() === sizeLowerCase;

      console.log("Checking item:", {
        productId: item.productId.toString(),
        size: item.size,
        isProductMatch,
        isSizeMatch,
      });

      return isProductMatch && isSizeMatch;
    });

    if (itemIndex === -1) {
      console.log("Item not found in cart");
      return res.status(404).json({ error: "Product not found in cart" });
    }

    const itemToRemove = cart.items[itemIndex];

    // Restore stock
    const product = await Product.findById(productObjectId);
    if (product) {
      product.varient[sizeLowerCase] += itemToRemove.quantity;
      await product.save();
    } else {
      console.warn("Product not found while restoring stock");
    }

    // Remove item and save
    cart.items.splice(itemIndex, 1);
    await cart.save();

    console.log("Item removed from cart and stock restored successfully");
    res
      .status(200)
      .json({ message: "Item successfully removed from the cart!" });
  } catch (error) {
    console.error("Error during item removal:", error);
    res.status(500).json({ error: "Server error occurred" });
  }
};

module.exports = {
  getCartPage,
  addCart,
  updateQuantity,
  removeItem,
};
