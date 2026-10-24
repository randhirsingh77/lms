import { EmptyState, PageHeader, PageShell } from "@/components/SiteUI";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetSearchCourseQuery } from "@/features/api/courseApi";
import { SearchX } from "lucide-react";
import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Filter from "./Filter";
import SearchResult from "./SearchResult";

const SearchPage = () => {
  const [searchParams] = useSearchParams();
  // null when the page is opened without ?query= (direct link, bookmark,
  // refresh) — the API layer normalises it too, but the header copy below
  // also depends on "" meaning "just browsing".
  const query = searchParams.get("query") ?? "";
  const [selectedCategories, setSelectedCatgories] = useState([]);
  const [sortByPrice, setSortByPrice] = useState("");

  const { data, isLoading } = useGetSearchCourseQuery({
    searchQuery: query,
    categories: selectedCategories,
    sortByPrice,
  });

  const isEmpty = !isLoading && (data?.courses?.length ?? 0) === 0;

  const handleFilterChange = (categories, price) => {
    setSelectedCatgories(categories);
    setSortByPrice(price);
  };

  return (
    <PageShell className="py-10">
      <PageHeader
        title={query ? `Results for "${query}"` : "Browse courses"}
        description={
          query
            ? "Showing courses that match your search."
            : "Every published course — filter by category or sort by price."
        }
        className="mb-8"
      />
      <div className="flex flex-col gap-8 md:flex-row">
        <Filter handleFilterChange={handleFilterChange} />
        <div className="min-w-0 flex-1">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, idx) => (
              <CourseSkeleton key={idx} />
            ))
          ) : isEmpty ? (
            <EmptyState
              icon={SearchX}
              title="Course not found"
              description="Sorry, we couldn't find a course matching that search. Try different words or clear the filters."
              action={
                <Button asChild className="h-10">
                  <Link to="/">Browse all courses</Link>
                </Button>
              }
            />
          ) : (
            data?.courses?.map((course) => (
              <SearchResult key={course._id} course={course} />
            ))
          )}
        </div>
      </div>
    </PageShell>
  );
};

export default SearchPage;

const CourseSkeleton = () => {
  return (
    <div className="flex flex-col gap-4 border-b py-5 first:pt-0 sm:flex-row">
      <Skeleton className="h-36 w-full shrink-0 sm:h-32 sm:w-56" />
      <div className="flex-1 space-y-2.5">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="mt-2 h-6 w-20" />
      </div>
      <Skeleton className="h-6 w-12 shrink-0" />
    </div>
  );
};
