const express = require("express");
const router = express.Router();
const userController = require("../controllers/user/userController");
const productController=require("../controllers/user/productController")
const profileController=require("../controllers/user/profileController")
const wishlistController=require("../controllers/user/wishlistController")
const cartController=require("../controllers/user/cartController")
const checkoutController=require("../controllers/user/checkoutController")
const OrderController=require("../controllers/user/orderController")
const paymentController=require("../controllers/user/paymentController")
const walletController=require("../controllers/user/walletController")
const passport = require("passport");
const { userAuth,loginAuth } = require("../middlewares/auth");



router.get("/", userController.loadHomepage);
router.get("/login",loginAuth,userController.loadLoginPage);
router.get("/pageNotFound",userController.pageNotFound)
router.get("/signUp",loginAuth,userController.loadSignupPage)
router.get("/forgetpassword",userController.loadForgetpassword)
router.post("/signup",userController.signup)
router.post("/verify-otp",userController.verifyotp)
router.post("/resend-otp",userController.resendOtp)
router.post("/login",userController.login)
router.get("/logout",userController.logout)



router.get("/shop",userAuth,userController.loadShoppingPage)
router.get("/filter",userAuth,userController.filterProduct)
router.get("/filterPrice",userAuth,userController.filterByPrice)
router.post("/search",userAuth,userController.searchProducts)




router.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}))
// router.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/signup' }),user);






router.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/signup' }), (req, res) => {
    // Debugging line to check the logged-in user
    console.log("redirecting to home")
    res.redirect('/');
});


//productManagement//
router.get("/productDetails",userAuth,productController.productDetails);


//profile managment//
router.get("/forgot-password",profileController.getForgotPassPage)
router.post("/forgot-email-valid",profileController.forgotEmailValid)
router.post("/verify-passForgot-otp",profileController.verifyForgotPassOtp)
router.get("/reset-password",profileController.getResetPassPage)
router.post("/resend-forgot-otp",profileController.resendOtp)
router.post("/reset-password",profileController.postNewpassword)
router.get("/userProfile",userAuth,profileController.userProfile)
router.get("/editUser",userAuth,profileController.getEditUser)
router.post("/editUser",userAuth,profileController.postEditUser)
router.get("/change-password",userAuth,profileController.changePassword)
router.post("/change-password",userAuth,profileController.changePasswordPost)


//adress Management
router.get("/getaddress",userAuth,profileController.getAddress)
router.get("/addAddress",userAuth,profileController.addAddress)
router.post("/addAddress",userAuth,profileController.postAddAddress)
router.get("/editAddress",userAuth,profileController.editAddress)
router.post("/editAddress",userAuth,profileController.postEditAddress)
router.get("/deleteAddress",userAuth,profileController.deleteAddress)

//whislist managment

router.get("/wishlist",userAuth,wishlistController.loadWishlist)
router.post("/addToWishlist",userAuth,wishlistController.addToWishlist)
router.post("/removeFromWishlist",userAuth,wishlistController.removeFromWishlist)


//cart management
router.get('/cart', userAuth, cartController.getCartPage);
router.post('/addCart', userAuth, cartController.addCart);
router.post('/updateQuantity', userAuth, cartController.updateQuantity);
router.post('/removeCartItem', userAuth, cartController.removeItem);


router.get('/check-out', userAuth, checkoutController.getCheckOutPage)
router.post('/add-address', userAuth, checkoutController.addAddress);
router.put('/edit-address/:id', userAuth, checkoutController.editAddress);
router.post('/place-order', userAuth, checkoutController.placeOrder)
router.get('/order-confirmation', checkoutController.orderConformation)
router.post('/repay',userAuth,checkoutController.rePay)
//PAYMENT CONTROLLER

router.post("/verify-payment",userAuth,paymentController.verifyPayment)



router.get('/myOrder', userAuth, OrderController.getOrdersPage)
router.post('/cancel-order/:orderId', userAuth, OrderController.cancelOrder)
router.post('/remove-product/:orderId/:productId', userAuth, OrderController.removeProduct)
router.get('/order-details/:id', userAuth, OrderController.orderDetails)
router.post('/return-order/:orderId',userAuth,OrderController.returnOrder)
router.get('/generate-invoice/:orderId',userAuth,OrderController.invoiceDownload)


router.post("/apply-coupon",userAuth,checkoutController.postCoupon)

router.get("/wallet",userAuth,walletController.getWallet)
router.post("/wallet",userAuth,walletController.addAmount)


router.get("/about",userAuth,profileController.aboutUs)



module.exports = router;
