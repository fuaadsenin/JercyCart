const pdf = require("html-pdf");
const Order = require("../../models/orderSchema");
const Product = require("../../models/productSchema");
const User = require("../../models/userSchema");
const Address = require("../../models/addressSchema");
const Wallet = require("../../models/walletSchema");
const mongoose = require("mongoose");
const wishlist = require("../../models/wishlistSchema");
const Cart = require("../../models/cartSchema")

const getOrdersPage = async (req, res) => {
  // Retrieve the logged-in user's ID from the session
  const userId = req.session.user || req.session.passport?.user;

  if (!userId) {
    return res.redirect("/login"); // Redirect to login if the user is not authenticated
  }

  try {
    // Fetch the logged-in user's details
    const user = await User.findById(userId);
    wishlistCount = user.wishlist.length

    const cart = await Cart.findOne({ userId: user._id })
    cartCount = cart ? cart.items.length : 0;

    if (!user) {
      return res.redirect("/login"); // Redirect if the user record does not exist
    }

    // Fetch orders belonging to the user and populate related fields
    const orders = await Order.find({ userId })
      .populate({
        path: "orderedItems.product", // Populate product details in ordered items
        model: "Product",
      })
      .populate({
        path: "address", // Populate address details
        model: "Address",
      })
      .sort({ createdAt: -1 }); // Sort orders by creation date (newest first)

    // Render the orders page

    res.render("my-order", {
      orders, // Pass the fetched orders
      user, // Pass the user details
      message: orders.length === 0 ? "No orders found." : null,
      wishlistCount,
      cartCount,
    });
  } catch (error) {
    console.error("Error fetching orders:", error.message);
    res.status(500).send("Error fetching orders.");
  }
};

const cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId).populate(
      "orderedItems.product"
    );
    console.log(order);

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    if (order.status !== "Cancelled") {
      // Update stock for all products in the order
      for (const item of order.orderedItems) {
        const product = await Product.findById(item.product._id);
        if (product) {
          const sizeKey = item.size?.toLowerCase(); // Handle size variant if applicable
          if (sizeKey && product.varient?.[sizeKey] !== undefined) {
            product.varient[sizeKey] += item.quantity;
          } else {
            product.quantity += item.quantity; // Update global quantity if no size specified
          }
          await product.save();
        } else {
          console.warn(
            `Product with ID ${item.product._id} not found while updating stock.`
          );
        }
      }
      console.log("pay:", order.paymentId);

      // Refund to wallet if no payment ID
      if (order.paymentId !== null || order.paymentMethod === "wallet") {
        let wallet = await Wallet.findOne({ user: order.userId });

        if (!wallet) {
          wallet = new Wallet({ user: order.userId, balance: 0 });
        }

        wallet.balance += order.finalAmount;
        wallet.transactions.push({
          type: "credit",
          amount: order.finalAmount,
          description: `Refund for Order ID: ${order._id}`,
        });

        await wallet.save();
      }

      order.status = "Cancelled";
      await order.save();

      return res.json({
        success: true,
        message:
          "Order cancelled successfully, stock updated, and refund processed",
      });
    }

    res.json({ success: false, message: "Order is already cancelled" });
  } catch (error) {
    console.error("Error cancelling the order:", error);
    res.status(500).json({
      success: false,
      message: "Error cancelling the order",
      error: error.message,
    });
  }
};

