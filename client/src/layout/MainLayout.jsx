import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import React from "react";
import { Outlet, useLocation } from "react-router-dom";

// Site chrome: fixed navbar (h-16 → the mt-16 offset), the routed page,
// and the footer — but ONLY on content pages. The footer is hidden:
//  - in the admin area, which has its own full-height shell;
//  - on the auth screens (login, signup, forgot/reset password), which
//    are focused forms in the auth layout — a marketing footer under
//    them looks broken and pushes the form around on phones.
//    (Change password is a signed-in page in the normal shell, so it
//    keeps the footer like Profile does.)
// One layout-level rule by route, no per-page hacks.
const NO_FOOTER_PATHS = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
];

const MainLayout = () => {
  const { pathname } = useLocation();
  const hideFooter =
    pathname.startsWith("/admin") || NO_FOOTER_PATHS.includes(pathname);
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div className="mt-16 flex flex-1 flex-col">
        <Outlet />
      </div>
      {!hideFooter && <Footer />}
    </div>
  );
};

export default MainLayout;
