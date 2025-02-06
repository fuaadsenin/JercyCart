const paymentController = require("../../controllers/user/paymentController");
const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Cart = require("../../models/cartSchema");
const Order = require("../../models/orderSchema");
const Address = require("../../models/addressSchema");
const Coupon = require("../../models/couponSchema");
const Wallet = require("../../models/walletSchema");
const env = require("dotenv").config();

const getCheckOutPage = async (req, res) => {
  const userId = req.session.user || req.session.passport?.user;

  if (!userId) {
    return res.redirect("/login"); // Redirect if user is not authenticated
  }

  try {
    // Fetch user data
    const user = await User.findById(userId);
    if (!user) {
      return res.redirect("/login");
    }
    const userData = await User.findById(user._id);
    wishlistCount=userData.wishlist.length


    // Fetch user's cart
    const cart = await Cart.findOne({ userId }).populate("items.productId");
    cartCount = cart ? cart.items.length : 0;
    const wallet = await Wallet.findOne({ user: userId });
    const walletBalance = wallet ? wallet.balance.toFixed(2) : 0;

    const coupons = await Coupon.find({ isList: true });

    let coupon = false;
    if (cart.coupon) {
      coupon = await Cart.findOne({ userId })
        .select("coupon")
        .populate("coupon");
    }

    // If cart is empty, provide default values
    if (!cart || cart.items.length === 0) {
      return res.render("check-out", {
        wallet: { balance: walletBalance },
        user,
        cartItems: [],
        totals: {
          subtotal: 0,
          tax: 0,
          total: 0,
          discount: 0,
          deliveryChargeDiscount: 0,
        },
        paymentMethods: ["COD", "Online Payment", "Wallet"],
        shippingAddress: "Please update your address.",
        addresses: [],
        finalPrice: 0, // Default finalPrice
        coupon,
        coupons,
        cartCount,
        wishlistCount
      });
    }

    const address = await Address.findOne({ userId });
    const addresses = address ? address.address : [];

    const subtotal = cart.items.reduce((sum, item) => sum + item.totalPrice, 0);

    const deliveryChargeDiscount = subtotal > 5000 ? 65 : 0;

    const deliveryCharge = deliveryChargeDiscount > 0 ? 0 : 65;

    const discount = cart.discount || 0;

    const finalPrice = subtotal + deliveryCharge - discount;

    const cartItems = cart.items.map((item) => ({
      productName: item.productId.productName,
      quantity: item.quantity,
      size: item.size,
      price: item.price,
      totalPrice: item.totalPrice,
      image: item.productId.productImage && item.productId.productImage[0],
    }));

    //
    const checkoutDetails = {
      user,
      wallet: { balance: walletBalance },
      cartItems,
      totals: {
        subtotal: subtotal.toFixed(2),
        total: (subtotal + deliveryCharge).toFixed(2),
        deliveryChargeDiscount: deliveryChargeDiscount,
        discount: discount.toFixed(2),
      },
      paymentMethods: ["COD", "Online Payment", "Wallet"],
      shippingAddress: addresses.length
        ? addresses[0]
        : "Please add an address.",
      addresses,
      coupon,
      coupons,
      finalPrice: finalPrice.toFixed(2),
      cartCount,
      wishlistCount
    };

    res.render("check-out", checkoutDetails);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to load checkout page." });
  }
};

