import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useGetCreatorCourseQuery } from "@/features/api/courseApi";
import { AlertCircle, BookOpen, Pencil, Plus } from "lucide-react";
import React from "react";
import { useNavigate } from "react-router-dom";
import { EmptyState, PageHeader } from "../AdminUI";

const CourseTable = () => {
  const { data, isLoading, isError, refetch } = useGetCreatorCourseQuery();
  const navigate = useNavigate();

  const courses = data?.courses ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Courses"
        description="Create and manage your courses, lectures and pricing."
        action={
          <Button className="h-11" onClick={() => navigate("create")}>
            <Plus className="h-4 w-4" />
            Create course
          </Button>
        }
      />

      <Card className="overflow-hidden p-0 shadow-sm">
        {isLoading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : isError ? (
          <EmptyState
            icon={AlertCircle}
            title="Could not load your courses"
            description="Something went wrong while fetching your course list."
            action={
              <Button variant="outline" className="h-11" onClick={() => refetch()}>
                Try again
              </Button>
            }
          />
        ) : courses.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No courses yet"
            description="Create your first course — you can add lectures, pricing and a thumbnail right after."
            action={
              <Button className="h-11" onClick={() => navigate("create")}>
                <Plus className="h-4 w-4" />
                Create course
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-[680px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Lectures</TableHead>
                  <TableHead className="text-right">Students</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses.map((course) => (
                  <TableRow key={course._id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {course.courseThumbnail ? (
                          <img
                            src={course.courseThumbnail}
                            alt=""
                            className="h-10 w-16 shrink-0 rounded-md object-cover"
                          />
                        ) : (
                          <span className="flex h-10 w-16 shrink-0 items-center justify-center rounded-md bg-muted">
                            <BookOpen className="h-4 w-4 text-muted-foreground" />
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-medium">{course.courseTitle}</p>
                          <p className="truncate text-xs capitalize text-muted-foreground">
                            {course.category}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {course.courseLevel || "—"}
                    </TableCell>
                    <TableCell>
                      {course.isPublished ? (
                        <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
                          Published
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Draft</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {course.lectures?.length ?? 0}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {course.enrolledStudents?.length ?? 0}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {course.coursePrice != null ? `₹${course.coursePrice}` : "NA"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        className="h-10"
                        onClick={() => navigate(`${course._id}`)}
                      >
                        <Pencil className="h-4 w-4" />
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default CourseTable;
