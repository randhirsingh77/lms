import mongoose from "mongoose";

const lectureSchema = new mongoose.Schema({
  lectureTitle: {
    type: String,
    required: true,
  },
  videoUrl: { type: String },
  publicId: { type: String },
  // Where this lecture's video actually lives. "cloudinary" is the
  // original store (publicId is its asset id) and stays the default for
  // every existing row — nothing about legacy lectures changes. "r2"
  // rows carry the object `key` instead, and their playback URL is
  // derived from it (R2 public base + key, see utils/r2.js).
  provider: { type: String, enum: ["cloudinary", "r2"], default: "cloudinary" },
  key: { type: String },
  // The URL players should use. Stored at write time; the toJSON
  // transform below also backfills it from videoUrl for rows written
  // before this field existed, so API consumers can always read
  // playbackUrl and never need to know the provider.
  playbackUrl: { type: String },
  isPreviewFree: { type: Boolean },
},{timestamps:true});

lectureSchema.set("toJSON", {
  transform: (doc, ret) => {
    if (!ret.playbackUrl && ret.videoUrl) ret.playbackUrl = ret.videoUrl;
    return ret;
  },
});
lectureSchema.set("toObject", {
  transform: (doc, ret) => {
    if (!ret.playbackUrl && ret.videoUrl) ret.playbackUrl = ret.videoUrl;
    return ret;
  },
});

export const Lecture = mongoose.model("Lecture", lectureSchema);
