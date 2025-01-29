const Wallet = require("../../models/walletSchema");
const User = require("../../models/userSchema");

const getWallet = async (req, res) => {
  try {
    const userId = req.session.user || req.session.passport?.user;

    if (!userId) {
      return res.redirect("/login");
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send("User not found");
    }

    let wallet = await Wallet.findOne({ user: userId }).lean();
    if (!wallet) {
      wallet = await Wallet.create({
        user: userId,
        balance: 0,
        transactions: [],
      });
    }

    res.render("wallet", { user, wallet });
  } catch (error) {
    console.error("Error fetching wallet:", error);
    res.status(500).send("Server error. Please try again later.");
  }
};

const addAmount = async (req, res) => {
  try {
    const { amount } = req.body;
    const userId = req.session.user || req.passport?.user;
    if (!userId) {
      return res.status(400).json({ message: "unauthorised" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }
    let wallet = await Wallet.findOne({ user: userId });
    if (!wallet) {
      wallet = new Wallet({
        user: userId,
        balance: 0,
        transactions: [],
      });
    }
    wallet.balance += parseFloat(amount);
    wallet.transactions.push({
      type: "credit",
      amount: parseFloat(amount),
      description: "Funds added to wallet",
      date: new Date(),
    });

    await wallet.save();

    res
      .status(200)
      .json({ message: "Funds added successfully", balance: wallet.balance });
  } catch (error) {
    console.error("Error adding funds:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getWallet,
  addAmount,
};
