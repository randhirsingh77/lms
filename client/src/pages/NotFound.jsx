import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/SiteUI";
import React from "react";
import { Link } from "react-router-dom";

// Catch-all route (path="*"): renders inside the main layout, so an
// unknown URL — or a refresh deep-link the host failed to rewrite —
// shows a designed page instead of a blank 404.
const NotFound = () => {
  return (
    <PageShell className="flex flex-col items-center py-20 text-center md:py-28">
      <p className="text-7xl font-extrabold tracking-tight text-muted-foreground/50 md:text-8xl">
        404
      </p>
      <h1 className="mt-4 text-2xl font-bold tracking-tight md:text-3xl">
        Page not found
      </h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground md:text-base">
        The page you&apos;re looking for doesn&apos;t exist or may have
        moved. Let&apos;s get you back to learning.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button asChild className="h-11 px-6">
          <Link to="/">Go home</Link>
        </Button>
        <Button asChild variant="outline" className="h-11 px-6">
          <Link to="/course/search?query=">Browse courses</Link>
        </Button>
      </div>
    </PageShell>
  );
};

export default NotFound;
