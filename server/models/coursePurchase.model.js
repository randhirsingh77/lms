import mongoose from "mongoose";
const coursePurchaseSchema = new mongoose.Schema({
    courseId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Course',
        required:true
    },
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User',
        required:true
    },
    amount:{
        type:Number,
        required:true
    },
    status:{
        type:String,
        enum:['pending', 'completed', 'failed'],
        default:'pending'
    },
    paymentId:{
        type:String,
        required:true
    }

},{timestamps:true});
// The hot lookups: "has THIS user completed THIS course" (detail page) and
// the instructor sales feed by status.
coursePurchaseSchema.index({ userId: 1, courseId: 1, status: 1 });
coursePurchaseSchema.index({ status: 1, createdAt: -1 });
export const CoursePurchase = mongoose.model('CoursePurchase', coursePurchaseSchema);