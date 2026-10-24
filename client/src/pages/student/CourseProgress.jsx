import { EmptyState, PageHeader, PageShell } from "@/components/SiteUI";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCompleteCourseMutation,
  useGetCourseProgressQuery,
  useInCompleteCourseMutation,
  useUpdateLectureProgressMutation,
} from "@/features/api/courseProgressApi";
import { cn } from "@/lib/utils";
import { CheckCircle, CheckCircle2, CirclePlay, VideoOff } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";

const CourseProgress = () => {
  const params = useParams();
  const courseId = params.courseId;
  const { data, isLoading, isError, refetch } =
    useGetCourseProgressQuery(courseId);

  const [updateLectureProgress] = useUpdateLectureProgressMutation();
  const [
    completeCourse,
    { data: markCompleteData, isSuccess: completedSuccess },
  ] = useCompleteCourseMutation();
  const [
    inCompleteCourse,
    { data: markInCompleteData, isSuccess: inCompletedSuccess },
  ] = useInCompleteCourseMutation();

  useEffect(() => {
    if (completedSuccess) {
      refetch();
      toast.success(markCompleteData?.message);
    }
    if (inCompletedSuccess) {
      refetch();
      toast.success(markInCompleteData?.message);
    }
  }, [completedSuccess, inCompletedSuccess, markCompleteData, markInCompleteData, refetch]);

  const [currentLecture, setCurrentLecture] = useState(null);

  if (isLoading) {
    return (
      <PageShell className="space-y-6 py-8">
        <Skeleton className="h-9 w-1/2" />
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <Skeleton className="aspect-video w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </PageShell>
    );
  }
  if (isError || !data?.data) {
    return (
      <PageShell className="py-14">
        <EmptyState
          title="Failed to load course details"
          description="Your progress couldn't be loaded right now. Please try again."
          action={
            <Button asChild className="h-10">
              <Link to="/my-learning">Back to my learning</Link>
            </Button>
          }
        />
      </PageShell>
    );
  }

  const { courseDetails, progress, completed } = data.data;
  const { courseTitle } = courseDetails;

  // A course can have zero lectures — the code below used to dereference
  // lectures[0] unconditionally and crash the whole page.
  if (!courseDetails.lectures || courseDetails.lectures.length === 0) {
    return (
      <PageShell className="py-10">
        <PageHeader title={courseTitle} className="mb-8" />
        <EmptyState
          icon={VideoOff}
          title="No lectures yet"
          description="This course has no lectures yet. Please check back later."
          action={
            <Button asChild className="h-10">
              <Link to="/my-learning">Back to my learning</Link>
            </Button>
          }
        />
      </PageShell>
    );
  }

  // initialze the first lecture is not exist
  const initialLecture =
    currentLecture || (courseDetails.lectures && courseDetails.lectures[0]);

  const isLectureCompleted = (lectureId) => {
    return progress.some((prog) => prog.lectureId === lectureId && prog.viewed);
  };

  const handleLectureProgress = async (lectureId) => {
    await updateLectureProgress({ courseId, lectureId });
    refetch();
  };
  // Handle select a specific lecture to watch
  const handleSelectLecture = (lecture) => {
    setCurrentLecture(lecture);
    handleLectureProgress(lecture._id);
  };

  const handleCompleteCourse = async () => {
    await completeCourse(courseId);
  };
  const handleInCompleteCourse = async () => {
    await inCompleteCourse(courseId);
  };

  const activeLecture = currentLecture || initialLecture;
  const activeIndex = courseDetails.lectures.findIndex(
    (lec) => lec._id === activeLecture._id
  );

  return (
    <PageShell className="py-8">
      <PageHeader
        title={courseTitle}
        className="mb-6"
        action={
          <Button
            onClick={completed ? handleInCompleteCourse : handleCompleteCourse}
            variant={completed ? "outline" : "default"}
            className="h-11"
          >
            {completed ? (
              <span className="flex items-center">
                <CheckCircle className="mr-2 h-4 w-4" /> Completed
              </span>
            ) : (
              "Mark as completed"
            )}
          </Button>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_380px]">
        {/* Video section */}
        <Card className="gap-0 overflow-hidden py-0">
          <video
            src={activeLecture?.videoUrl}
            controls
            className="aspect-video w-full bg-black"
            onPlay={() => handleLectureProgress(activeLecture._id)}
          />
          <div className="p-5">
            <p className="text-sm text-muted-foreground">
              Lecture {activeIndex + 1} of {courseDetails.lectures.length}
            </p>
            <h2 className="mt-1 text-lg font-semibold">
              {activeLecture.lectureTitle}
            </h2>
          </div>
        </Card>

        {/* Lecture list */}
        <Card className="gap-0 overflow-hidden py-0">
          <div className="border-b px-5 py-4">
            <h2 className="font-semibold">Course lectures</h2>
            <p className="text-sm text-muted-foreground">
              {progress.filter((p) => p.viewed).length} of{" "}
              {courseDetails.lectures.length} watched
            </p>
          </div>
          <div className="max-h-[560px] divide-y overflow-y-auto">
            {courseDetails.lectures.map((lecture, idx) => {
              const watched = isLectureCompleted(lecture._id);
              const isActive = lecture._id === activeLecture._id;
              return (
                <button
                  key={lecture._id}
                  type="button"
                  onClick={() => handleSelectLecture(lecture)}
                  className={cn(
                    "flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-accent",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                    isActive && "bg-accent"
                  )}
                >
                  {watched ? (
                    <CheckCircle2 className="h-6 w-6 shrink-0 text-primary" />
                  ) : (
                    <CirclePlay className="h-6 w-6 shrink-0 text-muted-foreground" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {idx + 1}. {lecture.lectureTitle}
                    </span>
                  </span>
                  {watched ? (
                    <Badge variant="secondary" className="shrink-0">
                      Completed
                    </Badge>
                  ) : null}
                </button>
              );
            })}
          </div>
        </Card>
      </div>
    </PageShell>
  );
};

export default CourseProgress;
