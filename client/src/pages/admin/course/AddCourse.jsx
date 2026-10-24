import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { useCreateCourseMutation } from "@/features/api/courseApi";
import { Loader2 } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "../AdminUI";
import { CATEGORIES } from "./categories";

const AddCourse = () => {
  const [courseTitle, setCourseTitle] = useState("");
  const [category, setCategory] = useState("");

  const [createCourse, { data, isLoading, error, isSuccess }] =
    useCreateCourseMutation();

  const navigate = useNavigate();

  const createCourseHandler = async () => {
    await createCourse({ courseTitle, category });
  };

  useEffect(() => {
    if (isSuccess) {
      toast.success(data?.message || "Course created.");
      navigate("/admin/course");
    }
    if (error) {
      toast.error(error?.data?.message || "Failed to create course");
    }
  }, [isSuccess, error, data, navigate]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create course"
        description="Start with a title and category — description, price, thumbnail and lectures come next."
      />

      <Card className="max-w-2xl shadow-sm">
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="course-title">Course title</Label>
            <Input
              id="course-title"
              type="text"
              value={courseTitle}
              onChange={(e) => setCourseTitle(e.target.value)}
              placeholder="Ex. Fullstack Development Bootcamp"
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="course-category">Category</Label>
            <Select value={category || undefined} onValueChange={setCategory}>
              <SelectTrigger id="course-category" className="h-11 w-full">
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
            <p className="text-xs text-muted-foreground">
              The category is how students filter courses in search, so pick the closest match.
            </p>
          </div>

          <div className="flex flex-wrap justify-end gap-3 pt-2">
            <Button
              variant="outline"
              className="h-11"
              onClick={() => navigate("/admin/course")}
            >
              Back
            </Button>
            <Button
              className="h-11"
              disabled={isLoading || !courseTitle.trim() || !category}
              onClick={createCourseHandler}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Please wait
                </>
              ) : (
                "Create course"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddCourse;
