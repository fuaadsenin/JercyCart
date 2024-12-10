const mongoose=require("mongoose")
const {Schema}=mongoose

const bannerSchema=new Schema({
    image:{
        type:String,
        require:true
    },
    title:{
        type:String,
        required:true,
    },
    description:{
        type:String,
        required:true
    },
    link:{
        type:string
    },
    startDate:{
        type:Date,
        required:true
    },
    endDate:{
        type:Date,
        required:true
    }
})

const Banner=mongoose.model("Banner",bannerSchema)
module.exports=Banner