const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema");
const fs = require("fs");
const path = require("path");
const Sharp = require("sharp");
const product = require("../../models/productSchema");

const getProductAddPage = async (req, res) => {
  try {
    const category = await Category.find({ isListed: true });
    res.render("product-add", {
      cat: category,
    });
  } catch (error) {
    res.redirect("/pageerror");
  }
};




const { body, validationResult } = require("express-validator");
const addProducts = async (req, res) => {
  try {
    // Extract product data from request body
    const products = req.body;

    // Check if product name already exists
    const productExists = await Product.findOne({
      productName: products.productName,
    });
    if (productExists) {
      return res
        .status(400)
        .json({ error: "Product already exists, please try with another name" });
    }

    // Check if the provided category exists
    const category = await Category.findOne({ name: products.category });
    if (!category) {
      return res.status(400).json({ error: "Invalid category name provided" });
    }

    // Validate product details
    if (products.salePrice >= products.regularPrice) {
      return res
        .status(400)
        .json({ error: "Sale price must be less than regular price" });
    }

    if (products.quantity <= 0) {
      return res
        .status(400)
        .json({ error: "Quantity must be a positive integer" });
    }

    // Ensure upload directory exists
    const uploadDir = path.join("public", "uploads", "product-images");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Process uploaded images
    const images =
      req.files && req.files.length > 0
        ? await Promise.all(
            req.files.map(async (file) => {
              const originalImagePath = file.path;
              const resizedImagePath = path.join(uploadDir, file.filename);
              await Sharp(originalImagePath)
                .resize({ width: 440, height: 440 })
                .toFile(resizedImagePath);
              return file.filename;
            })
          )
        : [];

    // Create a new product document
    const newProduct = new Product({
      productName: products.productName,
      description: products.description,
      category: category._id, // Use category ID
      regularPrice: parseFloat(products.regularPrice),
      salePrice: parseFloat(products.salePrice),
      createdOn: new Date(),
      quantity: parseInt(products.quantity, 10),
      size: products.size,
      cloth: products.cloth,
      color: products.color,
      productImage: images,
      status: "Available",
    });

    // Save the product to the database
    await newProduct.save();
    // return res.status(201).json({ message: "Product added successfully!" });
    return res.redirect("/admin/products")

  } catch (error) {
    console.error("Error saving product:", error);
    return res.status(500).json({
      error: "An error occurred while saving the product. Please try again later.",
    });
  }
};


const getAllProducts = async (req, res) => {
  try {
    const search = req.query.search || ""; // Search query
    const page = parseInt(req.query.page) || 1; // Current page, default to 1
    const limit = 4; // Items per page

    // Fetch matching products with pagination
    const productData = await Product.find({
      $or: [{ productName: { $regex: new RegExp(".*" + search + ".*", "i") } }],
    })
      .limit(limit)
      .skip((page - 1) * limit)
      .populate("category")
      .exec();

    // Count total documents for pagination
    const count = await Product.countDocuments({
      $or: [{ productName: { $regex: new RegExp(".*" + search + ".*", "i") } }],
    });

    // Fetch categories
    const category = await Category.find({ isListed: true });

    if (category) {
      res.render("products", {
        data: productData,
        currentPage: page,
        totalPages: Math.ceil(count / limit), // Calculate total pages
        cat: category,
      });
    } else {
      res.render("page-404");
    }
  } catch (error) {
    console.error(error);
    res.redirect("/pageerror");
  }
};

const addProductOffer = async (req, res) => {
  try {
    const { productId, percentage } = req.body;
    const findProduct = await Product.findOne({ _id: productId });
    const findCategory = await Category.findOne({ _id: findProduct.category });
    if (findCategory.categoryOffer > percentage) {
      return res.json({
        status: false,
        message: "this products category already has a category offer",
      });
    }

    findProduct.salePrice =
      findProduct.salePrice -
      Math.floor(findProduct.regularPrice * (percentage / 100));
    findProduct.productOffer = parseInt(percentage);
    await findProduct.save();
    findCategory.categoryOffer = 0;
    await findCategory.save();
    res.json({ status: true });
  } catch (error) {
    res.redirect("/page-error");
    res.status(500).json({ status: false, message: "internal server Error" });
  }
};

