import {User} from "../models/user.model.js";
import bcrypt from "bcryptjs";
import fs from "node:fs";
import { generateToken, sessionCookieOptions } from "../utils/generateToken.js";
import { deleteMediaFromCloudinary, uploadMedia } from "../utils/cloudinary.js";

// Boundary validation for credential payloads. Every field must be a
// plain STRING of sane length — an object here ({"$gt": ""}) is a NoSQL
// injection attempt, and it used to flow straight into findOne() and
// bcrypt.compare(), matching arbitrary users or crashing with a 500.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isStr = (v, min, max) => typeof v === "string" && v.trim().length >= min && v.trim().length <= max;

export const register = async (req,res) => {
    try {

        const {name, email, password, role} = req.body || {};
        if(!isStr(name, 2, 100) || typeof email !== "string" || !EMAIL_RE.test(email.trim()) || typeof password !== "string" || password.length < 8 || password.length > 128){
            return res.status(400).json({
                success:false,
                message:"Valid name, email and a password of at least 8 characters are required."
            })
        }
        const cleanName = name.trim();
        const cleanEmail = email.trim().toLowerCase();
        const user = await User.findOne({email: cleanEmail});
        if(user){
            return res.status(400).json({
                success:false,
                message:"User already exist with this email."
            })
        }
        const hashedPassword = await bcrypt.hash(password, 12);
        // The client gates the whole admin area on role === "instructor" but
        // register used to ignore the role entirely, so every account was a
        // student and nobody could ever reach the admin panel. Accept the
        // role, but only the two values the schema allows.
        const safeRole = role === "instructor" ? "instructor" : "student";
        await User.create({
            name: cleanName,
            email: cleanEmail,
            password: hashedPassword,
            role: safeRole
        });
        return res.status(201).json({
            success:true,
            message:"Account created successfully."
        })
    } catch (error) {
        // The unique email index is the real guard (the pre-check above can
        // race); surface a duplicate as the same client error, not a 500.
        if (error?.code === 11000) {
            return res.status(400).json({
                success:false,
                message:"User already exist with this email."
            })
        }
        console.error(error?.name || "Error", "-", String(error?.message || "").slice(0, 200));
        return res.status(500).json({
            success:false,
            message:"Failed to register"
        })
    }
}
export const login = async (req,res) => {
    try {
        const {email, password} = req.body || {};
        if(typeof email !== "string" || typeof password !== "string" || !email.trim() || !password){
            return res.status(400).json({
                success:false,
                message:"All fields are required."
            })
        }
        const user = await User.findOne({email: email.trim().toLowerCase()});
        if(!user){
            return res.status(400).json({
                success:false,
                message:"Incorrect email or password"
            })
        }
        const isPasswordMatch = await bcrypt.compare(password, user.password);
        if(!isPasswordMatch){
            return res.status(400).json({
                success:false,
                message:"Incorrect email or password"
            });
        }
        generateToken(res, user, `Welcome back ${user.name}`);

    } catch (error) {
        console.error(error?.name || "Error", "-", String(error?.message || "").slice(0, 200));
        return res.status(500).json({
            success:false,
            message:"Failed to login"
        })
    }
}
export const logout = async (_,res) => {
    try {
        // Clear with the SAME cookie attributes used at login — a mismatch
        // (flags/Path) makes some browsers keep the session cookie alive.
        return res.status(200).cookie("token", "", {...sessionCookieOptions, maxAge:0}).json({
            message:"Logged out successfully.",
            success:true
        })
    } catch (error) {
        console.error(error?.name || "Error", "-", String(error?.message || "").slice(0, 200));
        return res.status(500).json({
            success:false,
            message:"Failed to logout"
        }) 
    }
}
export const getUserProfile = async (req,res) => {
    try {
        const userId = req.id;
        const user = await User.findById(userId).select("-password").populate("enrolledCourses");
        if(!user){
            return res.status(404).json({
                message:"Profile not found",
                success:false
            })
        }
        return res.status(200).json({
            success:true,
            user
        })
    } catch (error) {
        console.error(error?.name || "Error", "-", String(error?.message || "").slice(0, 200));
        return res.status(500).json({
            success:false,
            message:"Failed to load user"
        })
    }
}
export const updateProfile = async (req,res) => {
    try {
        const userId = req.id;
        const {name} = req.body || {};
        const profilePhoto = req.file;
        if (name !== undefined && !isStr(name, 1, 100)) {
            if (profilePhoto) fs.unlink(profilePhoto.path, () => {});
            return res.status(400).json({
                message:"Name must be a non-empty string.",
                success:false
            })
        }

        const user = await User.findById(userId);
        if(!user){
            return res.status(404).json({
                message:"User not found",
                success:false
            }) 
        }
        // Only touch the photo when a new file was actually uploaded.
        // Previously uploadMedia(profilePhoto.path) ran unconditionally, so
        // editing just your name (no file chosen) crashed with a 500.
        const updatedData = {};
        if(name) updatedData.name = name;
        if(profilePhoto){
            // extract public id of the old image from the url if it exists;
            if(user.photoUrl){
                const publicId = user.photoUrl.split("/").pop().split(".")[0]; // extract public id
                await deleteMediaFromCloudinary(publicId);
            }

            // upload new photo
            const cloudResponse = await uploadMedia(profilePhoto.path);
            // The local temp copy has done its job — don't leak disk.
            fs.unlink(profilePhoto.path, () => {});
            if(!cloudResponse?.secure_url){
                return res.status(500).json({
                    success:false,
                    message:"Failed to upload profile photo"
                })
            }
            updatedData.photoUrl = cloudResponse.secure_url;
        }
        const updatedUser = await User.findByIdAndUpdate(userId, updatedData, {new:true}).select("-password");

        return res.status(200).json({
            success:true,
            user:updatedUser,
            message:"Profile updated successfully."
        })

    } catch (error) {
        console.error(error?.name || "Error", "-", String(error?.message || "").slice(0, 200));
        return res.status(500).json({
            success:false,
            message:"Failed to update profile"
        })
    }
}