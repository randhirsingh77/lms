import jwt from "jsonwebtoken";

// One cookie policy shared by login and logout (logout must clear the
// cookie with the SAME attributes, or browsers may keep the old one).
// Production (cross-site deployment: Vercel client + Render API) needs
// SameSite=None + Secure; local development over plain http uses Lax and
// no Secure flag, which is what browsers accept on http://localhost.
const isProd = process.env.NODE_ENV === "production";
export const sessionCookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? "none" : "lax",
};

export const generateToken = (res, user, message) => {
  const token = jwt.sign({ userId: user._id }, process.env.SECRET_KEY, {
    expiresIn: "1d",
  });

  // Never send the password hash back to the client.
  const safeUser = user.toObject ? user.toObject() : { ...user };
  delete safeUser.password;

  return res
    .status(200)
    .cookie("token", token, {
      ...sessionCookieOptions,
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    }).json({
      success: true,
      message,
      user: safeUser
    });
};
