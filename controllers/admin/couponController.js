const Coupon = require("../../models/couponSchema");

const getCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.find({
      isList: "true",
    });

    res.render("coupon", { coupon });
  } catch (error) {
    console.log("error in getcoupon", error);
  }
};

const deleteCoupon = async (req, res) => {
  try {
    const { id } = req.query;

    const deletedCoupon = await Coupon.findByIdAndDelete(id);
    if (!deletedCoupon) {
      return res.status(404).json({ message: "Coupon not found" });
    }

    res.status(200).json({ message: "Coupon deleted successfully" });
  } catch (error) {
    console.error("Error deleting coupon:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const postCoupon = async (req, res) => {
  try {
    const { couponName, startDate, endDate, offerPrice, minimumPrice } =
      req.body;

    const exitsName = await Coupon.findOne({
      name: couponName,
    });

    if (exitsName) {
      return res.status(400).json({ message: "name already existed" });
    }

    if (!couponName || !startDate || !endDate || !offerPrice || !minimumPrice) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (offerPrice >= minimumPrice) {
      return res
        .status(400)
        .json({ message: "Offer Price must be less than Minimum Price" });
    }

    const newCoupon = new Coupon({
      name: couponName,
      expireOn: endDate,
      createdOn: startDate,
      offerPrice,
      minimumPrice,
    });

    const savedCoupon = await newCoupon.save();
    res
      .status(201)
      .json({ message: "Coupon added successfully", data: savedCoupon });
  } catch (error) {
    console.error("Error adding coupon:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const editCoupon = async (req, res) => {
  try {
    const couponId = req.params.id;
    const coupon = await Coupon.findById(couponId);
    if (!coupon) {
      res.send(400).json({ message: "coupon not found" });
    }

    res.render("edit-coupon", { findCoupon: coupon });
  } catch (error) {
    console.log("error in edit Coupon", error);
  }
};
const updateCoupon = async (req, res) => {
  try {
    const couponId = req.params.id;
    const { couponName, startDate, endDate, offerPrice, minimumPrice } =
      req.body;

    if (!couponName || !startDate || !endDate || !offerPrice || !minimumPrice) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (Number(offerPrice) >= Number(minimumPrice)) {
      return res
        .status(400)
        .json({ message: "Offer Price must be less than Minimum Price" });
    }

    // Update the coupon details
    const updatedCoupon = await Coupon.findByIdAndUpdate(
      couponId,
      {
        name: couponName,
        createdOn: startDate,
        expireOn: endDate,
        offerPrice,
        minimumPrice,
      },
      { new: true, runValidators: true }
    );

    if (!updatedCoupon) {
      return res
        .status(400)
        .json({ message: "Coupon not found or could not be updated" });
    }

    // Respond with success message
    res.status(200).json({
      message: "Coupon updated successfully",
      data: updatedCoupon,
    });
  } catch (error) {
    console.log("Error in updateCoupon:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  getCoupon,
  postCoupon,
  deleteCoupon,
  editCoupon,
  updateCoupon,
};
