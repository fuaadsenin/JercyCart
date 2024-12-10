const mongoose=require("mongoose")
const {Schema}=mongoose

const couponSchema=new Schema({
    name:{
        type:String,
        required:true,
        unique:true
    },
    createdOn:{
        type:Date,
        defualt:Date.now,
        required:true
    },
    expireOn:{
        type:Date,
        required:true
    },
    offerPrice:{
        type:Number,
        required:true
    },
    minimumPrice:{
        type:Number,
        required:true
    },
    isList:{
        type:Boolean,
        defualt:true
    },
    userId:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"

    }]
})

const coupon=mongoose.model("coupon",couponSchema)
module.exports=coupon