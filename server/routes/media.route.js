import express from "express";
import fs from "node:fs";
import { uploadVideo } from "../utils/multer.js";
import { uploadMedia } from "../utils/cloudinary.js";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import isInstructor from "../middlewares/isInstructor.js";

const router = express.Router();

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
