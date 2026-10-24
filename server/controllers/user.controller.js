import {User} from "../models/user.model.js";
import { Course } from "../models/course.model.js";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import fs from "node:fs";
import { generateToken, sessionCookieOptions } from "../utils/generateToken.js";
import { deleteMediaFromCloudinary, uploadMedia } from "../utils/cloudinary.js";
import { isSmtpConfigured, sendPasswordResetEmail } from "../utils/mailer.js";
import { publicSocialLinksOf, SOCIAL_KEYS } from "../utils/publicProfile.js";

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
        const createdUser = await User.create({
            name: cleanName,
            email: cleanEmail,
            password: hashedPassword,
            role: safeRole
        });
        // Signup IS a login: set the same session cookie login sets and
        // return the user (sans password). Previously register set no
        // cookie at all, so a brand-new user was left logged-out on the
        // login page despite the "account created" message.
        return generateToken(res, createdUser, "Account created successfully.", 201);
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
        const user = await User.findById(userId).select("-password -resetPasswordToken -resetPasswordExpire").populate("enrolledCourses");
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
// Profile fields the owner may edit (tasks: richer profiles, social
// links, per-field privacy). Everything is whitelist-validated here —
// nothing from the request body is copied blindly onto the user document.
const PRIVACY_VALUES = ["public", "private"];
const isHttpUrl = (value) => {
    try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
    } catch {
        return false;
    }
};
// Multipart forms carry objects as JSON strings; JSON bodies carry real
// objects. Accept both, return null on garbage.
const asObject = (value) => {
    if (value && typeof value === "object" && !Array.isArray(value)) return value;
    if (typeof value === "string" && value.trim()) {
        try {
            const parsed = JSON.parse(value);
            if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
        } catch { /* fall through */ }
    }
    return null;
};

