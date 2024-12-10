const mongoose=require("mongoose")
const { schema } = require("./userSchema")
const {Schema}=mongoose

const addressSchema=new Schema({
    userId:{
        type:Schema.Types.ObjectId,
        ref:"User",
        required:true
    },
    address:[{
        addressType:{
            type:String,
            required:true
        },
        name:{
            type:String,
            required:true
        },
        city:{
            type:String,
            required:true
        },
        landMark:{
            typr:string,
            required:true
        },
        state:{
            type:String,
            required:true

        },
        pincode:{
            type:Number,
            required:true

        },
        phone:{
            type:String,
            required:true
        },
        altphone:{
            type:String,
            required:true
        }

        
    }]
})
const Address=mongoose.model("Adress",addressSchema)
module.exports=Address