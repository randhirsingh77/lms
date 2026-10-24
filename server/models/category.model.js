import mongoose from "mongoose";

// Instructor-created course categories. The built-in list lives in code
// (mirrored by the client's categories helper); rows here are the ones
// instructors added themselves. Uniqueness is enforced on a normalised
// key — lowercase, non-alphanumerics stripped — which matches how search
// compares categories (case- and space-insensitive), so "Data Science",
// "data science" and "DataScience" are one category, not three.
const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    nameKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

export const Category = mongoose.model("Category", categorySchema);

export const categoryKeyOf = (name) =>
  String(name).toLowerCase().replace(/[^a-z0-9]/g, "");
