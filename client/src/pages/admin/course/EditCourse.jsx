import { Button } from "@/components/ui/button";
import { ListVideo } from "lucide-react";
import React from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/SiteUI";
import CourseTab from "./CourseTab";

const EditCourse = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Course details"
        description="Edit the information students see on the course page."
        action={
          <Button asChild variant="outline" className="h-11">
            <Link to="lecture">
              <ListVideo className="h-4 w-4" />
              Lectures
            </Link>
          </Button>
        }
      />
      <CourseTab />
    </div>
  );
};

export default EditCourse;
