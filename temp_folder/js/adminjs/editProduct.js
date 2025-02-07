// const { text } = require("body-parser");

function validateForm() {
   
    
    function clearErrorMessages() {
      document.querySelectorAll(".error-message").forEach((element) => {
        element.innerHTML = "";
      });
    }
  
    clearErrorMessages();
  
    const name = document.getElementById("product_name").value;
    const description = document.getElementById("descriptionid").value;
    const regularPrice = document.getElementById("regularPriceid").value;
    const salePrice = document.getElementById("salePriceid").value;
    const category = document.getElementById("categoryId").value;
    const smallQty = document.getElementById("smallQty").value;
    const mediumQty = document.getElementById("mediumQty").value;
    const largeQty = document.getElementById("largeQty").value;
    const xLargeQty = document.getElementById("xLargeQty").value;
    const images = document.getElementById("input1").files[0];
  
    //   console.log(images);
  
    let isValid = true;
  
    // Validate product name
    if (name.trim() === "") {
      document.getElementById("productName-error").innerHTML =
        "Name should be provided.";
      isValid = false;
    }
  
    if (xLargeQty < 0 || largeQty < 0 || mediumQty < 0 || smallQty < 0) {
      document.getElementById("qtyErr").innerHTML = "Invalid Quantity";
      isValid = false;
    }
    if (
      xLargeQty === "" ||
      largeQty === "" ||
      mediumQty === "" ||
      smallQty === ""
    ) {
      document.getElementById("qtyErr").innerHTML = "Invalid Quantity";
      isValid = false;
    }
  
    // Validate description
    if (description.trim() === "") {
      document.getElementById("description-error").innerHTML =
        "Please enter a description.";
      isValid = false;
    }
  
    // Validate regular price
    if (
      !/^\d+(\.\d{1,2})?$/.test(regularPrice) ||
      parseFloat(regularPrice) <= 0
    ) {
      document.getElementById("regularPrice-error").innerHTML =
        "Please enter a valid, positive regular price.";
      isValid = false;
    }
  
    // Validate sale price
    if (!/^\d+(\.\d{1,2})?$/.test(salePrice) || parseFloat(salePrice) <= 0) {
      document.getElementById("salePrice-error").innerHTML =
        "Please enter a valid, positive sale price.";
      isValid = false;
    }
  
    // Check if sale price is less than regular price
    if (parseFloat(salePrice) >= parseFloat(regularPrice)) {
      document.getElementById("salePrice-error").innerHTML =
        "Sale price must be less than regular price.";
      isValid = false;
    }
  
    // Validate category
    if (category.trim() === "") {
      // displayErrorMessage('category-error', 'Please select a category.');
      document.getElementById("category-error").innerHTML =
        "Please select a category.";
      isValid = false;
    }
  
    // Validate images
    // if (images.length === 0) {
    //   // displayErrorMessage("images-error", 'Please select at least one image.');
    //   document.getElementById("images-error").innerHTML =
    //     "Please select at least one image";
    //   isValid = false;
    // }
  
    if (isValid) {
      return (data = {
        name,
        description,
        regularPrice,
        salePrice,
        category,
        smallQty,
        mediumQty,
        largeQty,
        xLargeQty,
      });
    } else {
      return false;
    }
  }
  
  document.getElementById("updateBtn").addEventListener("click", async (event) => {
    event.preventDefault();
    const data = validateForm();
  console.log(data);
  
    const formData = new FormData();
    for (let key in data) {
      formData.append(key, data[key]);
    }
  
    // Get files from all input tags with IDs input1, input2, etc.
    for (let i = 1; i <= 4; i++) {
      const input = document.getElementById(`input${i}`);
      if (input && input.files.length > 0) {
        for (let j = 0; j < input.files.length; j++) {
          formData.append("images", input.files[j]); // Use "images" as the key for multer
        }
      }
    }
  
   
    
  
    if (data) {
      try {
        
      const productId= document.getElementById("updateBtn").getAttribute("productId")
        console.log(productId);
        
        const response = await fetch(`/admin/editProduct/${productId}`, {
          method: "POST",
          body: formData,
        });

        console.log(response);
        
        const message = await response.json();
        if (response.ok) {
          Swal.fire({
            icon: "success",
            title: "Success",
            text: "Product Updated successfully",
            showConfirmButton: true,
          }).then(() => {
            window.location.href = "/admin/products";
          });
        } else {
          Swal.fire({
            icon: "error",
            title: "Error",
            text: message.error || "Failed to add product.",
          });
        }
      } catch (error) {
        console.log(error);
        
        Swal.fire({
          icon: "error",
          title: "Network Error",
          text: "Failed to connect to the server.",
        });
      }
      
  
    }
  });
  