const removeProductOffer = async (req, res) => {
  try {
    const { productId } = req.body;
    const findProduct = await Product.findOne({ _id: productId });
    const percentage = findProduct.productOffer;
    findProduct.salePrice =
      findProduct.salePrice +
      Math.floor(findProduct.regularPrice * (percentage / 100));
    findProduct.productOffer = 0;
    await findProduct.save();
    res.json({ status: true });
  } catch (error) {
    res.redirect("/page-error");
  }
};

const blockProduct = async (req, res) => {
  try {
    let id = req.query.id;
    await product.updateOne({ _id: id }, { $set: { isBlocked: true } });
    res.redirect("/admin/products");
  } catch (error) {
    res.redirect("page-error");
  }
};

const unblockProduct = async (req, res) => {
  try {
    let id = req.query.id;
    await Product.updateOne({ _id: id }, { $set: { isBlocked: false } });
    res.redirect("/admin/products");
  } catch (error) {
    res.redirect("page-error");
  }
};

const getEditProduct = async (req, res) => {
  try {
    const id = req.query.id;
    const product = await Product.findOne({ _id: id });
    const category = await Category.find({});
    res.render("edit-product", {
      product: product,
      cat: category,
    });
  } catch (error) {
    res.redirect("/page-error");
  }
};

const editProduct = async (req, res) => {
  try {
    const id = req.params.id;
    const product = await Product.findOne({ _id: id });
    const data = req.body;
    
    // Check for existing product with the same name
    const existingProduct = await Product.findOne({
      productName: { $regex: new RegExp("^" + data.productName.trim() + "$", "i") },
      _id: { $ne: id },
    });
    
    if (existingProduct) {
      return res.status(400).json({
        error: "Product with this name already exists. Please try with another name.",
      });
    }

    // Process uploaded images
    const images = [];
    if (req.files && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        images.push(req.files[i].filename);
      }
    }

    // Prepare fields to update
    const updateFields = {
      productName: data.productName,
      description: data.description,
      category: product.category,
      regularPrice: data.regularPrice,
      salePrice: data.salePrice,
      quantity: data.quantity,
      color: data.color,
      cloth: data.cloth,
    };

    // If images are uploaded, push them into the productImage array
    if (req.files && req.files.length > 0) {
      updateFields.$push = { productImage: { $each: images } };
    }

    // Update the product
    const updatedProduct = await Product.findByIdAndUpdate(id, updateFields, { new: true });
    if (!updatedProduct) {
      return res.status(404).json({ error: "Product not found." });
    }

    // Redirect to the product listing page
    res.redirect("/admin/products");
  } catch (error) {
    console.error(error);
    // Respond with an error message
    res.status(500).json({ error: "Something went wrong", details: error.message });
  }
};

const deleteSingleImage = async (req, res) => {
  try {
    const { imageNameToServer, productIdToServer } = req.body;
    const product = await Product.findByIdAndUpdate(productIdToServer, {
      $pull: { productImage: imageNameToServer },
    });
    const imagePath = path.join(
      "public",
      "uploads",
      "re-image",
      imageNameToServer
    );
    if (fs.existsSync(imagePath)) {
      await fs.unlinkSync(imagePath);
      console.log(`image ${imageNameToServer} deleted successfully`);
    } else {
      console.log(`image ${imageNameToServer} not found`);
    }
    res.send({ status: true });
  } catch (error) {
    res.redirect("/page-error");
  }
};

module.exports = {
  getProductAddPage,
  addProducts,
  getAllProducts,
  addProductOffer,
  removeProductOffer,
  blockProduct,
  unblockProduct,
  getEditProduct,
  editProduct,
  deleteSingleImage,
};