export const updateProfile = async (req,res) => {
    try {
        const userId = req.id;
        const body = req.body || {};
        const {name, phone, bio} = body;
        const profilePhoto = req.file;
        const fail = (message) => {
            if (profilePhoto) fs.unlink(profilePhoto.path, () => {});
            return res.status(400).json({ message, success:false });
        };
        if (name !== undefined && !isStr(name, 1, 100)) return fail("Name must be a non-empty string.");
        if (phone !== undefined && (typeof phone !== "string" || phone.trim().length > 20 ||
            (phone.trim() && !/^[+\d][\d\s()-]{5,19}$/.test(phone.trim())))) {
            return fail("Phone number looks invalid.");
        }
        if (bio !== undefined && (typeof bio !== "string" || bio.length > 1000)) {
            return fail("Profile summary must be at most 1000 characters.");
        }
        // Social links: full URLs only (http/https) or empty to clear.
        const socialLinks = asObject(body.socialLinks);
        if (body.socialLinks !== undefined && !socialLinks) return fail("Social links must be an object.");
        if (socialLinks) {
            for (const key of SOCIAL_KEYS) {
                const v = socialLinks[key];
                if (v === undefined) continue;
                if (typeof v !== "string" || v.trim().length > 300 || (v.trim() && !isHttpUrl(v.trim()))) {
                    return fail(`The ${key} link must be a full http(s) URL.`);
                }
            }
        }
        const fieldPrivacy = asObject(body.fieldPrivacy);
        if (body.fieldPrivacy !== undefined && !fieldPrivacy) return fail("Privacy settings must be an object.");
        const socialPrivacy = asObject(body.socialPrivacy);
        if (body.socialPrivacy !== undefined && !socialPrivacy) return fail("Privacy settings must be an object.");
        for (const [obj, keys] of [[fieldPrivacy, ["email", "phone", "bio"]], [socialPrivacy, SOCIAL_KEYS]]) {
            if (!obj) continue;
            for (const key of keys) {
                if (obj[key] !== undefined && !PRIVACY_VALUES.includes(obj[key])) {
                    return fail(`Privacy for ${key} must be "public" or "private".`);
                }
            }
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
        if(phone !== undefined) updatedData.phone = phone.trim();
        if(bio !== undefined) updatedData.bio = bio.trim();
        if (socialLinks) {
            const next = {};
            for (const key of SOCIAL_KEYS) {
                next[key] = socialLinks[key] !== undefined
                    ? socialLinks[key].trim()
                    : (user.socialLinks?.[key] || "");
            }
            updatedData.socialLinks = next;
        }
        if (fieldPrivacy) {
            const next = {};
            for (const key of ["email", "phone", "bio"]) {
                next[key] = fieldPrivacy[key] !== undefined
                    ? fieldPrivacy[key]
                    : (user.fieldPrivacy?.[key] || (key === "bio" ? "public" : "private"));
            }
            updatedData.fieldPrivacy = next;
        }
        if (socialPrivacy) {
            const next = {};
            for (const key of SOCIAL_KEYS) {
                next[key] = socialPrivacy[key] !== undefined
                    ? socialPrivacy[key]
                    : (user.socialPrivacy?.[key] || "public");
            }
            updatedData.socialPrivacy = next;
        }
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
        const updatedUser = await User.findByIdAndUpdate(userId, updatedData, {new:true}).select("-password -resetPasswordToken -resetPasswordExpire");

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

// ---------------------------------------------------------------------------
// Public instructor profile (student-facing). Privacy is enforced HERE, on
// the server: the payload is assembled field by field and a field marked
// private is never copied in — hiding it in the UI would still leak it to
// anyone who opens the API response. Defaults mirror the schema: email /
// phone private unless the instructor chose otherwise; bio and social
// links public unless chosen otherwise (per-platform for socials).
// ---------------------------------------------------------------------------
export const getPublicInstructor = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id).select("-password -resetPasswordToken -resetPasswordExpire");
        if (!user || user.role !== "instructor") {
            return res.status(404).json({
                success: false,
                message: "Instructor not found",
            });
        }
        const privacyOf = (obj, key, fallback) =>
            obj?.[key] === "public" || obj?.[key] === "private" ? obj[key] : fallback;

        const instructor = {
            _id: user._id,
            name: user.name,
            photoUrl: user.photoUrl || "",
            role: user.role,
            memberSince: user.createdAt,
        };
        if (privacyOf(user.fieldPrivacy, "bio", "public") === "public" && user.bio) {
            instructor.bio = user.bio;
        }
        if (privacyOf(user.fieldPrivacy, "email", "private") === "public") {
            instructor.email = user.email;
        }
        if (privacyOf(user.fieldPrivacy, "phone", "private") === "public" && user.phone) {
            instructor.phone = user.phone;
        }
        const socials = publicSocialLinksOf(user);
        if (Object.keys(socials).length > 0) instructor.socialLinks = socials;

        // Published courses only, with COUNTS instead of the raw id arrays
        // (enrolledStudents/lectures contain other users' and content ids
        // that a public payload has no business listing).
        const courses = await Course.find({ creator: user._id, isPublished: true })
            .select("courseTitle subTitle category courseLevel coursePrice courseThumbnail enrolledStudents lectures createdAt")
            .sort({ createdAt: -1 })
            .lean();
        instructor.courses = courses.map((c) => ({
            _id: c._id,
            courseTitle: c.courseTitle,
            subTitle: c.subTitle,
            category: c.category,
            courseLevel: c.courseLevel,
            coursePrice: c.coursePrice,
            courseThumbnail: c.courseThumbnail,
            createdAt: c.createdAt,
            enrolledCount: c.enrolledStudents?.length ?? 0,
            lectureCount: c.lectures?.length ?? 0,
        }));
        instructor.totalStudents = instructor.courses.reduce((sum, c) => sum + c.enrolledCount, 0);

        return res.status(200).json({ success: true, instructor });
    } catch (error) {
        console.error(error?.name || "Error", "-", String(error?.message || "").slice(0, 200));
        return res.status(500).json({
            success: false,
            message: "Failed to load instructor profile",
        });
    }
};

// ---------------------------------------------------------------------------
// Password reset (forgot → emailed link → reset) and change-password.
//
// Design rules (same as the hardening pass):
//  - forgot-password answers ONE generic message for existing, missing and
//    malformed emails alike, so the endpoint cannot be used to enumerate
//    accounts.
//  - Only the SHA-256 hash of the token is stored; the raw token exists
//    only in the emailed link. Links expire after 30 minutes and are
//    single-use: the stored hash is cleared the moment a reset (or a
//    password change) succeeds.
//  - All three endpoints sit behind strict rate limiters (see index.js),
//    so the flow can't be spammed "for fun".
// ---------------------------------------------------------------------------

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

