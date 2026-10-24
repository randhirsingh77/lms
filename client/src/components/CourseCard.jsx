import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import React from "react";
import { Link } from "react-router-dom";

// THE course card for the whole student site — home grid, search results
// are list rows, but My Learning / Profile / Home all render a course
// through this component so thumbnail, creator, level and price always
// look (and behave) the same.
const initialsOf = (name) =>
  (name || "?")
    .split(" ")
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();

const CourseCard = ({ course }) => {
  return (
    <Link to={`/course-detail/${course._id}`} className="group block h-full">
      <Card className="flex h-full flex-col gap-0 overflow-hidden rounded-xl py-0 shadow-sm transition-shadow duration-300 hover:shadow-md">
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
            {course.courseTitle}
          </h3>
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
    </Link>
  );
};

export default CourseCard;
