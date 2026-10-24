import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import React from "react";
import { Outlet, useLocation } from "react-router-dom";

// Site chrome: fixed navbar (h-16 → the mt-16 offset), the routed page,
// and the footer everywhere EXCEPT the admin area, which has its own
// full-height shell.
const MainLayout = () => {
  const { pathname } = useLocation();
  const isAdmin = pathname.startsWith("/admin");
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div className="mt-16 flex flex-1 flex-col">
        <Outlet />
      </div>
      {!isAdmin && <Footer />}
    </div>
  );
};

export default MainLayout;
