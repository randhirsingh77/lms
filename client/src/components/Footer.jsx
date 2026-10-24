import { GraduationCap } from "lucide-react";
import React from "react";
import { Link } from "react-router-dom";
import { PageShell } from "./SiteUI";

// Site footer: brand + the real routes of the app. Kept deliberately
// small — no invented links, awards or social proof.
const Footer = () => {
  return (
    <footer className="border-t bg-muted/40">
      <PageShell className="py-10">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm space-y-3">
            <Link to="/" className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <GraduationCap className="h-5 w-5" />
              </span>
              <span className="text-lg font-bold tracking-tight">E-Learning</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Video courses with progress tracking for students, and a real
              sales dashboard for the instructors who teach them.
            </p>
          </div>
          <nav className="grid grid-cols-2 gap-x-16 gap-y-2 text-sm">
            <span className="col-span-2 pb-1 font-semibold">Explore</span>
            <Link to="/" className="text-muted-foreground transition-colors hover:text-foreground">
              Home
            </Link>
            <Link
              to="/course/search?query="
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Browse courses
            </Link>
            <Link
              to="/my-learning"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              My learning
            </Link>
            <Link
              to="/profile"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Profile
            </Link>
          </nav>
        </div>
        <div className="mt-10 border-t pt-6 text-sm text-muted-foreground">
          © {new Date().getFullYear()} E-Learning. All rights reserved.
        </div>
      </PageShell>
    </footer>
  );
};

export default Footer;
