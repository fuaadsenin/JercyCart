const User=require("../models/userSchema")




const userAuth=(req,res,next)=>{
    const user=req.session.user||req.session.passport?.user
    if(user){   
        User.findById(user)
        .then(data=>{
            if(data && !data.isBlocked){
                next()
            }else{
                res.redirect("/login")
            }
        }).catch(error=>{
            console.log("Error in user auth middleware");
            res.status(500).send("internal server error")
            
        })

       
    }else{
        res.redirect("/login")
    }
}

// const adminAuth=(req,res,next)=>{
//     User.findOne({isAdmin:true})
//     .then(data=>{
//         if(data){
//             next()
//         }else{
//             res.redirect("/admin/login")
//         }
//     }).catch(error=>{
//         console.log("Error in adminAuth middleware",error);
        
//         res.status(500).send("Internal server error")
//     })
// }


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