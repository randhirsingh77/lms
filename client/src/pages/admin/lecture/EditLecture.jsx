import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import React from "react";
import { Link, useParams } from "react-router-dom";
import LectureTab from "./LectureTab";

const EditLecture = () => {
  const params = useParams();
  const courseId = params.courseId;
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          asChild
          size="icon"
          variant="outline"
          className="h-11 w-11 rounded-full"
        >
          <Link
            to={`/admin/course/${courseId}/lecture`}
            aria-label="Back to lectures"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Update lecture</h1>
          <p className="text-sm text-muted-foreground">
            Change the title, video or free-preview setting.
          </p>
        </div>
      </div>
      <LectureTab />
    </div>
  );
};

export default EditLecture;
