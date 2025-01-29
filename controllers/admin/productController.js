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

const addProducts = async (req, res) => {
  try {
    const products = req.body;

    const productExists = await Product.findOne({
      productName: products.name,
    });

    if (productExists) {
      return res.status(400).json({
        error: "Product already exists, please try with another name",
      });
    }

    const category = await Category.findOne({ name: products.category });
    if (!category) {
      return res.status(400).json({ error: "Invalid category name provided" });
    }

    if (products.salePrice <= products.regularPrice) {
      return res
        .status(400)
        .json({ error: "Sale price must be less than regular price" });
    }

    const images = req.files.map((ele) => {
      return ele.filename;
    });

    console.log(images);

    const { smallQty, mediumQty, largeQty, xLargeQty } = products;

    const varients = {
      small: smallQty,
      medium: mediumQty,
      large: largeQty,
      xLarge: xLargeQty,
    };
    console.log(varients);

    const newProduct = new Product({
      productName: products.name,
      description: products.description,
      category: category._id,
      regularPrice: parseFloat(products.regularPrice),
      salePrice: parseFloat(products.salePrice),

      varient: varients,

      productImage: images || [],
      status: products.status || "Available",
    });

    // Save the product to the database
    await newProduct.save();
    return res.status(200).json({ message: "Product added successfully!" });
  } catch (error) {
    console.error("Error saving product:", error);
    return res.status(500).json({
      error:
        "An error occurred while saving the product. Please try again later.",
    });
  }
};

const getAllProducts = async (req, res) => {
  try {
    const search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 4;

    const productData = await Product.find({
      $or: [{ productName: { $regex: new RegExp(".*" + search + ".*", "i") } }],
    })
      .limit(limit)
      .skip((page - 1) * limit)
      .populate("category")
      .exec();

    const count = await Product.countDocuments({
      $or: [{ productName: { $regex: new RegExp(".*" + search + ".*", "i") } }],
    });

    const category = await Category.find({ isListed: true });

    if (category) {
      res.render("products", {
        data: productData,
        currentPage: page,
        totalPages: Math.ceil(count / limit),
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
    res.redirect("/pageerror");
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
    res.redirect("/pageerror");
  }
};

const blockProduct = async (req, res) => {
  try {
    let id = req.query.id;
    await product.updateOne({ _id: id }, { $set: { isBlocked: true } });
    res.redirect("/admin/products");
  } catch (error) {
    res.redirect("pageerror");
  }
};

const unblockProduct = async (req, res) => {
  try {
    let id = req.query.id;
    await Product.updateOne({ _id: id }, { $set: { isBlocked: false } });
    res.redirect("/admin/products");
  } catch (error) {
    res.redirect("pageerror");
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
      sizes: product.size,
    });
  } catch (error) {
    res.redirect("/pageerror");
  }
};

const editProduct = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("Editing product with ID:", id);

    const product = await Product.findOne({ _id: id });
    if (!product) {
      console.log("Product not found");
      return res.status(404).json({ error: "Product not found." });
    }

    const data = req.body;
    console.log("Data received for update:", data);

    if (!data.name || typeof data.name !== "string") {
      return res
        .status(400)
        .json({ error: "Product name is required and should be a string." });
    }

    const existingProduct = await Product.findOne({
      productName: {
        $regex: new RegExp("^" + data.name.trim() + "$", "i"),
      },
      _id: { $ne: id },
    });

    if (existingProduct) {
      return res.status(400).json({
        error:
          "Product with this name already exists. Please try with another name.",
      });
    }
    let categoryId = null;
    if (data.category) {
      const category = await Category.findOne({ name: data.category });
      if (!category) {
        return res.status(400).json({ error: "Invalid category provided." });
      }
      categoryId = category._id;
    }
    const { smallQty, mediumQty, largeQty, xLargeQty } = data;
    const varients = {
      small: smallQty,
      medium: mediumQty,
      large: largeQty,
      xLarge: xLargeQty,
    };

    const existingImages = product.productImage || [];
    const maxImages = 4;

    const availableSlots = maxImages - existingImages.length;
    if (availableSlots <= 0) {
      return res.status(400).json({
        error: `Maximum image limit of ${maxImages} reached. Please delete some images before adding new ones.`,
      });
    }

    const images = [];
    if (req.files && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        images.push(req.files[i].filename);
      }
    }

    const updateFields = {
      productName: data.name,
      description: data.description,
      category: categoryId,
      regularPrice: data.regularPrice,
      salePrice: data.salePrice,
      varient: varients,
    };

    if (images.length > 0) {
      updateFields.$push = { productImage: { $each: images } };
    }

    console.log("Update fields:", updateFields);

    const updatedProduct = await Product.findByIdAndUpdate(id, updateFields, {
      new: true,
    });

    if (!updatedProduct) {
      console.log("Failed to update product");
      return res.status(404).json({ error: "Product not found." });
    }

    console.log("Product updated successfully:", updatedProduct);
    return res.status(200).json({ message: "Product updated successfully" });
  } catch (error) {
    console.error("Error during product update:", error);
    res
      .status(500)
      .json({ error: "Something went wrong", details: error.message });
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
    res.redirect("/pageerror");
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
