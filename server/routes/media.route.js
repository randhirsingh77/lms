import express from "express";
import upload from "../utils/multer.js";
import { uploadMedia } from "../utils/cloudinary.js";
import isAuthenticated from "../middlewares/isAuthenticated.js";

const router = express.Router();

// Auth required: this endpoint spends the owner's Cloudinary quota, and it
// used to be open to the whole internet. It also crashed with a 500 when
// the request had no file, because req.file.path was read unconditionally.
router.route("/upload-video").post(isAuthenticated, upload.single("file"), async(req,res) => {
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
        console.log(error);
        res.status(500).json({message:"Error uploading file"})
    }
});
export default router;