// Add New Address
const addAddress = async (req, res) => {
  try {
    const { city, landMark, state, pincode, phone, altPhone, addressType } =
      req.body;
    const userId = req.session.user || req.session.passport?.user;

    // Validate required fields
    if (!city || !landMark || !state || !pincode || !phone || !addressType) {
      return res.status(400).json({ message: "All fields are required!" });
    }

    // Validate pincode and phone number formats
    const pincodeRegex = /^[0-9]{6}$/;
    const phoneRegex = /^[0-9]{10}$/;

    if (!pincode.match(pincodeRegex)) {
      return res
        .status(400)
        .json({ message: "Invalid pincode format. Must be 6 digits." });
    }
    if (!phone.match(phoneRegex)) {
      return res
        .status(400)
        .json({ message: "Invalid phone number. Must be 10 digits." });
    }

    const newAddress = {
      addressType,

      city,
      landMark,
      state,
      pincode,
      phone,
      altPhone,
    };

    const userAddress = await Address.findOne({ userId });

    if (userAddress) {
      userAddress.address.push(newAddress);
      await userAddress.save();
      return res
        .status(201)
        .json({ message: "Address added successfully", address: newAddress });
    } else {
      const newAddressDoc = new Address({
        userId,
        address: [newAddress],
      });
      await newAddressDoc.save();
      return res
        .status(201)
        .json({ message: "Address added successfully", address: newAddress });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error adding address", error });
  }
};

const editAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const { city, landMark, state, pincode, phone, altPhone, addressType } =
      req.body;

    if (!city || !state || !pincode || !phone || !addressType || !landMark) {
      return res.status(400).json({ message: "All fields are required!" });
    }

    const pincodeRegex = /^[0-9]{6}$/;
    const phoneRegex = /^[0-9]{10}$/;

    if (!pincode.match(pincodeRegex)) {
      return res
        .status(400)
        .json({ message: "Invalid pincode format. Must be 6 digits." });
    }
    if (!phone.match(phoneRegex)) {
      return res
        .status(400)
        .json({ message: "Invalid phone number. Must be 10 digits." });
    }

    const userAddress = await Address.findOne({
      "address._id": id,
      userId: req.session.user,
    });
    if (!userAddress) {
      return res.status(404).json({ message: "Address not found!" });
    }

    const addressToUpdate = userAddress.address.id(id);

    if (city) addressToUpdate.city = city;
    if (landMark) addressToUpdate.landMark = landMark;
    if (state) addressToUpdate.state = state;
    if (pincode) addressToUpdate.pincode = pincode;
    if (phone) addressToUpdate.phone = phone;
    if (altPhone) addressToUpdate.altPhone = altPhone;
    if (addressType) addressToUpdate.addressType = addressType;

    await userAddress.save();

    res.status(200).json({
      message: "Address updated successfully!",
      address: addressToUpdate,
    });
  } catch (error) {
    console.error("Error updating address:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

const placeOrder = async (req, res) => {
  try {
    const { paymentMethod, addressId, discountedTotal, appliedCoupon } =
      req.body;
    console.log(req.body);

    const userId = req.session.user || req.session.passport?.user;
    if (!userId) {
      return res.status(401).json({ message: "User is not authenticated" });
    }

    // Fetch user data
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const cart = await Cart.findOne({ userId }).populate("items.productId");
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: "Your cart is empty" });
    }

    const subtotal = cart.items.reduce((sum, item) => sum + item.totalPrice, 0);

    const deliveryCharge = subtotal > 5000 ? 0 : 65;
    const discount = Number(discountedTotal);
    const finalAmount = subtotal - discount + deliveryCharge;

    let wallet = await Wallet.findOne({ user: userId });
    if (!wallet) {
      wallet = new Wallet({ user: userId, balance: 0 }); // Set the `user` field correctly
      await wallet.save();
    }

    console.log(wallet.balance);

    if (paymentMethod === "wallet") {
      if (!wallet || wallet.balance < finalAmount) {
        return res.status(400).json({ message: "Insufficient wallet balance" });
      }

      // Deduct wallet balance
      wallet.balance -= finalAmount;

      // Log transaction
      wallet.transactions.push({
        type: "debit",
        amount: finalAmount,
        description: `Order payment of ₹${finalAmount}`,
      });

      await wallet.save();
    }

    if (paymentMethod == "cod" && finalAmount > 1000) {
      return res
        .status(400)
        .json({ message: "COD only applicable for under 1000 purchase" });
    }

    const orderedItems = cart.items.map((item) => ({
      product: item.productId,
      quantity: item.quantity,
      price: item.price,
      size: item.size,
    }));

    for (const item of cart.items) {
      const product = item.productId;
      if (product.quantity < item.quantity) {
        return res
          .status(400)
          .json({ message: `Insufficient stock for ${product.name}` });
      }
      product.quantity -= item.quantity;
      await product.save();
    }

    let order = {};
    if (paymentMethod !== "cod") {
      try {
        order = await paymentController.createPayment(finalAmount);
        if (!order) {
          return res.status(500).json({ message: "Failed to create order" });
        }
      } catch (error) {
        return res.status(500).json({ message: "Server error", error });
      }
    }

    // Create new order without Razorpay
    const newOrder = new Order({
      userId,
      orderedItems,
      totalPrice: subtotal,
      discount,
      finalAmount,
      paymentMethod,
      address: addressId,
      invoiceDate: Date.now(),
      status:
        paymentMethod === "cod"
          ? "Placed"
          : paymentMethod === "wallet"
          ? "Placed"
          : "Payment Pending",
      paymentId: paymentMethod !== "cod" ? order.id : null,
      couponApplied: Boolean(appliedCoupon),
    });

    const savedOrder = await newOrder.save();

    await Cart.updateOne({ userId }, { $set: { items: [] } });

    if (paymentMethod === "wallet") {
      // Respond with success
      return res
        .status(200)
        .json({
          message: "Order placed successfully",
          paymentMethord: "wallet",
        });
    } else if (paymentMethod === "cod") {
      return res
        .status(200)
        .json({ message: "order success", paymentMethord: "cod" });
    } else if (paymentMethod === "online-payment") {
      req.session.pendingOrder = { razorpayOrderId: order.orderId, userId };

      return res.status(200).json({
        orderId: order.id, // Razorpay's order ID
        orderAmount: finalAmount,
        RAZORPAY_KEY_ID: process.env.RAZORPAY_ID,
        userName: user.name,
        email: user.email,
        phoneNumber: user.phone,
        paymentMethod: "online-payment",
      });
    }

    return res.status(400).json({ message: "something went wrong" });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Error placing order.", error: error.message });
  }
};

