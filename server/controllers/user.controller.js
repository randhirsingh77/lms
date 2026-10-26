import {User} from "../models/user.model.js";
import { Course } from "../models/course.model.js";
import { CourseProgress } from "../models/courseProgress.js";
import { QuizAttempt } from "../models/quizAttempt.model.js";
import { Certificate } from "../models/certificate.model.js";
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
        const previousPhotoUrl = user.photoUrl;
        if(profilePhoto){
            // Upload the NEW photo FIRST; the old asset is deleted only
            // after the new one is safely stored (below). The old order
            // deleted the stored photo BEFORE uploading — a failed
            // upload left photoUrl pointing at a deleted image — and
            // the 500 return discarded every other field in the same
            // submit, so a photo problem looked like "profile update
            // failed" and ate the user's name/bio/social edits too.
            let cloudResponse = null;
            try {
                cloudResponse = await uploadMedia(profilePhoto.path);
            } catch {
                cloudResponse = null;
            }
            fs.unlink(profilePhoto.path, () => {});
            if(!cloudResponse?.secure_url){
                // Save the text-field updates anyway — the photo is the
                // only thing that failed, so it is the only thing the
                // user should have to retry. The message stays specific.
                if (Object.keys(updatedData).length > 0) {
                    await User.findByIdAndUpdate(userId, updatedData);
                }
                return res.status(500).json({
                    success:false,
                    message:"Failed to upload profile photo. Please try again."
                })
            }
            updatedData.photoUrl = cloudResponse.secure_url;
        }
        const updatedUser = await User.findByIdAndUpdate(userId, updatedData, {new:true}).select("-password -resetPasswordToken -resetPasswordExpire");
        // New photo saved — now the old asset can go (best effort; the
        // delete helper logs its own errors and never throws).
        if(profilePhoto && updatedData.photoUrl && previousPhotoUrl){
            const publicId = previousPhotoUrl.split("/").pop().split(".")[0]; // extract public id
            await deleteMediaFromCloudinary(publicId);
        }

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
// Public skill profile (opt-in shareable student page, /u/:slug).
//
// Privacy rules (enforced HERE, field-by-field, like the instructor
// page): the profile is OFF by default; while off the endpoint answers
// 404 exactly like a slug that never existed. The payload contains the
// student's name/photo, completed courses, certificates (linked to
// their public verify pages), quiz performance (only if the student
// left scores visible) and learning streaks. NEVER email, phone, or
// any account field.
// ---------------------------------------------------------------------------

const istDayKey = (date) =>
    new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(date);

const dayKeyToUtcMs = (key) => {
    const [y, m, d] = key.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
};

// Streaks from REAL activity days (a lecture first viewed, or a quiz
// passed) in Asia/Kolkata. Activity tracking began with the viewedAt /
// attempt timestamps — days before that simply don't exist in the
// data, and the page copy says streaks count from when tracking began.
const computeStreaks = (dayKeys) => {
    const days = [...new Set(dayKeys)].sort();
    if (days.length === 0) return { currentStreak: 0, longestStreak: 0, totalActiveDays: 0 };
    let longest = 1;
    let run = 1;
    for (let i = 1; i < days.length; i++) {
        const diffDays = Math.round((dayKeyToUtcMs(days[i]) - dayKeyToUtcMs(days[i - 1])) / 86400000);
        run = diffDays === 1 ? run + 1 : 1;
        if (run > longest) longest = run;
    }
    // Current streak: the run of consecutive calendar days ending
    // today (or yesterday — today may simply not have happened yet).
    // Day keys are plain calendar dates, so stepping back one day is
    // exact UTC date arithmetic on the key itself.
    const daySet = new Set(days);
    const prevKeyOf = (key) =>
        new Date(dayKeyToUtcMs(key) - 86400000).toISOString().slice(0, 10);
    const todayKey = istDayKey(new Date());
    const yesterdayKey = prevKeyOf(todayKey);
    let current = 0;
    if (daySet.has(todayKey) || daySet.has(yesterdayKey)) {
        let cursor = daySet.has(todayKey) ? todayKey : yesterdayKey;
        current = 1;
        while (daySet.has(prevKeyOf(cursor))) {
            current += 1;
            cursor = prevKeyOf(cursor);
        }
    }
    return { currentStreak: current, longestStreak: longest, totalActiveDays: days.length };
};

