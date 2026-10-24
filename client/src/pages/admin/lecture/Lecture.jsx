import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, PlayCircle } from "lucide-react";
import React from "react";
import { useNavigate } from "react-router-dom";

const Lecture = ({ lecture, index }) => {
  const navigate = useNavigate();
  const goToUpdateLecture = () => {
    navigate(`${lecture._id}`);
  };
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-sm font-semibold text-primary">
        {index + 1}
      </span>
      <p className="min-w-0 flex-1 truncate font-medium">
        {lecture.lectureTitle}
      </p>
      {lecture.isPreviewFree ? (
        <Badge variant="secondary" className="shrink-0">
          Free preview
        </Badge>
      ) : null}
      {lecture.videoUrl ? (
        <PlayCircle className="h-4 w-4 shrink-0 text-muted-foreground" aria-label="Video uploaded" />
      ) : null}
      <Button
        variant="ghost"
        size="icon"
        className="h-11 w-11 shrink-0"
        onClick={goToUpdateLecture}
        aria-label={`Edit lecture ${index + 1}: ${lecture.lectureTitle}`}
      >
        <Pencil className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default Lecture;
