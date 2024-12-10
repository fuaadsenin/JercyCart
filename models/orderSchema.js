const mongoose=require("mongoose")
const {Schema}=mongoose
const {v4:uuidv4}=require("uuid")


const orderSchema=new Schema({
    orderId:{
        type:String,
        defualt:()=>uuidv4(),
        unique:true
    },
    orderedItems:[{
        product:{
            type:Schema.Types.ObjectId,
            ref:"product",
            required:true
        },
        quantity:{
            type:Number,
            required:true
        },
        price:{
            type:Number,
            defualt:0
        },

    }],
    totalPrice:{
        type:Number,
        required:true
    },
    discount:{
        type:Number,
        defualt:0
    },
    finalAmount:{
        type:Number,
        required:true
    },
    address:{
        type:Schema.Types.ObjectId,
        ref:"User",
        required:true
    },
    invoiceDate:{
        type:Date
    },
    status:{
        type:String,
        required:true,
        enum:["pending","proccessind","shipped","delivered","Cancelled","return request","Returned"]
    },
    createdOn:{
        type:Date,
        default:Date.now,
        required:true
    },
    couponApplied:{
        type:Boolean,
        defualt:false
    },

})
const Order=mongoose.model("order",orderSchema)
module.exports=Order