const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Address = require("../../models/addressSchema");
const Order = require("../../models/orderSchema");
const Wallet = require("../../models/walletSchema");

const mongodb = require("mongodb");
const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const getOrderlist = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; // Current page, default to 1
    const limit = 4; // Items per page

    // Fetch orders with populated user and product details, sorted by newest first
    const orders = await Order.find()
      .sort({ createdAt: -1 }) // Sort by `createdAt` in descending order
      .populate("orderedItems.product")
      .populate("userId", "name") // Fetch customer name
      .limit(limit)
      .skip((page - 1) * limit);
      

    // Count total orders for pagination
    const totalOrders = await Order.countDocuments();

    if (!orders.length) {
      return res.status(404).send("No orders found");
    }

    // Format orders to include necessary details
    const formattedOrders = orders.map((order) => ({
      id: order.orderId,
      customerName: order.userId?.name || "Unknown", // If name is not found, show 'Unknown'
      productNames: order.orderedItems
        .map((item) => item.product?.productName || "Unknown")
        .join(", "), // Join product names if multiple products
      status: order.status,
    }));
   
    

    // Render the page with the formatted orders and pagination details
    res.render("orderList", {
      orders: formattedOrders,
      currentPage: page,
      totalPages: Math.ceil(totalOrders / limit),
    });
  } catch (error) {
    console.error("Error rendering order management page:", error.message); // Log the actual error message
    res.status(500).send("Failed to load the order management page.");
  }
};

// Update order status based on request
const updateOrderStatus = async (req, res) => {
  const { orderId, status } = req.body;


  // Valid statuses
  const validStatuses = [
    "Placed",
    "Processing",
    "Shipped",
    "Delivered",
    "Rejected",
    "Returning",
    "Returned",
  ];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: "Invalid status" });
  }

  try {
    // Validate `orderId`
    if (!orderId) {
      return res
        .status(400)
        .json({ success: false, message: "Order ID is required" });
    }

    const order = await Order.findOne({ orderId });
    
    console.log("my order:",order);
    

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    // Prevent updates for delivered or rejected orders
    if (["Delivered", "Rejected"].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `Order cannot be updated because it is already ${order.status}`,
      });
    }

    if (status === "Returned") {
      let wallet = await Wallet.findOne({ user: order.userId });

      if (!wallet) {
        wallet = new Wallet({ user: order.userId, balance: 0 });
      }

      wallet.balance += order.finalAmount;
      wallet.transactions.push({
        type: "credit",
        amount: order.finalAmount,
        description: `Refund for Order ID: ${order.orderId}`,
      });

      await wallet.save();
    }

    order.status = status;
    await order.save();

    res.json({
      success: true,
      message: `Order status updated to ${status}`,
      order,
    });
  } catch (error) {
    console.error("Error updating order status:", error.message);
    res.status(500).json({
      success: false,
      message: "An error occurred while updating the order status.",
    });
  }
};

const getOrderDetailsForAdmin = async (req, res) => {
  try {
    const orderId = req.params.id;

    const order = await Order.findOne({ orderId })
      .populate({
        path: "orderedItems.product",
        select: "productName productImage price", // Explicitly select these fields
      })
      .populate("userId", "name email");

    if (!order) {
      console.error("Order not found for ID:", orderId);
      return res.status(404).render("page-error", { message: "Order not found." });
    }

    const userId = order.userId._id;
    const addressId = order.address;

    // Fetch user's address and filter by the address ID
    const user = await Address.findOne({ userId });
    const specificAddress = user?.address.find(
      (addr) => addr._id.toString() === addressId.toString()
    );

    res.render("adminOrderDetails", {
      order,
      user: order.userId,
      address: specificAddress,
    });
  } catch (error) {
    console.error("Error fetching order details for admin:", error);
    res.status(500).render("page-error", {
      message: "An error occurred while fetching order details.",
    });
  }
};


