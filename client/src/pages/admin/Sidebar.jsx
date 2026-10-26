import { cn } from "@/lib/utils";
import { GraduationCap, Home, LayoutDashboard, MessagesSquare, PlusCircle, SquareLibrary } from "lucide-react";
import React from "react";
import { useSelector } from "react-redux";
import { Link, NavLink, Outlet } from "react-router-dom";

// Admin shell: a sticky sidebar on desktop (it sticks below the fixed
// 64px site navbar, not under it). On smaller screens there is no second
// menu bar here — the site navbar's single mobile menu carries these
// same items in its "Manage" section (see Navbar.jsx), so an instructor
// never sees two hamburger buttons at once. Content is one centred
// column with a single padding rule — p-4 / sm:p-6 / lg:p-8 — on every
// admin page.
export const NAV_ITEMS = [
  { to: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "course", label: "Courses", icon: SquareLibrary },
  { to: "course/create", label: "Create Course", icon: PlusCircle },
  { to: "doubts", label: "Doubts inbox", icon: MessagesSquare },
];

const AdminNav = ({ onNavigate }) => {
  const { user } = useSelector((store) => store.auth);
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-2 pb-6">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <GraduationCap className="h-5 w-5" />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold">E-Learning</p>
          <p className="text-xs text-muted-foreground">Instructor admin</p>
        </div>
      </div>

      <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Manage
      </p>
      <nav className="space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive
                    ? "bg-primary/10 text-primary dark:bg-primary/20"
                    : "text-muted-foreground"
                )
              }
            >
              <Icon className="h-5 w-5 shrink-0" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="mt-auto space-y-3 pt-6">
        <Link
          to="/"
          onClick={onNavigate}
          className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <Home className="h-5 w-5 shrink-0" />
          Back to site
        </Link>
        {user ? (
          <div className="flex items-center gap-3 border-t px-3 pt-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {user.name?.charAt(0)?.toUpperCase() || "I"}
            </span>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="text-xs capitalize text-muted-foreground">{user.role}</p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

const Sidebar = () => {
  return (
    <div className="flex w-full">
      <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 border-r bg-card/40 p-4 lg:block">
        <AdminNav />
      </aside>

      <div className="min-w-0 flex-1">
        {/* App.jsx already provides the page <main>; a second nested one
            is invalid HTML, so the admin content column is a div. */}
        <div className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
