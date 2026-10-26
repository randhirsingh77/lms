import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCreateLectureMutation,
  useGetCourseLectureQuery,
} from "@/features/api/courseApi";
import { ArrowLeft, ListVideo, Loader2 } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { EmptyState, PageHeader } from "@/components/SiteUI";
import Lecture from "./Lecture";

const CreateLecture = () => {
  const [lectureTitle, setLectureTitle] = useState("");
  const params = useParams();
  const courseId = params.courseId;
  const navigate = useNavigate();

  const [createLecture, { data, isLoading, isSuccess, error }] =
    useCreateLectureMutation();

  const {
    data: lectureData,
    isLoading: lectureLoading,
    isError: lectureError,
    refetch,
  } = useGetCourseLectureQuery(courseId);

  const createLectureHandler = async () => {
    await createLecture({ lectureTitle, courseId });
  };

  useEffect(() => {
    if (isSuccess) {
      refetch();
      setLectureTitle("");
      toast.success(data?.message || "Lecture created.");
    }
    if (error) {
      toast.error(error?.data?.message || "Failed to create lecture");
    }
  }, [isSuccess, error, data, refetch]);

  const lectures = lectureData?.lectures ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lectures"
        description="Add lectures to this course, then open one to upload its video."
        action={
          <Button
            variant="outline"
            className="h-11"
            onClick={() => navigate(`/admin/course/${courseId}`)}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to course
          </Button>
        }
      />

      <Card className="max-w-2xl shadow-sm">
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="lecture-title">Lecture title</Label>
            <Input
              id="lecture-title"
              type="text"
              value={lectureTitle}
              onChange={(e) => setLectureTitle(e.target.value)}
              placeholder="Ex. Introduction to Javascript"
              className="h-11"
            />
          </div>
          <div className="flex justify-end">
            <Button
              className="h-11"
              disabled={isLoading || !lectureTitle.trim()}
              onClick={createLectureHandler}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Please wait
                </>
              ) : (
                "Create lecture"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">
          Course lectures{" "}
          <span className="text-sm font-normal text-muted-foreground">
            ({lectures.length})
          </span>
        </h2>
        {lectureLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : lectureError ? (
          <Card className="shadow-sm">
            <EmptyState bare
              icon={ListVideo}
              title="Could not load lectures"
              description="Something went wrong while fetching this course's lectures."
              action={
                <Button variant="outline" className="h-11" onClick={() => refetch()}>
                  Try again
                </Button>
              }
            />
          </Card>
        ) : lectures.length === 0 ? (
          <Card className="shadow-sm">
            <EmptyState bare
              icon={ListVideo}
              title="No lectures yet"
              description="Create your first lecture above — a course needs at least one lecture before it can be published."
            />
          </Card>
        ) : (
          <div className="space-y-2">
            {lectures.map((lecture, index) => (
              <Lecture key={lecture._id} lecture={lecture} index={index} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default CreateLecture;
