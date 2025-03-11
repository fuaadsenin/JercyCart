const User = require("../../models/userSchema");
const Razorpay = require("razorpay");
const Order = require("../../models/orderSchema");
require("dotenv").config();
const crypto = require("crypto");

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const createPayment = async (totalAmount) => {
  try {
    console.log("Creating Razorpay order...");

    const order = await razorpayInstance.orders.create({
      amount: totalAmount * 100,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      payment_capture: 1,
    });
    console.log("Razorpay Order Created:", order);
    

    return order;
  } catch (error) {
    console.log("error in create payment:", error);
  }
};

const verifyPayment = async (req, res) => {
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature } =
    req.body;
    console.log("Received payment verification request"); // Debug log
    console.log("Request Body:", req.body); 
  

  const secret = process.env.RAZORPAY_KEY_SECRET;

  // generating signature using razorpay secret key
  const generatedSignature = crypto
    .createHmac("sha256", secret)
    .update(razorpay_order_id + "|" + razorpay_payment_id)
    .digest("hex");

  if (generatedSignature === razorpay_signature) {
    console.log("✅ Signature verification successful!");

    
    await Order.updateOne(
      { paymentId: razorpay_order_id },
      { $set: { status: "Placed" } }
    );

    return res.redirect("/order-confirmation");
  } else {
    // Signature verification failed
    console.log("signature fail");
    // render order fail page
    const order = await Order.findOne({ paymentId: razorpay_order_id });

    const orderId = order ? order.paymentId : "N/A";
    const amount = order ? order.amount : 0;
    const status = "Failed"; // You can update status based on actual logic
    const retryUrl = `/retry-payment/${razorpay_order_id}`; // Example URL for retrying payment

    // Render the failed payment page with dynamic data
    res.render("orderFailPage", { orderId, amount, status, retryUrl });
  }
};

module.exports = {
  createPayment,
  verifyPayment,
};
