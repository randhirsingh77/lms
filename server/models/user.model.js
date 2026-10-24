import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true,
        trim:true,
        maxlength:100
    },
    email:{
        type:String,
        required:true,
        // Actually enforce one account per email in the DATABASE (the old
        // schema had no uniqueness at all — register's manual check was
        // case-sensitive and racy, so "User@x.io" and "user@x.io" could
        // both register). Stored lowercase so login matches either way.
        unique:true,
        lowercase:true,
        trim:true
    },
    password:{
        type:String,
        required:true
    },
    role:{
        type:String,
        enum:["instructor", "student"],
        default:'student'
    },
    enrolledCourses:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:'Course'
        }
    ],
    photoUrl:{
        type:String,
        default:""
    },
    // Password reset: only the SHA-256 HASH of the emailed token is
    // stored (never the token itself), with a hard expiry. Cleared on
    // use, on password change, and on a fresh forgot-password request,
    // so a link is single-use and short-lived. Both fields are excluded
    // from every user serialisation (see the selects in the controller).
    resetPasswordToken:{
        type:String,
        default:undefined
    },
    resetPasswordExpire:{
        type:Date,
        default:undefined
    }
},{timestamps:true});

export const User = mongoose.model("User", userSchema);