export const getPublicStudentProfile = async (req, res) => {
    try {
        const { slug } = req.params;
        if (typeof slug !== "string" || slug.length < 8 || slug.length > 64) {
            return res.status(404).json({ success: false, message: "Profile not found" });
        }
        const user = await User.findOne({
            "publicProfile.slug": slug,
            "publicProfile.enabled": true,
        }).select("name photoUrl bio fieldPrivacy createdAt publicProfile");
        if (!user) {
            return res.status(404).json({ success: false, message: "Profile not found" });
        }

        const userIdStr = String(user._id);
        const progresses = await CourseProgress.find({ userId: userIdStr }).lean();
        const courseIds = [...new Set(progresses.map((p) => p.courseId))];
        const courses = await Course.find({ _id: { $in: courseIds } })
            .select("courseTitle lectures creator")
            .populate({ path: "creator", select: "name" })
            .lean();
        const courseById = new Map(courses.map((c) => [String(c._id), c]));

        const certificates = await Certificate.find({ userId: user._id, revoked: false })
            .select("certId courseId createdAt")
            .lean();
        const certByCourse = new Map(certificates.map((c) => [String(c.courseId), c]));

        const showScores = user.publicProfile?.showScores !== false;
        const attempts = showScores
            ? await QuizAttempt.find({ userId: user._id }).select("courseId quizId score passed attemptedAt").lean()
            : [];

        // Activity days for streaks (independent of score visibility).
        const allAttemptsForActivity = showScores
            ? attempts
            : await QuizAttempt.find({ userId: user._id, passed: true }).select("attemptedAt").lean();
        const activityDays = [];
        for (const progress of progresses) {
            for (const entry of progress.lectureProgress || []) {
                if (entry.viewed && entry.viewedAt) activityDays.push(istDayKey(new Date(entry.viewedAt)));
            }
        }
        for (const attempt of allAttemptsForActivity) {
            if (attempt.passed && attempt.attemptedAt) activityDays.push(istDayKey(new Date(attempt.attemptedAt)));
        }

        const completedCourses = [];
        for (const progress of progresses) {
            const course = courseById.get(String(progress.courseId));
            if (!course) continue;
            const lectureIds = (course.lectures || []).map((id) => String(id));
            if (lectureIds.length === 0) continue;
            const viewedEntries = (progress.lectureProgress || []).filter(
                (e) => e.viewed && lectureIds.includes(String(e.lectureId))
            );
            if (viewedEntries.length < lectureIds.length) continue;
            const viewedDates = viewedEntries.map((e) => e.viewedAt).filter(Boolean).map((d) => new Date(d));
            const entry = {
                _id: course._id,
                courseTitle: course.courseTitle,
                instructorName: course.creator?.name || "",
                completedAt: viewedDates.length
                    ? new Date(Math.max(...viewedDates)).toISOString()
                    : null,
            };
            const cert = certByCourse.get(String(course._id));
            if (cert) entry.certificateId = cert.certId;
            if (showScores) {
                const courseAttempts = attempts.filter((a) => String(a.courseId) === String(course._id));
                if (courseAttempts.length > 0) {
                    const bestByQuiz = new Map();
                    for (const a of courseAttempts) {
                        const key = String(a.quizId);
                        if (!bestByQuiz.has(key) || a.score > bestByQuiz.get(key)) {
                            bestByQuiz.set(key, a.score);
                        }
                    }
                    const bestScores = [...bestByQuiz.values()];
                    entry.quiz = {
                        averageBestScore: Math.round(
                            bestScores.reduce((sum, s) => sum + s, 0) / bestScores.length
                        ),
                        quizzesPassed: new Set(
                            courseAttempts.filter((a) => a.passed).map((a) => String(a.quizId))
                        ).size,
                        quizzesAttempted: bestByQuiz.size,
                    };
                }
            }
            completedCourses.push(entry);
        }
        completedCourses.sort((a, b) =>
            String(b.completedAt || "").localeCompare(String(a.completedAt || ""))
        );

        const profile = {
            name: user.name,
            photoUrl: user.photoUrl || "",
            memberSince: user.createdAt,
            completedCourses,
            certificatesIssued: certificates.length,
            streaks: computeStreaks(activityDays),
            showScores,
        };
        const bioIsPublic =
            (user.fieldPrivacy?.bio === "public" || user.fieldPrivacy?.bio === "private"
                ? user.fieldPrivacy.bio
                : "public") === "public";
        if (bioIsPublic && user.bio) profile.bio = user.bio;

        return res.status(200).json({ success: true, profile });
    } catch (error) {
        console.error(error?.name || "Error", "-", String(error?.message || "").slice(0, 200));
        return res.status(500).json({
            success: false,
            message: "Failed to load profile",
        });
    }
};

// PUT /api/v1/user/public-profile — the owner toggles their public
// skill profile. The slug is minted once, on first enable, and kept
// across disable/re-enable so shared links don't rot.
export const updatePublicProfileSettings = async (req, res) => {
    try {
        const { enabled, showScores } = req.body || {};
        if (enabled !== undefined && typeof enabled !== "boolean") {
            return res.status(400).json({ success: false, message: "enabled must be true or false." });
        }
        if (showScores !== undefined && typeof showScores !== "boolean") {
            return res.status(400).json({ success: false, message: "showScores must be true or false." });
        }
        const user = await User.findById(req.id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        if (!user.publicProfile) user.publicProfile = {};
        if (enabled !== undefined) user.publicProfile.enabled = enabled;
        if (showScores !== undefined) user.publicProfile.showScores = showScores;
        if (user.publicProfile.enabled && !user.publicProfile.slug) {
            user.publicProfile.slug = crypto.randomBytes(12).toString("base64url");
        }
        await user.save();
        return res.status(200).json({
            success: true,
            publicProfile: {
                enabled: !!user.publicProfile.enabled,
                slug: user.publicProfile.slug || null,
                showScores: user.publicProfile.showScores !== false,
            },
            message: "Public profile settings updated.",
        });
    } catch (error) {
        console.error(error?.name || "Error", "-", String(error?.message || "").slice(0, 200));
        return res.status(500).json({
            success: false,
            message: "Failed to update public profile settings",
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