import CourseCard from "@/components/CourseCard";
import {
  CourseGridSkeleton,
  EmptyState,
  PageShell,
  SectionHeader,
} from "@/components/SiteUI";
import { Button } from "@/components/ui/button";
import { useGetPublishedCourseQuery } from "@/features/api/courseApi";
import { AlertCircle, LibraryBig } from "lucide-react";
import React from "react";
import { Link } from "react-router-dom";

// Home course grid: every published course through the one shared
// CourseCard, inside the shared page shell with the shared section
// header. Loading, error and empty are real states, not afterthoughts.
const Courses = () => {
  const { data, isLoading, isError, refetch } = useGetPublishedCourseQuery();
  const courses = data?.courses ?? [];

  return (
    <section>
      <PageShell className="py-14">
        <SectionHeader
          title="Our Courses"
          description="Published courses from our instructors — pick one and start learning."
          action={
            <Button asChild variant="outline" className="h-10">
              <Link to="/course/search?query=">Browse all</Link>
            </Button>
          }
        />
        {isError ? (
          <EmptyState
            icon={AlertCircle}
            title="Couldn't load courses"
            description="Something went wrong while fetching courses. Please try again."
            action={
              <Button onClick={() => refetch()} className="h-10">
                Retry
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {isLoading ? (
              <CourseGridSkeleton count={8} />
            ) : courses.length === 0 ? (
              <div className="col-span-full">
                <EmptyState
                  icon={LibraryBig}
                  title="No courses yet"
                  description="No courses have been published yet. Please check back soon."
                />
              </div>
            ) : (
              courses.map((course) => (
                <CourseCard key={course._id} course={course} />
              ))
            )}
          </div>
        )}
      </PageShell>
    </section>
  );
};

export default Courses;
