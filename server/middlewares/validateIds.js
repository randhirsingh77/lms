import mongoose from "mongoose";

// Route guard: a malformed ObjectId in a URL param used to flow into
// findById(), throw a Mongoose CastError, and surface as a 500. Reject it
// at the boundary with a clean 400 instead. Usage:
//   router.get("/:courseId", validateIds("courseId"), handler)
export const validateIds =
  (...params) =>
  (req, res, next) => {
    for (const param of params) {
      const value = req.params?.[param];
      if (value !== undefined && !mongoose.Types.ObjectId.isValid(value)) {
        return res.status(400).json({
          success: false,
          message: `Invalid ${param}`,
        });
      }
    }
    next();
  };
