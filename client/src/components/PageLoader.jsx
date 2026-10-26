import { GraduationCap, Loader2 } from "lucide-react";
import React from "react";
import { cn } from "@/lib/utils";

// THE full-page loading state for the whole app — session restore at
// boot and route guards use this, so a wait always looks like the
// product: the same brand mark as the navbar/footer, theme tokens only
// (correct in dark mode), one small spinner doing the motion. It
// replaces the old hardcoded blue/gray spinner screen ("Loading,
// Please wait....."), which matched nothing in the design system.
//
// `contained` is for waits INSIDE the layout (navbar already on
// screen): the loader takes a tall band instead of the full viewport.
const PageLoader = ({
  message = "Loading…",
  description,
  contained = false,
  className,
}) => {
  return (
    <div
      role="status"
      aria-label={message}
      className={cn(
        "flex flex-col items-center justify-center gap-5 bg-background px-6 text-center",
        contained ? "min-h-[55vh] py-16" : "min-h-screen",
        className
      )}
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
        <GraduationCap className="h-7 w-7" aria-hidden />
      </span>
      <div className="space-y-2">
        <p className="text-lg font-bold tracking-tight">E-Learning</p>
        <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2
            className="h-4 w-4 animate-spin text-primary motion-reduce:animate-none"
            aria-hidden
          />
          {message}
        </p>
        {description ? (
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
};

export default PageLoader;
