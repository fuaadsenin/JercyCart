function getDetails() {
  const paymentMethod = document.getElementById("payment-method").value; // Get the selected payment method
  const selectedAddress = getSelectedAddress();
  console.log(selectedAddress);

  if (!selectedAddress) {
    Swal.fire({
      title: "Error",
      text: "Please select a valid address!",
      icon: "error",
      timer: 3000,
      showConfirmButton: false,
    });
    return false;
  }

  if (!paymentMethod || paymentMethod === "") {
    Swal.fire({
      title: "Error",
      text: "Please select a payment method!",
      icon: "error",
      timer: 3000,
      showConfirmButton: false,
    });
    return false;
  }

  // Prepare order data
  return (orderData = {
    paymentMethod,
    addressId: selectedAddress, // Address ID
  });
}

async function placeOrder() {
  const discountedTotal = document.getElementById("discountedTotal").value;
  const appliedCoupon = document.getElementById("appliedCoupon").value;

  const details = getDetails();

  if (!details) return; // Stop if order details are invalid

  details.discountedTotal = discountedTotal;
  details.appliedCoupon = appliedCoupon;

  // Send order data to the backend
  const response = await fetch("/place-order", {
    method: "POST",
    body: JSON.stringify(details),
    headers: {
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();

  if (response.ok) {
    if (data.paymentMethord === "cod") {
      // Redirect to order confirmation for COD orders
      return (window.location.href = "/order-confirmation");
    } else if (data.paymentMethord === "wallet") {
      // Redirect to order confirmation for wallet payments
      Swal.fire({
        icon: "success",
        title: "Order Success",
        text: "Your order has been placed successfully using wallet!",
        showConfirmButton: true,
      }).then(() => {
        window.location.href = "/order-confirmation";
      });
    } else if (data.paymentMethord === "online-payment") {
      // Online payment via Razorpay
      console.log(data);

      const options = {
        key: data.RAZORPAY_KEY_ID, // Razorpay Key ID
        amount: data.orderAmount, // Amount in paise
        currency: "INR", // Payment currency
        name: "JERSYCart",
        description: "Test Transaction",
        order_id: data.orderId, // Razorpay Order ID
        redirect: true,
        callback_url: "http://jercycart.shop/verify-payment",
        prefill: {
          name: details.userName,
          email: details.email,
          contact: details.phone,
        },
        theme: {
          color: "#3399cc",
        },
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
    }
  } else {
    // Show error message for failed order placement
    Swal.fire({
      icon: "error",
      title: "Error",
      text: data.message,
      showConfirmButton: true,
    });
  }
}

//get address id
function getSelectedAddress() {
  const selectedAddress = document.querySelector(
    'input[name="address"]:checked'
  );

  console.log(selectedAddress);

  if (selectedAddress) {
    return selectedAddress.getAttribute("id");
  }
  return null;
}
