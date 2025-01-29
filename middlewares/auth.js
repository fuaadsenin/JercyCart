const User=require("../models/userSchema")




const userAuth = (req, res, next) => {
    // Get user from session
    const user = req.session.user || req.session.passport?.user;
  
    if (user) {
      // Find user in the database
      User.findById(user)
        .then(data => {
          if (data && !data.isBlocked) {
            next(); // User is authenticated and not blocked, proceed
          } else {
            // If user is blocked, destroy the session and redirect to login
            req.session.destroy(err => {
              if (err) {
                console.error("Error destroying session:", err);
                res.status(500).send("Internal server error");
                return;
              }
              res.redirect("/login?message=Account Blocked");
            });
          }
        })
        .catch(error => {
          console.error("Error in userAuth middleware:", error);
          res.status(500).send("Internal server error");
        });
    } else {
      // User not logged in, redirect to login
      res.redirect("/login");
    }
  };
  



const adminAuth=async(req,res,next)=>{
    try {
        const data= User.findOne({isAdmin:true,_id:req.session.userId})
        if(data){
            next()
        }else{
            res.redirect("/admin/login")
        }

    } catch (error) {
        console.error("Error in adminAuth",error)
    }
}





const loginAuth=(req,res,next)=>{
    const user=req.session.user||req.session.passport?.user
    if(user){   
        User.findById(user)
        .then(data=>{
            if(data && !data.isBlocked){
                res.redirect("/")
               
                
            }else{
          
                
                res.redirect("/login")
                // next()
            }
        }).catch(error=>{
            console.log("Error in user auth middleware");
            res.status(500).send("internal server error")
            
        })

       
    }else{
        
      next()
    }
}





module.exports={
    userAuth,
    adminAuth,
    loginAuth,
}