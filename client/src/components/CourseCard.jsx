import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import React from "react";
import { Link } from "react-router-dom";

// THE course card for the whole student site — home grid, My Learning,
// Profile, instructor pages. The whole card clicks through to the
// course via a stretched link: the title IS the link, and its ::after
// covers the card (the Bootstrap pattern — a separate overlay anchor
// would sit on top of the title text and intercept its clicks). The
// creator row is a REAL second link to the instructor's public page,
// lifted above the stretched area with relative z-10 — anchors can't
// nest, so it can't live inside the title link.
const initialsOf = (name) =>
  (name || "?")
    .split(" ")
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();

const CourseCard = ({ course }) => {
  return (
    <Card className="group relative flex h-full flex-col gap-0 overflow-hidden rounded-xl py-0 shadow-sm transition-shadow duration-300 hover:shadow-md">
      <div className="relative shrink-0">
        <img
          src={course.courseThumbnail}
          alt={course.courseTitle || "Course thumbnail"}
          className="h-40 w-full object-cover"
          loading="lazy"
        />
      </div>
      <CardContent className="flex flex-1 flex-col gap-3 p-5">
        <h3 className="line-clamp-1 text-lg font-semibold group-hover:underline">
          <Link
            to={`/course-detail/${course._id}`}
            className="after:absolute after:inset-0"
          >
            {course.courseTitle}
          </Link>
        </h3>
        {course.creator?.name ? (
          course.creator?._id ? (
            <Link
              to={`/instructor/${course.creator._id}`}
              className="relative z-10 flex w-fit items-center gap-3 rounded-md hover:underline"
            >
              <Avatar className="h-7 w-7">
                <AvatarImage src={course.creator?.photoUrl || undefined} alt="" />
                <AvatarFallback className="text-[10px]">
                  {initialsOf(course.creator?.name)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate text-sm text-muted-foreground">
                {course.creator?.name}
              </span>
            </Link>
          ) : (
            <div className="flex items-center gap-3">
              <Avatar className="h-7 w-7">
                <AvatarImage src={course.creator?.photoUrl || undefined} alt="" />
                <AvatarFallback className="text-[10px]">
                  {initialsOf(course.creator?.name)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate text-sm text-muted-foreground">
                {course.creator?.name}
              </span>
            </div>
          )
        ) : null}
        <div className="mt-auto flex items-center justify-between pt-1">
          <span className="text-lg font-bold">₹{course.coursePrice}</span>
          {course.courseLevel ? (
            <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-xs">
              {course.courseLevel}
            </Badge>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
};

export default CourseCard;
