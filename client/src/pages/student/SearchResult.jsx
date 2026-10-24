import { Badge } from "@/components/ui/badge";
import React from "react";
import { Link } from "react-router-dom";

// One search-result ROW (list layout, unlike the grid CourseCard):
// thumbnail, title/subtitle, instructor, level badge, price.
const SearchResult = ({ course }) => {
  return (
    <article className="border-b py-5 first:pt-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <Link
          to={`/course-detail/${course._id}`}
          className="flex min-w-0 flex-1 flex-col gap-4 sm:flex-row"
        >
          <img
            src={course.courseThumbnail}
            alt={course.courseTitle || "Course thumbnail"}
            className="h-36 w-full shrink-0 rounded-lg object-cover sm:h-32 sm:w-56"
            loading="lazy"
          />
          <div className="min-w-0 space-y-1.5">
            <h2 className="text-lg font-bold leading-snug md:text-xl">
              {course.courseTitle}
            </h2>
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {course.subTitle}
            </p>
            <p className="text-sm text-muted-foreground">
              Instructor:{" "}
              <span className="font-semibold text-foreground">
                {course.creator?.name}
              </span>
            </p>
            {course.courseLevel ? (
              <Badge variant="secondary" className="mt-1 w-fit">
                {course.courseLevel}
              </Badge>
            ) : null}
          </div>
        </Link>
        <div className="shrink-0 sm:pl-4 sm:text-right">
          <p className="text-lg font-bold md:text-xl">₹{course.coursePrice}</p>
        </div>
      </div>
    </article>
  );
};

export default SearchResult;
