import jwt from "jsonwebtoken";

const isAuthenticated = async (req, res, next) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({
        message: "User not authenticated",
        success: false,
      });
    }
    const decode = jwt.verify(token, process.env.SECRET_KEY);
    if (!decode || !decode.userId) {
      return res.status(401).json({
        message: "Invalid token",
        success: false,
      });
    }
    req.id = decode.userId;
    next();
  } catch (error) {
    // jwt.verify throws on expired/malformed tokens. Previously this catch
    // only logged the error and never responded, so the request hung forever.
    return res.status(401).json({
      message: "Invalid token",
      success: false,
    });
  }
};
export default isAuthenticated;
