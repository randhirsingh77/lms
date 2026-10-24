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
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import {
  useEditLectureMutation,
  useGetLectureByIdQuery,
  useRemoveLectureMutation,
} from "@/features/api/courseApi";
import axios from "axios";
import { Loader2, PlayCircle } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

// Was hardcoded to http://localhost:8080 — video uploads in production
// went to the instructor's own computer instead of the real API.
const MEDIA_API = `${import.meta.env.VITE_API_URL}/api/v1/media`;

const LectureTab = () => {
  const [lectureTitle, setLectureTitle] = useState("");
  const [uploadVideoInfo, setUploadVideoInfo] = useState(null);
  const [isFree, setIsFree] = useState(false);
  const [mediaProgress, setMediaProgress] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const params = useParams();
  const { courseId, lectureId } = params;
  const navigate = useNavigate();

  const { data: lectureData } = useGetLectureByIdQuery(lectureId);
  const lecture = lectureData?.lecture;

  useEffect(() => {
    if (lecture) {
      setLectureTitle(lecture.lectureTitle);
      setIsFree(Boolean(lecture.isPreviewFree));
      // The lecture stores videoUrl/publicId directly — there is no
      // lecture.videoInfo object; reading one left this state undefined.
      setUploadVideoInfo(
        lecture.videoUrl
          ? { videoUrl: lecture.videoUrl, publicId: lecture.publicId }
          : null
      );
    }
  }, [lecture]);

  const [editLecture, { data, isLoading, error, isSuccess }] =
    useEditLectureMutation();
  const [
    removeLecture,
    { data: removeData, isLoading: removeLoading, isSuccess: removeSuccess },
  ] = useRemoveLectureMutation();

  const fileChangeHandler = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const formData = new FormData();
      formData.append("file", file);
      setMediaProgress(true);
      try {
        const res = await axios.post(`${MEDIA_API}/upload-video`, formData, {
          withCredentials: true, // the upload endpoint requires login now
          onUploadProgress: ({ loaded, total }) => {
            setUploadProgress(Math.round((loaded * 100) / total));
          },
        });

        if (res.data.success) {
          setUploadVideoInfo({
            videoUrl: res.data.data.secure_url || res.data.data.url,
            publicId: res.data.data.public_id,
          });
          toast.success(res.data.message);
        }
      } catch (error) {
        console.error(error?.message || "Upload failed");
        toast.error("video upload failed");
      } finally {
        setMediaProgress(false);
      }
    }
  };

  const editLectureHandler = async () => {
    await editLecture({
      lectureTitle,
      videoInfo: uploadVideoInfo,
      isPreviewFree: isFree,
      courseId,
      lectureId,
    });
  };

  const removeLectureHandler = async () => {
    await removeLecture(lectureId);
  };

  useEffect(() => {
    if (isSuccess) {
      toast.success(data?.message || "Lecture updated.");
    }
    if (error) {
      toast.error(error?.data?.message || "Failed to update lecture");
    }
  }, [isSuccess, error, data]);

  useEffect(() => {
    if (removeSuccess) {
      toast.success(removeData?.message || "Lecture removed.");
      navigate(`/admin/course/${courseId}/lecture`);
    }
  }, [removeSuccess, removeData, navigate, courseId]);

  return (
    <Card className="shadow-sm">
      <CardHeader className="gap-4 sm:flex sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <CardTitle>Edit lecture</CardTitle>
          <CardDescription>
            Make changes to the lecture and click update when done.
          </CardDescription>
        </div>
        <Button
          disabled={removeLoading}
          variant="destructive"
          className="h-11 shrink-0"
          onClick={removeLectureHandler}
        >
          {removeLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Please wait
            </>
          ) : (
            "Remove lecture"
          )}
        </Button>
      </CardHeader>

      <CardContent>
        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="lt-title">Title</Label>
            <Input
              id="lt-title"
              value={lectureTitle}
              onChange={(e) => setLectureTitle(e.target.value)}
              type="text"
              placeholder="Ex. Introduction to Javascript"
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lt-video">
              Video <span className="text-destructive">*</span>
            </Label>
            {uploadVideoInfo?.videoUrl && !mediaProgress ? (
              <div className="space-y-2">
                <video
                  src={uploadVideoInfo.videoUrl}
                  controls
                  className="aspect-video w-full max-w-lg rounded-lg border bg-black"
                />
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <PlayCircle className="h-3.5 w-3.5" />
                  A video is uploaded for this lecture. Choose a new file below to replace it.
                </p>
              </div>
            ) : null}
            <Input
              id="lt-video"
              type="file"
              accept="video/*"
              onChange={fileChangeHandler}
              className="h-11 w-full sm:w-fit"
            />
            {mediaProgress && (
              <div className="max-w-lg space-y-1">
                <Progress value={uploadProgress} />
                <p className="text-xs text-muted-foreground">{uploadProgress}% uploaded</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="lt-free">Free preview</Label>
              <p className="text-xs text-muted-foreground">
                Let students watch this lecture without buying the course.
              </p>
            </div>
            <Switch checked={isFree} onCheckedChange={setIsFree} id="lt-free" />
          </div>

          <div className="flex justify-end pt-2">
            <Button
              disabled={isLoading || mediaProgress}
              onClick={editLectureHandler}
              className="h-11"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Please wait
                </>
              ) : (
                "Update lecture"
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LectureTab;
