const mongoose = require('mongoose');
const { Schema } = mongoose;

const commentSchema = new Schema({
    productId: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    comments: [
        {
            userId: {
                type: Schema.Types.ObjectId,
                ref:'User',
                required: true
            },
            comment: {
                type: String,
                trim:true
            },
            rating: {
                type: Number,
                min:0,
                max: 5
            },
            date: {
                type: Date,
                default: Date.now
            }
        }

    ]


});

const Comments = mongoose.model('Comments',commentSchema);

module.exports =Comments;