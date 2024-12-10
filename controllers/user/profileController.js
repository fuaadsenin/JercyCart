const User = require("../../models/userSchema");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const session=require("express-session")
require("dotenv").config();
function generateOtp() {
    const digits = "1234567890";
    let otp = "";
    for (let i = 0; i < 6; i++) {
        otp += digits[Math.floor(Math.random() * 10)];
    }
    console.log("Generated OTP:", otp);  // Log OTP to check if it's being generated
    return otp;
}


const sendVerificationEmail = async (email, otp) => {
    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD,
            },
        });

        const mailOptions = {
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: "Your OTP for password reset",
            html: `<b>Your OTP: ${otp}</b>`,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log("Email sent:", info.messageId);
        return true;
    } catch (error) {
        console.error("Error sending email:", error);
        return false;
    }
};



const securePassword=async(password)=>{
    try {
        const passwordHash=await bcrypt.hash(password,10)
        return passwordHash
    } catch (error) {
        
    }
}

const getForgotPassPage = async (req, res) => {
    try {
        // Check if user is logged in via session or other method
        const user = req.session.user || null; // Default to null if no user is logged in
        
        // Pass 'user' to the view context
        res.render("forgot-password", { message: null, user });
    } catch (error) {
        console.error("Error rendering forgot-password page:", error);
        res.redirect("/page.404");
    }
};


const forgotEmailValid = async (req, res) => {
    try {
        const { email } = req.body;
        const findUser = await User.findOne({ email });

        if (findUser) {
            const otp = generateOtp();
            const emailSent = await sendVerificationEmail(email, otp);

            if (emailSent) {
                req.session.userOtp = otp;
                req.session.email = email;
                req.session.otpTimestamp = Date.now(); // Store the timestamp for OTP expiry
                
                // Pass user to the view
                const user = req.session.user || null; // Default to null if no user is logged in
                res.render("forgot-otp", { message: null, user });
            } else {
                res.render("forgot-password", {
                    message: "Failed to send OTP. Please try again.",
                });
            }
        } else {
            res.render("forgot-password", {
                message: "User with this email does not exist.",
            });
        }
    } catch (error) {
        console.error("Error in forgotEmailValid:", error);
        res.redirect("/page.404");
    }
};


const verifyForgotPassOtp = async (req, res) => {
    try {
        const enteredOtp = req.body.otp;
        const otpTimestamp = req.session.otpTimestamp;
        const otpExpiryTime = 5 * 60 * 1000; // OTP expires after 5 minutes

        if (!otpTimestamp || Date.now() - otpTimestamp > otpExpiryTime) {
            return res.json({ success: false, message: "OTP has expired. Please request a new one." });
        }

        if (enteredOtp === req.session.userOtp) {
            req.session.isOtpVerified = true;
            res.json({ success: true, redirectUrl: "/reset-password" });
        } else {
            res.json({ success: false, message: "OTP does not match" });
        }
    } catch (error) {
        console.error("Error in OTP verification:", error);
        res.status(500).json({ success: false, message: "An error occurred. Please try again." });
    }
};

const getResetPassPage = async (req, res) => {
    try {
        if (!req.session.isOtpVerified || !req.session.email) {
            return res.redirect("/page.404");
        }

        const findUser = await User.findOne({ email: req.session.email });

        if (!findUser) {
            return res.redirect("/page.404");
        }

        res.render("reset-password", { user: findUser });
    } catch (error) {
        console.error("Error in getResetPassPage:", error);
        res.redirect("/page.404");
    }
};

const resendOtp=async(req,res)=>{
    try {
        const otp=generateOtp()
        req.session.userOtp=otp
        const email=req.session.email;
        console.log("resending OTP to email:",email);
        const emailSent=await sendVerificationEmail(email,otp)
        if(emailSent){
            console.log("resend Otp:",otp);
            res.status(200).json({success:true,message:"resend OTP successfull"})
            
        }
        
    } catch (error) {
        console.error("Erorr in resend OTP ",error)
        res.status(500).json({success:false,message:"Internal Server ERROR"})
    }
}

const postNewpassword=async(req,res)=>{
    try {
        const {newPass1,newPass2}=req.body
        const email=req.session.email
        if(newPass1===newPass2){
            const passwordHash=await securePassword(newPass1)
            await User.updateOne({email:email},{$set:{password:passwordHash}})
            res.redirect("/login");
        }else{
            res.render("reset-password",{message:"password do not match",user: findUser})
        }
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}

const userProfile=async(req,res)=>{
    try {
        const userId=req.session.user
        const userData=await User.findById(userId)
        res.render("profile",{
            user:userData
        })
    } catch (error) {
        console.error("Error for retrive profile data",error)
        res.redirect("/page.404")
    }
}



module.exports = {
    getForgotPassPage,
    forgotEmailValid,
    verifyForgotPassOtp,
    getResetPassPage,
    postNewpassword,
    resendOtp,
    userProfile,
};
