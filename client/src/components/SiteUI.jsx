import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Shared building blocks for the STUDENT-facing site — the counterpart of
// pages/admin/AdminUI.jsx, so the whole product speaks one design
// language:
//  - one page container (max-w-7xl, same gutters as the navbar)
//  - page/section headers: bold tight title, muted description
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

export const EmptyState = ({ icon: Icon, title, description, action, className }) => (
  <div
    className={cn(
      "flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-6 py-12 text-center",
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
    <Skeleton className="h-40 w-full rounded-none" />
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
