import RichTextEditor from "@/components/RichTextEditor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useEditCourseMutation,
  useGetCourseByIdQuery,
  usePublishCourseMutation,
} from "@/features/api/courseApi";
import { Loader2 } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { CATEGORIES } from "./categories";

const LEVELS = ["Beginner", "Medium", "Advance"];

const CourseTab = () => {
  const [input, setInput] = useState({
    courseTitle: "",
    subTitle: "",
    description: "",
    category: "",
    courseLevel: "",
    coursePrice: "",
    courseThumbnail: null,
  });
  const params = useParams();
  const courseId = params.courseId;
  const {
    data: courseByIdData,
    isLoading: courseByIdLoading,
    refetch,
  } = useGetCourseByIdQuery(courseId, { refetchOnMountOrArgChange: true });

  const [publishCourse] = usePublishCourseMutation();

  useEffect(() => {
    if (courseByIdData?.course) {
      const course = courseByIdData.course;
      // ?? "" everywhere: unset fields used to flow into FormData as the
      // literal string "undefined" and broke saving the course.
      setInput({
        courseTitle: course.courseTitle ?? "",
        subTitle: course.subTitle ?? "",
        description: course.description ?? "",
        category: course.category ?? "",
        courseLevel: course.courseLevel ?? "",
        coursePrice: course.coursePrice ?? "",
        courseThumbnail: null,
      });
    }
  }, [courseByIdData]);

  const [previewThumbnail, setPreviewThumbnail] = useState("");
  const navigate = useNavigate();

  const [editCourse, { data, isLoading, isSuccess, error }] =
    useEditCourseMutation();

  const changeEventHandler = (e) => {
    const { name, value } = e.target;
    setInput({ ...input, [name]: value });
  };

  const selectCategory = (value) => {
    setInput({ ...input, category: value });
  };
  const selectCourseLevel = (value) => {
    setInput({ ...input, courseLevel: value });
  };
  const selectThumbnail = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setInput({ ...input, courseThumbnail: file });
      const fileReader = new FileReader();
      fileReader.onloadend = () => setPreviewThumbnail(fileReader.result);
      fileReader.readAsDataURL(file);
    }
  };

  const updateCourseHandler = async () => {
    const formData = new FormData();
    formData.append("courseTitle", input.courseTitle);
    formData.append("subTitle", input.subTitle);
    formData.append("description", input.description);
    formData.append("category", input.category);
    formData.append("courseLevel", input.courseLevel);
    formData.append("coursePrice", String(input.coursePrice));
    // Only send a thumbnail when a new file was picked — otherwise the
    // field goes out as an empty string and means nothing to the server.
    if (input.courseThumbnail instanceof File) {
      formData.append("courseThumbnail", input.courseThumbnail);
    }

    await editCourse({ formData, courseId });
  };

  const publishStatusHandler = async (action) => {
    try {
      const response = await publishCourse({ courseId, query: action });
      if (response.data) {
        refetch();
        toast.success(response.data.message);
      }
      if (response.error) {
        toast.error(response.error?.data?.message || "Failed to publish or unpublish course");
      }
    } catch {
      toast.error("Failed to publish or unpublish course");
    }
  };

  useEffect(() => {
    if (isSuccess) {
      toast.success(data?.message || "Course updated.");
    }
    if (error) {
      toast.error(error?.data?.message || "Failed to update course");
    }
  }, [isSuccess, error, data]);

  if (courseByIdLoading) {
    return (
      <Card className="shadow-sm">
        <CardContent className="space-y-4">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  const course = courseByIdData?.course;
  const hasLectures = (course?.lectures?.length ?? 0) > 0;

  return (
    <Card className="shadow-sm">
      <CardHeader className="gap-4 sm:flex sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <CardTitle className="flex flex-wrap items-center gap-2">
            Basic course information
            {course ? (
              course.isPublished ? (
                <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Published</Badge>
              ) : (
                <Badge variant="secondary">Draft</Badge>
              )
            ) : null}
          </CardTitle>
          <CardDescription>
            Make changes to your course here. Click save when you&apos;re done.
          </CardDescription>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            className="h-11"
            disabled={!hasLectures}
            title={!hasLectures ? "Add at least one lecture before publishing" : undefined}
            onClick={() =>
              publishStatusHandler(course?.isPublished ? "false" : "true")
            }
          >
            {course?.isPublished ? "Unpublish" : "Publish"}
          </Button>
          {/* The old "Remove Course" button had no handler and no delete
              endpoint exists — a dead destructive button. Removed. */}
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="ct-title">Title</Label>
            <Input
              id="ct-title"
              type="text"
              name="courseTitle"
              value={input.courseTitle}
              onChange={changeEventHandler}
              placeholder="Ex. FullStack developer"
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ct-subtitle">Subtitle</Label>
            <Input
              id="ct-subtitle"
              type="text"
              name="subTitle"
              value={input.subTitle}
              onChange={changeEventHandler}
              placeholder="Ex. Become a Fullstack developer from zero to hero in 4 months"
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <RichTextEditor input={input} setInput={setInput} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="ct-category">Category</Label>
              <Select value={input.category || undefined} onValueChange={selectCategory}>
                <SelectTrigger id="ct-category" className="h-11 w-full">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Category</SelectLabel>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ct-level">Course level</Label>
              <Select value={input.courseLevel || undefined} onValueChange={selectCourseLevel}>
                <SelectTrigger id="ct-level" className="h-11 w-full">
                  <SelectValue placeholder="Select a course level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Course Level</SelectLabel>
                    {LEVELS.map((level) => (
                      <SelectItem key={level} value={level}>
                        {level}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ct-price">Price in (INR)</Label>
              <Input
                id="ct-price"
                type="number"
                min="0"
                name="coursePrice"
                value={input.coursePrice}
                onChange={changeEventHandler}
                placeholder="199"
                className="h-11"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ct-thumbnail">Course thumbnail</Label>
            <Input
              id="ct-thumbnail"
              type="file"
              onChange={selectThumbnail}
              accept="image/*"
              className="h-11 w-full sm:w-fit"
            />
            {previewThumbnail ? (
              <img
                src={previewThumbnail}
                className="my-2 w-64 rounded-lg border"
                alt="New course thumbnail preview"
              />
            ) : course?.courseThumbnail ? (
              <img
                src={course.courseThumbnail}
                className="my-2 w-64 rounded-lg border"
                alt="Current course thumbnail"
              />
            ) : null}
          </div>

          <div className="flex flex-wrap justify-end gap-3 pt-2">
            <Button
              onClick={() => navigate("/admin/course")}
              variant="outline"
              className="h-11"
            >
              Cancel
            </Button>
            <Button disabled={isLoading} onClick={updateCourseHandler} className="h-11">
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Please wait
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CourseTab;
