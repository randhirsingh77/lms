import express from "express";
import fs from "node:fs";
import crypto from "node:crypto";
import { uploadVideo } from "../utils/multer.js";
import { uploadMedia } from "../utils/cloudinary.js";
import { isR2Configured, createPresignedPutUrl, getR2PublicUrl } from "../utils/r2.js";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import isInstructor from "../middlewares/isInstructor.js";

const router = express.Router();

// Which store should the client's next upload use? R2 when the owner
// has configured it (see utils/r2.js), Cloudinary otherwise — the
// Cloudinary flow below is the long-standing default and is untouched.
router.route("/storage-provider").get(isAuthenticated, isInstructor, (req, res) => {
  return res.status(200).json({
    success: true,
    provider: isR2Configured() ? "r2" : "cloudinary",
  });
});

// Presign a direct browser→R2 upload. The server hands back a
// short-lived PUT URL for one fresh object key; the file itself never
// passes through this server (the free instance could not proxy
// lecture-sized video anyway). The lecture record is updated with the
// returned key through the normal edit-lecture call afterwards.
router.route("/r2/presign").post(isAuthenticated, isInstructor, async (req, res) => {
  try {
    if (!isR2Configured()) {
      return res.status(503).json({
        success: false,
        code: "R2_NOT_CONFIGURED",
        message:
          "R2 storage is not configured on this server. Uploads are using Cloudinary.",
      });
    }
    const { filename, contentType } = req.body || {};
    const type = typeof contentType === "string" && contentType ? contentType : "video/mp4";
    if (!type.startsWith("video/")) {
      return res.status(400).json({
        success: false,
        message: "Only video files can be uploaded here.",
      });
    }
    const safeName = String(filename || "lecture-video")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .slice(-80);
    const key = `lectures/${Date.now()}-${crypto.randomBytes(6).toString("hex")}-${safeName}`;
    const uploadUrl = await createPresignedPutUrl(key, type);
    return res.status(200).json({
      success: true,
      uploadUrl,
      key,
      playbackUrl: getR2PublicUrl(key),
      expiresIn: 900,
    });
  } catch (error) {
    console.error(error?.name || "Error", "-", String(error?.message || "").slice(0, 200));
    return res.status(500).json({ success: false, message: "Failed to prepare upload" });
  }
});

// Auth required: this endpoint spends the owner's Cloudinary quota, and it
// used to be open to the whole internet. Instructor-only on top of that:
// lecture videos are uploaded by course creators, never by students, so
// a student account has no business spending upload quota. It also
// crashed with a 500 when the request had no file, because req.file.path
// was read unconditionally. The uploader itself now enforces video type
// + a 200 MB cap.
router.route("/upload-video").post(isAuthenticated, isInstructor, uploadVideo.single("file"), async(req,res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success:false,
                message:"No file uploaded. Attach the video as form field 'file'."
            });
        }
        const result = await uploadMedia(req.file.path);
        res.status(200).json({
            success:true,
            message:"File uploaded successfully.",
            data:result
        });
    } catch (error) {
        console.error(error?.name || "Error", "-", String(error?.message || "").slice(0, 200));
        res.status(500).json({message:"Error uploading file"})
    } finally {
        // Remove the local temp copy either way — it used to accumulate on
        // disk forever, one file per upload.
        if (req.file) fs.unlink(req.file.path, () => {});
    }
});
export default router;
