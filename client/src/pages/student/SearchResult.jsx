import { Badge } from "@/components/ui/badge";
import { BookOpen } from "lucide-react";
import React, { useState } from "react";
import { Link } from "react-router-dom";

// One search-result ROW (list layout, unlike the grid CourseCard):
// thumbnail, title/subtitle, instructor, level badge, price. The
// instructor name is its own link to the public instructor page, so the
// thumbnail/title keep their own link to the course (no nested anchors).
// The thumbnail keeps one consistent shape (16:9 on phones, fixed
// 224×128 from sm up) and a missing/failed image falls back to the
// same muted book tile the course cards use.
const SearchResult = ({ course }) => {
  const [thumbFailed, setThumbFailed] = useState(false);
  const showThumb = !!course.courseThumbnail && !thumbFailed;
  return (
    <article className="border-b py-5 first:pt-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <Link to={`/course-detail/${course._id}`} className="shrink-0">
          {showThumb ? (
            <img
              src={course.courseThumbnail}
              alt={course.courseTitle || "Course thumbnail"}
              className="aspect-video w-full rounded-lg object-cover sm:aspect-auto sm:h-32 sm:w-56"
              loading="lazy"
              onError={() => setThumbFailed(true)}
            />
          ) : (
            <div className="flex aspect-video w-full items-center justify-center rounded-lg bg-muted text-muted-foreground sm:aspect-auto sm:h-32 sm:w-56">
              <BookOpen className="h-8 w-8" aria-hidden />
            </div>
          )}
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
