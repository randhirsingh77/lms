import { User } from "../models/user.model.js";

// Must run after isAuthenticated. Restricts a route to instructor accounts
// (the same role the client's AdminRoute checks for).
const isInstructor = async (req, res, next) => {
  try {
    const user = await User.findById(req.id).select("role");
    if (!user || user.role !== "instructor") {
      return res.status(403).json({
        success: false,
        message: "Instructor access required",
      });
    }
    next();
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Failed to verify role",
    });
  }
};
export default isInstructor;
