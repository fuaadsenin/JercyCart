function getDetails() {
    const paymentMethod = document.getElementById('payment-method').value; // Get the selected payment method
    const selectedAddress = getSelectedAddress();
 console.log(selectedAddress);
 
    if (!selectedAddress) {
        Swal.fire({
            title: 'Error',
            text: 'Please select a valid address!',
            icon: 'error',
            timer: 3000,
            showConfirmButton: false
        });
        return false;
    }

    if (!paymentMethod || paymentMethod === "") {
        Swal.fire({
            title: 'Error',
            text: 'Please select a payment method!',
            icon: 'error',
            timer: 3000,
            showConfirmButton: false
        });
        return false;
    }

    // Prepare order data
    return orderData = {
        paymentMethod,
        addressId: selectedAddress  // Address ID
    };


}

async function placeOrder() {
    const discountedTotal = document.getElementById("discountedTotal").value;
    const appliedCoupon = document.getElementById("appliedCoupon").value;


    

    const details = getDetails();

    details.discountedTotal = discountedTotal;
    details.appliedCoupon = appliedCoupon;

    if (!details) return;

    // Send order data to the backend
    const response = await fetch('/place-order', {
        method: 'POST',
        body: JSON.stringify(details),
        headers: {
            'Content-Type': 'application/json'
        }
    });
  
    const data = await response.json()

    if (response.ok) {
        
        
        

        if (data.paymentMethord === 'cod') {
            return window.location.href = '/order-confirmation';

        } else {
          
           console.log(data);
           
            
            const options = {

                key: data.RAZORPAY_KEY_ID, // Razorpay Key ID
                amount: data.orderAmount, // Amount in the smallest currency unit (paise)
                currency: 'INR', // Currency in which the payment is to be made
                name: "JERSYCart",
                description: "Test Transaction",
                order_id: data.orderId,
                "redirect": true,
                "callback_url": "http://localhost:3002/verify-payment",

                prefill: {
                    name: details.userName,
                    email: details.email,
                    contact: details.phone
                },
                theme: {
                    color: "#3399cc"
                }
            };
         
            
            
            
        
            const paymentObject = new window.Razorpay(options);
            paymentObject.open();
            

        }

        
    }else{
        Swal.fire({
            icon:"error",
            title:"Error",
            text:data.message,
            showConfirmButton:true

        })
    }

}





//get address id
function getSelectedAddress() {
    const selectedAddress = document.querySelector('input[name="address"]:checked');

    console.log(selectedAddress);
    
    if (selectedAddress) {
        return selectedAddress.getAttribute('id');

    }
    return null;
}