const orderConformation = async (req, res) => {
  try {
    const userId = req.session.user || req.session.passport?.user;
    const user = await Cart.findOne({ userId });
    res.render("order-sucess", { user });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Error placing order.", error: error.message });
  }
};

const postCoupon = async (req, res) => {
  try {
    const { couponCode } = req.body;

    const coupon = await Coupon.findOne({ name: couponCode });

    if (!coupon) {
      return res.status(400).json({ message: "Coupon not found" });
    }

    // Send the coupon details to the frontend
    res.status(200).json({
      success: true,
      message: "Coupon retrieved successfully",
      coupon: {
        name: coupon.name,
        minimumPrice: coupon.minimumPrice,
        offerPrice: coupon.offerPrice,
        expiryDate: coupon.expireOn,
      },
    });
  } catch (error) {
    console.error("Error retrieving coupon:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const rePay = async (req, res) => {
  try {
    const { orderId } = req.body;
    const userId = req.session.user || req.session.passport?.user;

    if (!userId) {
      return res.status(401).json({ message: "User is not authenticated" });
    }

    // Fetch the order
    const order = await Order.findOne({ _id: orderId, userId });
    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    if (order.status !== "Payment Pending") {
      return res.status(400).json({
        message: "Repayment is only allowed for 'Payment Pending' orders.",
      });
    }

    // Recreate Razorpay order
    const razorpayOrder = await paymentController.createPayment(
      order.finalAmount
    );
    if (!razorpayOrder) {
      return res
        .status(500)
        .json({ message: "Failed to recreate Razorpay order." });
    }

    order.paymentId = razorpayOrder.id;
    await order.save();

    // Return Razorpay details to the client
    res.status(200).json({
      orderId: razorpayOrder.id, // Razorpay Order ID
      orderAmount: order.finalAmount,
      RAZORPAY_KEY_ID: process.env.RAZORPAY_ID,
      userName: req.session.userName || "Guest User", // Assuming session has user details
      email: req.session.email || "guest@example.com",
      phone: req.session.phone || "1234567890",
      paymentMethod: "razorpay",
    });
  } catch (error) {
    console.error("Error in repayOrder:", error);
    res
      .status(500)
      .json({ message: "Error processing repayment.", error: error.message });
  }
};

module.exports = {
  getCheckOutPage,
  addAddress,
  editAddress,
  placeOrder,
  orderConformation,
  postCoupon,
  rePay,
};