const salesReport = async (req, res) => {
  try {
      const sales = await Order.find().sort({ invoiceDate: -1 });

      if (!sales || sales.length === 0) {
          return res.render("sales-report", { sales: [], overall: {} });
      }

      const overall = calculateOverallStats(sales);
      res.render("sales-report", { sales, overall });
  } catch (err) {
      console.error("Error fetching initial sales report:", err);
      res.status(500).send("An error occurred while loading the sales report.");
  }
};
const postSalesReport = async (req, res) => {
  try {
      const { filter, startDate, endDate } = req.body;
      let filterQuery = {};

      // If the "All Data" filter is selected, return all sales data
      if (filter === "all-data") {
          // No filter applied
      }
      // Custom date filter logic
      else if (filter === "custom-date" && startDate && endDate) {
          const customStartDate = new Date(startDate);
          const customEndDate = new Date(endDate);

          filterQuery.invoiceDate = {
              $gte: new Date(customStartDate.setHours(0, 0, 0, 0)),
              $lt: new Date(customEndDate.setHours(23, 59, 59, 999)),
          };
      }
      // Last day filter
      else if (filter === "last-day") {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);

          filterQuery.invoiceDate = {
              $gte: new Date(yesterday.setHours(0, 0, 0, 0)),
              $lt: new Date(yesterday.setHours(23, 59, 59, 999)),
          };
      }
      // Last week filter
      else if (filter === "last-week") {
          const lastWeek = new Date();
          lastWeek.setDate(lastWeek.getDate() - 7);

          filterQuery.invoiceDate = {
              $gte: new Date(lastWeek.setHours(0, 0, 0, 0)),
              $lt: new Date().setHours(23, 59, 59, 999),
          };
      }
      // Last month filter
      else if (filter === "last-month") {
          const lastMonth = new Date();
          lastMonth.setMonth(lastMonth.getMonth() - 1);

          filterQuery.invoiceDate = {
              $gte: new Date(lastMonth.setHours(0, 0, 0, 0)),
              $lt: new Date().setHours(23, 59, 59, 999),
          };
      }
      // Last year filter
      else if (filter === "last-year") {
          const lastYear = new Date();
          lastYear.setFullYear(lastYear.getFullYear() - 1);

          filterQuery.invoiceDate = {
              $gte: new Date(lastYear.setHours(0, 0, 0, 0)),
              $lt: new Date().setHours(23, 59, 59, 999),
          };
      }

      console.log("Filter Query:", filterQuery);

      const sales = await Order.find(filterQuery).sort({ invoiceDate: -1 });

      if (!sales || sales.length === 0) {
          return res.json({ sales: [] });
      }

      const overall = calculateOverallStats(sales);
      res.json({ sales, overall });
  } catch (error) {
      console.error("Error fetching filtered sales report:", error);
      res.status(500).json({ error: "An error occurred while fetching filtered sales data." });
  }
};


// Helper function to calculate overall stats
const calculateOverallStats = (sales) => {
  let count = sales.length;
  let totalAmount = 0;
  let totalDiscount = 0;
  let totalFinalAmount = 0;

  sales.forEach(sale => {
      totalAmount += sale.totalPrice || 0;
      totalDiscount += sale.discount || 0;
      totalFinalAmount += sale.finalAmount || 0;
  });

  return {
      count,
      totalAmount,
      totalDiscount,
      totalFinalAmount
  };
};
const PDFDocument = require("pdfkit");

const puppeteer = require("puppeteer");

const downloadSalesReport = async (req, res) => {
  try {
    const { filter, startDate, endDate } = req.body;

    console.log("Received data:", { filter, startDate, endDate });

    let filterQuery = {};

    if (filter === "custom-date" && startDate && endDate) {
      const customStartDate = new Date(startDate);
      const customEndDate = new Date(endDate);

      filterQuery.invoiceDate = {
        $gte: new Date(customStartDate.setHours(0, 0, 0, 0)),
        $lt: new Date(customEndDate.setHours(23, 59, 59, 999)),
      };
    }

    if (filter === "last-day") {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      filterQuery.invoiceDate = {
        $gte: new Date(yesterday.setHours(0, 0, 0, 0)),
        $lt: new Date(yesterday.setHours(23, 59, 59, 999)),
      };
    }

    console.log("Filter query:", filterQuery);

    const sales = await Order.find(filterQuery).sort({ invoiceDate: -1 });

    if (!sales || sales.length === 0) {
      console.log("No sales data found.");
      return res.status(404).json("No sales data available.");
    }

    const overall = calculateOverallStats(sales);

    // Generate HTML content
    const htmlContent = `
    <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; }
            .container { max-width: 800px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; font-size: 24px; margin-bottom: 20px; }
            .table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            .table th, .table td { border: 1px solid #ccc; padding: 8px; text-align: left; }
            .table th { background-color: #f4f4f4; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">Sales Report</div>
            
            <h3>Overall Sales Summary</h3>
            <p><strong>Total Orders:</strong> ${overall.count}</p>
            <p><strong>Total Amount:</strong> ₹${overall.totalAmount.toFixed(2)}</p>
            <p><strong>Total Discount:</strong> ₹${overall.totalDiscount.toFixed(2)}</p>
            <p><strong>Total Final Amount:</strong> ₹${overall.totalFinalAmount.toFixed(2)}</p>

            <h3>Sales Table</h3>
            <table class="table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Invoice Date</th>
                  <th>Total Price</th>
                  <th>Discount</th>
                  <th>Final Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${sales.map(sale => `
                  <tr>
                    <td>${sale.orderId}</td>
                    <td>${new Date(sale.invoiceDate).toLocaleDateString()}</td>
                    <td>₹${sale.totalPrice.toFixed(2)}</td>
                    <td>₹${sale.discount.toFixed(2)}</td>
                    <td>₹${sale.finalAmount.toFixed(2)}</td>
                    <td>${sale.status}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </body>
      </html>
    `;

    // Launch Puppeteer
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle2", timeout: 60000 });

    // Generate PDF
    const pdfBuffer = await page.pdf({ format: "A4" });

    await browser.close();

    // Send the PDF to the client
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="sales_report.pdf"');
    res.send(pdfBuffer);

  } catch (error) {
    console.error("Error generating PDF:", error);
    res.status(500).send("An error occurred while generating the PDF.");
  }
};

module.exports = {
  getOrderlist,
  updateOrderStatus,
  getOrderDetailsForAdmin,
  salesReport,
  postSalesReport,
  downloadSalesReport,
};
