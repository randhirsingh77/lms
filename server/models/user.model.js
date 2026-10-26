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
    // Public-profile fields (tasks: richer profiles + instructor pages).
    // phone/bio are plain profile data the owner edits; what the PUBLIC
    // sees is governed by fieldPrivacy / socialPrivacy below — safe
    // defaults: contact details (email, phone) start PRIVATE, the
    // storefront fields (bio, social links) start public. The public
    // instructor endpoint (user.controller.getPublicInstructor) enforces
    // this server-side — private values never enter its payload at all.
    phone:{
        type:String,
        default:"",
        trim:true,
        maxlength:20
    },
    bio:{
        type:String,
        default:"",
        trim:true,
        maxlength:1000
    },
    socialLinks:{
        instagram:{ type:String, default:"", trim:true, maxlength:300 },
        youtube:{ type:String, default:"", trim:true, maxlength:300 },
        twitter:{ type:String, default:"", trim:true, maxlength:300 },
        linkedin:{ type:String, default:"", trim:true, maxlength:300 },
        github:{ type:String, default:"", trim:true, maxlength:300 },
        website:{ type:String, default:"", trim:true, maxlength:300 }
    },
    fieldPrivacy:{
        email:{ type:String, enum:["public","private"], default:"private" },
        phone:{ type:String, enum:["public","private"], default:"private" },
        bio:{ type:String, enum:["public","private"], default:"public" }
    },
    socialPrivacy:{
        instagram:{ type:String, enum:["public","private"], default:"public" },
        youtube:{ type:String, enum:["public","private"], default:"public" },
        twitter:{ type:String, enum:["public","private"], default:"public" },
        linkedin:{ type:String, enum:["public","private"], default:"public" },
        github:{ type:String, enum:["public","private"], default:"public" },
        website:{ type:String, enum:["public","private"], default:"public" }
    },
    // Public SKILL profile (shareable student page at /u/:slug).
    // Strictly OPT-IN: enabled defaults to false and the page 404s
    // while disabled. The slug is a random token generated when the
    // student first enables the page — never the name or email, so
    // profiles can't be enumerated. showScores lets the student hide
    // quiz scores while still showing completed courses. The public
    // payload is assembled field-by-field in getPublicStudentProfile;
    // email and phone are never part of it.
    publicProfile:{
        enabled:{ type:Boolean, default:false },
        slug:{ type:String, default:undefined },
        showScores:{ type:Boolean, default:true }
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

// Sparse: accounts that never enabled a public profile have no slug
// at all, so they stay out of the index (and out of reach) entirely.
userSchema.index({ "publicProfile.slug": 1 }, { unique: true, sparse: true });

export const User = mongoose.model("User", userSchema);