import { GraduationCap, KeyRound, Menu } from "lucide-react";
import React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import DarkMode from "@/components/DarkMode";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useLogoutUserMutation } from "@/features/api/authApi";
import { toast } from "sonner";
import { useSelector } from "react-redux";
import { cn } from "@/lib/utils";

const initialsOf = (name) =>
  (name || "?")
    .split(" ")
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();

const Brand = () => (
  <Link to="/" className="flex shrink-0 items-center gap-2">
    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
      <GraduationCap className="h-5 w-5" />
    </span>
    <span className="text-xl font-bold tracking-tight">E-Learning</span>
  </Link>
);

const navLinkClass = ({ isActive }) =>
  cn(
    "text-sm font-medium transition-colors hover:text-foreground",
    isActive ? "text-foreground" : "text-muted-foreground"
  );

const Navbar = () => {
  const { user } = useSelector((store) => store.auth);
  const [logoutUser] = useLogoutUserMutation();
  const navigate = useNavigate();
  // React to the mutation result HERE, not via an isSuccess effect: the
  // logout lifecycle now resets the whole authApi state (cache isolation
  // between accounts), which would wipe the mutation's success flag
  // before an effect could ever observe it.
  const logoutHandler = async () => {
    try {
      const data = await logoutUser().unwrap();
      toast.success(data?.message || "User log out.");
    } catch {
      // The local session and caches are cleared regardless; still leave.
    }
    navigate("/login");
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-full w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Brand />
          <nav className="hidden items-center gap-6 md:flex">
            <NavLink to="/course/search?query=" className={navLinkClass}>
              Browse Courses
            </NavLink>
            {user ? (
              <NavLink to="/my-learning" className={navLinkClass}>
                My Learning
              </NavLink>
            ) : null}
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden md:block">
            <DarkMode />
          </div>
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Open account menu"
                  className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user?.photoUrl || undefined} alt="" />
                    <AvatarFallback>{initialsOf(user?.name)}</AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">
                <DropdownMenuLabel className="space-y-0.5">
                  <p className="truncate">{user.name}</p>
                  <p className="truncate text-xs font-normal text-muted-foreground">
                    {user.email}
                  </p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem asChild>
                    <Link to="/my-learning">My learning</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/profile">Edit Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/change-password" className="flex items-center gap-2">
                      <KeyRound className="h-4 w-4" />
                      Reset Password
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={logoutHandler}>
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                {user?.role === "instructor" && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/admin/dashboard">Dashboard</Link>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Button variant="outline" className="h-10" onClick={() => navigate("/login")}>
                Login
              </Button>
              <Button className="h-10" onClick={() => navigate("/signup")}>
                Get Started
              </Button>
            </div>
          )}
          <div className="md:hidden">
            <MobileNavbar user={user} onLogout={logoutHandler} />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;

const MobileNavbar = ({ user, onLogout }) => {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button size="icon" variant="outline" className="h-10 w-10" aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col p-6">
        <SheetHeader className="flex flex-row items-center justify-between">
          <SheetTitle>
            <Brand />
          </SheetTitle>
          <DarkMode />
        </SheetHeader>

        {user ? (
          <div className="flex items-center gap-3 border-b pb-5">
            <Avatar className="h-11 w-11">
              <AvatarImage src={user?.photoUrl || undefined} alt="" />
              <AvatarFallback>{initialsOf(user?.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 leading-tight">
              <p className="truncate font-medium">{user.name}</p>
              <p className="truncate text-sm capitalize text-muted-foreground">
                {user.role}
              </p>
            </div>
          </div>
        ) : null}

        <nav className="flex flex-col gap-1 text-base font-medium">
          <SheetClose asChild>
            <Link to="/" className="rounded-lg px-3 py-2.5 hover:bg-accent">
              Home
            </Link>
          </SheetClose>
          <SheetClose asChild>
            <Link to="/course/search?query=" className="rounded-lg px-3 py-2.5 hover:bg-accent">
              Browse Courses
            </Link>
          </SheetClose>
          {user ? (
            <>
              <SheetClose asChild>
                <Link to="/my-learning" className="rounded-lg px-3 py-2.5 hover:bg-accent">
                  My Learning
                </Link>
              </SheetClose>
              <SheetClose asChild>
                <Link to="/profile" className="rounded-lg px-3 py-2.5 hover:bg-accent">
                  Edit Profile
                </Link>
              </SheetClose>
              <SheetClose asChild>
                <Link to="/change-password" className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 hover:bg-accent">
                  <KeyRound className="h-4 w-4" />
                  Reset Password
                </Link>
              </SheetClose>
              {user?.role === "instructor" ? (
                <SheetClose asChild>
                  <Link to="/admin/dashboard" className="rounded-lg px-3 py-2.5 hover:bg-accent">
                    Dashboard
                  </Link>
                </SheetClose>
              ) : null}
            </>
          ) : null}
        </nav>

        <div className="mt-auto flex flex-col gap-2 border-t pt-5">
          {user ? (
            <SheetClose asChild>
              <Button variant="outline" className="h-11 w-full" onClick={onLogout}>
                Log out
              </Button>
            </SheetClose>
          ) : (
            <>
              <SheetClose asChild>
                <Button asChild className="h-11 w-full">
                  <Link to="/signup">Get Started</Link>
                </Button>
              </SheetClose>
              <SheetClose asChild>
                <Button asChild variant="outline" className="h-11 w-full">
                  <Link to="/login">Login</Link>
                </Button>
              </SheetClose>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
