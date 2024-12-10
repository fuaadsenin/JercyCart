const mongoose=require("mongoose")
const {Schema}=mongoose

const cartSchema=new Schema({
    userId:{
        type:Schema.Types.ObjectId,
        ref:"User",
        required:true
    },
    items:[{
        productId:{
            type:Schema.Types.ObjectId,
            ref:"product",
            required:true
        },
        quantity:{
            ntype:Number,
            defualt:1
        },
        price:{
            type:Number,
            required:true
        },
        totalPrice:{
            type:Number,
            required:true
        },
        status:{
            type:String,
            defualt:"placed"
        },
        cancellationReason:{
            type:String,
            defualt:none
        }

    }]
})
const Cart=mongoose.model("cart",cartSchema)
module.exports=Cart