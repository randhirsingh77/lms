import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
dotenv.config({});

cloudinary.config({
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
  cloud_name: process.env.CLOUD_NAME,
});

export const uploadMedia = async (file) => {
  // Let upload errors throw: swallowing them here returned `undefined`,
  // which callers then dereferenced (cloudResponse.secure_url) and turned
  // into confusing 500s — or, worse, reported success with no file stored.
  const uploadResponse = await cloudinary.uploader.upload(file, {
    resource_type: "auto",
  });
  return uploadResponse;
};
export const deleteMediaFromCloudinary = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error(error?.name || "Error", "-", String(error?.message || "").slice(0, 200));
  }
};

// Deletes a video asset (resource_type MUST be "video" — without it the
// provider looks in the image bucket and reports the video as missing).
// An asset that is already gone ("not found") counts as success: the goal
// of the call is that the file no longer exists. Real provider failures
// are logged and reported via the boolean so callers can decide; this
// helper never throws.
export const deleteVideoFromCloudinary = async (publicId) => {
    try {
        const result = await cloudinary.uploader.destroy(publicId, { resource_type: "video" });
        if (result?.result === "ok" || result?.result === "not found") {
            return true;
        }
        console.error("Cloudinary video delete:", "-", `unexpected result "${result?.result}" for ${publicId}`);
        return false;
    } catch (error) {
        console.error(error?.name || "Error", "-", String(error?.message || "").slice(0, 200));
        return false;
    }
}

