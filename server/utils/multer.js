import multer from "multer";

// Uploads land in a local temp folder first, then controllers push them to
// Cloudinary and delete the temp file. Every uploader now has:
//  - a file-TYPE allow-list (the MIME type from the multipart headers must
//    match the endpoint's kind; Cloudinary remains a second line of
//    defence), and
//  - a SIZE cap, so one request can't fill the disk.
// Previously there were no filters and no limits at all.
const makeUpload = ({ prefix, maxSize, label }) =>
  multer({
    dest: "uploads/",
    limits: { fileSize: maxSize, files: 1 },
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith(prefix)) return cb(null, true);
      const err = new Error(`Only ${label} files are allowed`);
      err.statusCode = 400;
      return cb(err);
    },
  });

// Profile photos + course thumbnails.
export const uploadImage = makeUpload({
  prefix: "image/",
  maxSize: 5 * 1024 * 1024, // 5 MB
  label: "image",
});

// Lecture videos (media route).
export const uploadVideo = makeUpload({
  prefix: "video/",
  maxSize: 200 * 1024 * 1024, // 200 MB
  label: "video",
});

export default uploadImage;
