import CourseCard from "@/components/CourseCard";
import {
  CourseGridSkeleton,
  EmptyState,
  PageHeader,
  PageShell,
} from "@/components/SiteUI";
import { Button } from "@/components/ui/button";
import { useLoadUserQuery } from "@/features/api/authApi";
import { BookOpen } from "lucide-react";
import React from "react";
import { Link } from "react-router-dom";

const MyLearning = () => {
  const { data, isLoading } = useLoadUserQuery();
  const myLearning = data?.user?.enrolledCourses || [];

  return (
    <PageShell className="py-10">
      <PageHeader
        title="My Learning"
        description="Courses you're enrolled in — continue where you left off."
        className="mb-8"
      />
      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <CourseGridSkeleton count={3} />
        </div>
      ) : myLearning.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No courses yet"
          description="You are not enrolled in any course yet. Browse the catalogue and pick your first one."
          action={
            <Button asChild className="h-10">
              <Link to="/course/search?query=">Browse courses</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {myLearning.map((course) => (
            <CourseCard key={course._id} course={course} />
          ))}
        </div>
      )}
    </PageShell>
  );
};

export default MyLearning;
