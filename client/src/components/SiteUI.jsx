import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Shared building blocks for the WHOLE product — student pages and the
// instructor admin both import from here (the old admin-only AdminUI.jsx
// was a duplicate system with slightly different specs and is gone), so
// every screen speaks one design language:
//  - one page container (max-w-7xl, same gutters as the navbar)
//  - page/section headers: display-serif title, muted description
//  - one empty-state shape, one course-card skeleton
// Everything colours through theme tokens — no hardcoded hex anywhere.

export const PageShell = ({ children, className }) => (
  <div className={cn("mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8", className)}>
    {children}
  </div>
);

export const PageHeader = ({ title, description, action, className }) => (
  <div className={cn("flex flex-wrap items-start justify-between gap-4", className)}>
    <div className="min-w-0 space-y-1">
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
      {description ? (
        <p className="text-sm text-muted-foreground md:text-base">{description}</p>
      ) : null}
    </div>
    {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
  </div>
);

export const SectionHeader = ({ title, description, action, className }) => (
  <div className={cn("mb-8 flex flex-wrap items-end justify-between gap-4", className)}>
    <div className="min-w-0 space-y-1">
      <h2 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h2>
      {description ? (
        <p className="text-sm text-muted-foreground md:text-base">{description}</p>
      ) : null}
    </div>
    {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
  </div>
);

export const EmptyState = ({ icon: Icon, title, description, action, className, bare = false }) => (
  <div
    className={cn(
      "flex flex-col items-center justify-center gap-2 rounded-xl px-6 py-12 text-center",
      // Standalone empty states get the dashed frame; `bare` is for when
      // the empty state already sits inside a Card (no double frame).
      bare ? "" : "border border-dashed",
      className
    )}
  >
    {Icon ? (
      <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
    ) : null}
    <h2 className="text-base font-semibold">{title}</h2>
    {description ? (
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
    ) : null}
    {action ? <div className="mt-3">{action}</div> : null}
  </div>
);

export const CourseCardSkeleton = () => (
  <div className="overflow-hidden rounded-xl border bg-card">
    {/* 16:9 to match CourseCard exactly, so the grid does not jump
        when the real thumbnails land. */}
    <Skeleton className="aspect-video w-full rounded-none" />
    <div className="space-y-3 p-5">
      <Skeleton className="h-5 w-3/4" />
      <div className="flex items-center gap-3">
        <Skeleton className="h-7 w-7 rounded-full" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
    </div>
  </div>
);

export const CourseGridSkeleton = ({ count = 4 }) => (
  <>
    {Array.from({ length: count }).map((_, i) => (
      <CourseCardSkeleton key={i} />
    ))}
  </>
);
