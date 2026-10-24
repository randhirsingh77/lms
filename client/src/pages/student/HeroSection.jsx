import CourseCard from "@/components/CourseCard";
import { CourseCardSkeleton, PageShell } from "@/components/SiteUI";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGetPublishedCourseQuery } from "@/features/api/courseApi";
import { Search } from "lucide-react";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

// Home hero: one job — get a visitor searching or browsing. The right
// column shows the newest published course in the SAME card the grids
// use, so the hero is real product, not decoration. (The old hero was a
// hardcoded blue gradient band with white text — generic and off-token.)
const HeroSection = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const { data, isLoading } = useGetPublishedCourseQuery();
  const featured = data?.courses?.[0];

  const searchHandler = (e) => {
    e.preventDefault();
    if (searchQuery.trim() !== "") {
      navigate(`/course/search?query=${encodeURIComponent(searchQuery)}`);
    }
    setSearchQuery("");
  };

  return (
    <section className="border-b bg-muted/40">
      <PageShell className="grid items-center gap-10 py-14 md:py-20 lg:grid-cols-2">
        <div className="space-y-6">
          <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-5xl">
            Find the Best Courses Here
          </h1>
          <p className="max-w-lg text-base text-muted-foreground md:text-lg">
            Discover, learn, and upskill with our wide range of video
            courses — taught by instructors, tracked lesson by lesson.
          </p>
          <form
            onSubmit={searchHandler}
            className="flex max-w-xl items-center gap-2 rounded-full border bg-background p-1.5 shadow-sm"
          >
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Courses"
              aria-label="Search courses"
              className="flex-grow border-none px-4 shadow-none focus-visible:ring-0"
            />
            <Button type="submit" className="h-10 shrink-0 rounded-full px-5">
              <Search className="mr-2 h-4 w-4" />
              Search
            </Button>
          </form>
          <div>
            <Button
              variant="outline"
              className="h-11 rounded-full px-6"
              onClick={() => navigate(`/course/search?query=`)}
            >
              Explore Courses
            </Button>
          </div>
        </div>

        <div className="mx-auto w-full max-w-md lg:max-w-none">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Featured course
          </p>
          {isLoading ? (
            <CourseCardSkeleton />
          ) : featured ? (
            <CourseCard course={featured} />
          ) : (
            <p className="text-sm text-muted-foreground">
              New courses are on the way — check back soon.
            </p>
          )}
        </div>
      </PageShell>
    </section>
  );
};

export default HeroSection;
