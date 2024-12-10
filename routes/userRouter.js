const express = require("express");
const router = express.Router();
const userController = require("../controllers/user/userController");
const productController=require("../controllers/user/productController")
const profileController=require("../controllers/user/profileController")
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

module.exports = router;