const removeProduct = async (req, res) => {
  try {
    const { orderId, productId } = req.params;

    // Validate MongoDB IDs
    if (
      !mongoose.Types.ObjectId.isValid(orderId) ||
      !mongoose.Types.ObjectId.isValid(productId)
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Order ID or Product ID" });
    }

    const order = await Order.findById(orderId).populate(
      "orderedItems.product"
    );
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    const productIndex = order.orderedItems.findIndex(
      (item) => item.product._id.toString() === productId
    );
    if (productIndex === -1) {
      return res.json({
        success: false,
        message: "Product not found in the order",
      });
    }

    const removedItem = order.orderedItems[productIndex];
    const product = await Product.findById(removedItem.product._id);

    if (product) {
      product.quantity += removedItem.quantity; // Increment stock
      await product.save();
    }



    // Remove product from order
    order.orderedItems.splice(productIndex, 1);

    // Recalculate totals
    order.totalPrice = order.orderedItems.reduce(
      (acc, item) => acc + item.quantity * item.product.salePrice,
      0
    );
    order.discount = order.totalPrice > 1000 ? order.totalPrice * 0.1 : 0;
    order.finalAmount = order.totalPrice - order.discount;

    if (order.orderedItems.length === 0) {
      order.status = "Cancelled";
      order.totalPrice = 0;
      order.discount = 0;
      order.finalAmount = 0;
    }

    await order.save();

    res.json({
      success: true,
      message:
        "Product removed successfully, wallet updated, and totals adjusted.",
      order: {
        totalPrice: order.totalPrice,
        discount: order.discount,
        finalAmount: order.finalAmount,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error removing the product",
      error: error.message,
    });
  }
};

const orderDetails = async (req, res) => {
  try {
    const orderId = req.params.id;
    const userId = req.session.user || req.session.passport?.user;
    const user = req.session.user || req.session.passport?.user;
    console.log(`Fetching details for order ID: ${orderId}`);

    // Fetch the order by its ID and populate the address field
    const order = await Order.findOne({ _id: orderId }).populate(
      "orderedItems.product"
    );

    let address = await Address.find({ userId });
    address = address[0].address.find((addr) => {
      return addr._id.equals(order.address);
    });

    // If the order is not found
    if (!order) {
      return res
        .status(404)
        .render("page-404", { message: "Order not found." });
    }

    // If the address is null (not populated)
    if (!order.address) {
      console.error("Address not found for the order.");
      return res
        .status(404)
        .render("page-404", { message: "Address not found for this order." });
    }

    // Pass the order and address to the view
    res.render("order-details", { user, order, address });
  } catch (error) {
    console.error("Error fetching order details:", error);
    res.status(500).render("page-404", {
      message: "An error occurred while fetching order details.",
    });
  }
};
const returnOrder = async (req, res) => {
  const { orderId } = req.params;
  const { reason } = req.body;

  try {
    const order = await Order.findById(orderId);

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found." });
    }

    if (order.status !== "Delivered") {
      return res.status(400).json({
        success: false,
        message: "Only delivered orders can be returned.",
      });
    }

    order.returnReason = reason;

    // Update the order status
    order.status = "Returning";
    await order.save();

    res.status(200).json({
      success: true,
      message: "Return request for the order submitted successfully.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to process the return request.",
    });
  }
};
const invoiceDownload = async (req, res) => {
  try {
    const { orderId } = req.params;

    // Check if the orderId is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ error: "Invalid order ID format" });
    }

    // Fetch the order details from the database
    const order = await Order.findById(orderId)
      .populate("userId", "name email")
      .populate("orderedItems.product", "productName productImage")
      .exec();

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    const userId = order.userId._id;
    const addressId = order.address;

    // Fetch the address details for the user
    const user = await Address.findOne({ userId });
    const specificAddress = user?.address.find(
      (addr) => addr._id.toString() === addressId.toString()
    );

    if (!specificAddress) {
      return res.status(404).json({ error: "Address not found" });
    }

    // Create the HTML content for the invoice with enhanced styling
    const invoiceHTML = `
      <html>
        <head>
          <style>
            body {
              font-family: 'Arial', sans-serif;
              margin: 0;
              padding: 0;
              background-color: #f4f4f4;
              color: #333;
            }

            .container {
              max-width: 800px;
              margin: 0 auto;
              background-color: #fff;
              padding: 20px;
              border-radius: 8px;
              box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
            }

            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #f1f1f1;
              padding-bottom: 20px;
            }

            .header h1 {
              color: #3498db;
            }

            .order-details {
              margin-bottom: 30px;
            }

            .order-details h2 {
              color: #3498db;
            }

            .order-details p {
              font-size: 14px;
              line-height: 1.6;
            }

            .product-list {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }

            .product-list th, .product-list td {
              padding: 12px 15px;
              border: 1px solid #ddd;
              text-align: left;
            }

            .product-list th {
              background-color: #3498db;
              color: #fff;
            }

            .product-list td {
              background-color: #f9f9f9;
            }

            .footer {
              text-align: center;
              margin-top: 40px;
              font-size: 14px;
              color: #777;
            }

            .total {
              font-weight: bold;
              color: #3498db;
              font-size: 16px;
              margin-top: 10px;
            }

            .address {
              margin-top: 15px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Invoice</h1>
              <p>Order ID: ${order.orderId}</p>
              <p>Invoice Date: ${new Date().toLocaleDateString()}</p>
            </div>

            <div class="order-details">
              <h2>Order Details</h2>
              <p><strong>Billing Name:</strong> ${order.userId.name}</p>
              <div class="address">
                <p><strong>Billing Address:</strong> ${specificAddress.addressType
      },${specificAddress.landMark}, ${specificAddress.city}, ${specificAddress.state
      } - ${specificAddress.pincode}</p>
                <p><strong>Phone:</strong> ${specificAddress.phone}</p>
              </div>
              <p><strong>Total Price:</strong> ₹${order.finalAmount}</p>
            </div>

            <div class="product-list">
              <h3>Ordered Items</h3>
              <table>
                <thead>
                  <tr>
                    <th>Product Name</th>
                    <th>Quantity</th>
                    <th>Price</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${order.orderedItems
        .map(
          (item) => `
                    <tr>
                      <td>${item.product.productName}</td>
                      <td>${item.quantity}</td>
                      <td>₹${item.price}</td>
                      <td>₹${item.quantity * item.price}</td>
                    </tr>
                  `
        )
        .join("")}
                </tbody>
              </table>
            </div>

            <div class="total">
              <p>Total Amount: ₹${order.finalAmount}</p>
            </div>

            <div class="footer">
              <p>Thank you for shopping with us!</p>
            </div>
          </div>
        </body>
      </html>
    `;

    pdf.create(invoiceHTML, { format: "A4" }).toBuffer((err, pdfBuffer) => {
      if (err) {
        console.error("Error generating PDF:", err);
        return res.status(500).json({ error: "Error generating invoice PDF" });
      }

      // Send the PDF as a response
      res.contentType("application/pdf");
      res.send(pdfBuffer);
    });
  } catch (error) {
    console.error("Error generating invoice:", error);
    res.status(500).json({ error: "Error generating invoice PDF" });
  }
};

module.exports = {
  getOrdersPage,
  cancelOrder,
  removeProduct,
  orderDetails,
  returnOrder,
  invoiceDownload,
};