// Public client origin for links inside emails. CLIENT_URL wins, then the
// first CLIENT_URLS entry, then FRONTEND_URL (already the client's public
// URL for Stripe redirects), then the dev default.
const clientBaseUrl = () => {
  const raw =
    process.env.CLIENT_URL ||
    (process.env.CLIENT_URLS || "").split(",").map((s) => s.trim()).filter(Boolean)[0] ||
    process.env.FRONTEND_URL ||
    "http://localhost:5173";
  return raw.replace(/\/+$/, "");
};

const GENERIC_FORGOT_MESSAGE =
  "If an account exists for that email, a password reset link is on its way.";

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body || {};
    if (typeof email === "string" && EMAIL_RE.test(email.trim())) {
      const user = await User.findOne({ email: email.trim().toLowerCase() });
      if (user) {
        const rawToken = crypto.randomBytes(32).toString("hex");
        user.resetPasswordToken = sha256(rawToken);
        user.resetPasswordExpire = new Date(Date.now() + 30 * 60 * 1000);
        await user.save();
        const resetUrl = `${clientBaseUrl()}/reset-password?token=${rawToken}`;
        if (isSmtpConfigured()) {
          try {
            await sendPasswordResetEmail(user.email, resetUrl);
          } catch (mailError) {
            // Mail delivery problems must not change the API answer.
            console.error("Password reset email failed:", mailError?.name || "Error", "-", String(mailError?.message || "").slice(0, 200));
          }
        } else if (process.env.NODE_ENV !== "production") {
          // Dev fallback: no SMTP configured, so surface the link where a
          // developer can use it. Never do this in production.
          console.log(`[dev] Password reset link for ${user.email}: ${resetUrl}`);
        } else {
          console.error("Password reset requested but SMTP is not configured (set SMTP_HOST/SMTP_USER/SMTP_PASS) — link not delivered.");
        }
      }
    }
    // Identical answer in every case — no account enumeration.
    return res.status(200).json({ success: true, message: GENERIC_FORGOT_MESSAGE });
  } catch (error) {
    console.error(error?.name || "Error", "-", String(error?.message || "").slice(0, 200));
    // Even a server hiccup must not leak whether the account exists.
    return res.status(200).json({ success: true, message: GENERIC_FORGOT_MESSAGE });
  }
};

const RESET_LINK_INVALID_MESSAGE = "This reset link is invalid or has expired. Please request a new one.";

export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body || {};
    if (typeof newPassword !== "string" || newPassword.length < 8 || newPassword.length > 128) {
      return res.status(400).json({
        success: false,
        message: "Password must be between 8 and 128 characters.",
      });
    }
    if (typeof token !== "string" || !token.trim()) {
      return res.status(400).json({ success: false, message: RESET_LINK_INVALID_MESSAGE });
    }
    const user = await User.findOne({
      resetPasswordToken: sha256(token.trim()),
      resetPasswordExpire: { $gt: new Date() },
    });
    if (!user) {
      // One message whether the token is unknown, already used or expired.
      return res.status(400).json({ success: false, message: RESET_LINK_INVALID_MESSAGE });
    }
    user.password = await bcrypt.hash(newPassword, 12);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();
    return res.status(200).json({
      success: true,
      message: "Password has been reset. Please log in with your new password.",
    });
  } catch (error) {
    console.error(error?.name || "Error", "-", String(error?.message || "").slice(0, 200));
    return res.status(500).json({
      success: false,
      message: "Failed to reset password",
    });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (typeof currentPassword !== "string" || typeof newPassword !== "string" || !currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required.",
      });
    }
    if (newPassword.length < 8 || newPassword.length > 128) {
      return res.status(400).json({
        success: false,
        message: "New password must be between 8 and 128 characters.",
      });
    }
    const user = await User.findById(req.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    // The server — not the client — is the authority on whether the
    // current password is really the account's password.
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect.",
      });
    }
    if (newPassword === currentPassword) {
      return res.status(400).json({
        success: false,
        message: "New password must be different from the current password.",
      });
    }
    user.password = await bcrypt.hash(newPassword, 12);
    // A password change also kills any outstanding reset link.
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();
    return res.status(200).json({
      success: true,
      message: "Password changed successfully.",
    });
  } catch (error) {
    console.error(error?.name || "Error", "-", String(error?.message || "").slice(0, 200));
    return res.status(500).json({
      success: false,
      message: "Failed to change password",
    });
  }
};