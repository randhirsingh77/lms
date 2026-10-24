import { Badge } from "@/components/ui/badge";
import React from "react";
import { Link } from "react-router-dom";

// One search-result ROW (list layout, unlike the grid CourseCard):
// thumbnail, title/subtitle, instructor, level badge, price. The
// instructor name is its own link to the public instructor page, so the
// thumbnail/title keep their own link to the course (no nested anchors).
const SearchResult = ({ course }) => {
  return (
    <article className="border-b py-5 first:pt-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <Link to={`/course-detail/${course._id}`} className="shrink-0">
          <img
            src={course.courseThumbnail}
            alt={course.courseTitle || "Course thumbnail"}
            className="h-36 w-full rounded-lg object-cover sm:h-32 sm:w-56"
            loading="lazy"
          />
        </Link>
        <div className="min-w-0 flex-1 space-y-1.5">
          <Link to={`/course-detail/${course._id}`} className="block w-fit max-w-full">
            <h2 className="text-lg font-bold leading-snug hover:underline md:text-xl">
              {course.courseTitle}
            </h2>
          </Link>
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {course.subTitle}
          </p>
          <p className="text-sm text-muted-foreground">
            Instructor:{" "}
            {course.creator?._id ? (
              <Link
                to={`/instructor/${course.creator._id}`}
                className="font-semibold text-foreground hover:underline"
              >
                {course.creator?.name}
              </Link>
            ) : (
              <span className="font-semibold text-foreground">
                {course.creator?.name}
              </span>
            )}
          </p>
          {course.courseLevel ? (
            <Badge variant="secondary" className="mt-1 w-fit">
              {course.courseLevel}
            </Badge>
          ) : null}
        </div>
        <div className="shrink-0 sm:pl-4 sm:text-right">
          <p className="text-lg font-bold md:text-xl">₹{course.coursePrice}</p>
        </div>
      </div>
    </article>
  );
};

export default SearchResult;
