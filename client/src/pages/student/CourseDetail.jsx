import BuyCourseButton from "@/components/BuyCourseButton";
import SocialIconLinks from "@/components/SocialIconLinks";
import { EmptyState, PageShell } from "@/components/SiteUI";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetCourseDetailWithStatusQuery } from "@/features/api/purchaseApi";
import DOMPurify from "dompurify";
import {
  ArrowLeft,
  BadgeInfo,
  Lock,
  PlayCircle,
  ShoppingCart,
  Users,
} from "lucide-react";
import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

const CourseDetail = () => {
  const params = useParams();
  const courseId = params.courseId;
  const navigate = useNavigate();
  const { data, isLoading, isError } =
    useGetCourseDetailWithStatusQuery(courseId);

  if (isLoading) {
    return (
      <div>
        <div className="bg-primary">
          <PageShell className="space-y-3 py-10">
            <Skeleton className="h-9 w-2/3 bg-primary-foreground/20" />
            <Skeleton className="h-5 w-1/3 bg-primary-foreground/20" />
          </PageShell>
        </div>
        <PageShell className="py-10">
          <Skeleton className="h-64 w-full" />
        </PageShell>
      </div>
    );
  }
  if (isError || !data?.course) {
    return (
      <PageShell className="py-10">
        <EmptyState
          title="Failed to load course details"
          description="This course couldn't be loaded. It may have been removed, or something went wrong."
          action={
            <Button asChild className="h-10">
              <Link to="/">Back to courses</Link>
            </Button>
          }
        />
      </PageShell>
    );
  }

  const { course, purchased } = data;

  const handleContinueCourse = () => {
    if (purchased) {
      navigate(`/course-progress/${courseId}`);
    }
  };

  return (
    <div>
      {/* Course header band — primary token surface, same family as the
          auth brand panel (was a hardcoded #2D2F31 hex block). */}
      <div className="bg-primary text-primary-foreground">
        <PageShell className="space-y-3 py-10">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-foreground/80 transition-colors hover:text-primary-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> All courses
          </Link>
          <h1 className="max-w-3xl text-2xl font-bold tracking-tight md:text-3xl">
            {course?.courseTitle}
          </h1>
          <p className="max-w-2xl text-base text-primary-foreground/85 md:text-lg">
            {course?.subTitle}
          </p>
          <p className="text-sm">
            Created by{" "}
            {course?.creator?._id ? (
              <Link
                to={`/instructor/${course.creator._id}`}
                className="font-medium underline underline-offset-4 hover:text-primary-foreground"
              >
                {course?.creator?.name}
              </Link>
            ) : (
              <span className="font-medium underline underline-offset-4">
                {course?.creator?.name}
              </span>
            )}
          </p>
          {/* Public social links only (the API payload is already
              privacy-filtered) — icon buttons, never raw URLs. */}
          <SocialIconLinks
            socialLinks={course?.creator?.socialLinks}
            linkClassName="border-primary-foreground/30 bg-transparent text-primary-foreground/85 hover:bg-primary-foreground/10 hover:text-primary-foreground"
          />
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1 text-sm text-primary-foreground/85">
            <span className="inline-flex items-center gap-1.5">
              <BadgeInfo size={16} />
              Last updated {course?.createdAt?.split("T")[0]}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users size={16} />
              {course?.enrolledCount ?? course?.enrolledStudents?.length ?? 0} students enrolled
            </span>
          </div>
        </PageShell>
      </div>

      <PageShell className="grid gap-10 py-10 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-8">
          <section className="space-y-3">
            <h2 className="text-xl font-bold tracking-tight md:text-2xl">
              Description
            </h2>
            {/* The description is instructor-written rich text (Jodit). It
                MUST be sanitised before hitting the DOM: rendering it raw
                let any instructor account inject <script>/event handlers
                into every student's browser (stored XSS). DOMPurify keeps
                the formatting tags and strips anything executable. The
                arbitrary-variant guards are overflow insurance: a huge
                table, image or unbroken link in the HTML can no longer
                push the page wider than the screen. */}
            <div
              className="break-words leading-relaxed text-muted-foreground [&_a]:break-words [&_img]:h-auto [&_img]:max-w-full [&_li]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-3 [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto [&_ul]:list-disc [&_ul]:pl-5"
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(course.description || ""),
              }}
            />
          </section>

          <Card>
            <CardHeader>
              <CardTitle>Course Content</CardTitle>
              <CardDescription>
                {course.lectures?.length ?? 0} lectures
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(course.lectures?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No lectures have been added to this course yet.
                </p>
              ) : (
                <div className="divide-y">
                  {course.lectures.map((lecture) => {
                    const playable = lecture.isPreviewFree || purchased;
                    return (
                      <div
                        key={lecture._id}
                        className="flex items-center justify-between gap-3 py-2.5 text-sm"
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          {playable ? (
                            <PlayCircle size={16} className="shrink-0 text-primary" />
                          ) : (
                            <Lock size={16} className="shrink-0 text-muted-foreground" />
                          )}
                          <span className="truncate">{lecture.lectureTitle}</span>
                        </span>
                        {lecture.isPreviewFree ? (
                          <Badge variant="secondary" className="shrink-0">
                            Preview
                          </Badge>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="min-w-0">
          <Card className="overflow-hidden py-0 lg:sticky lg:top-24">
            <div className="aspect-video w-full bg-black">
              {/* Same native <video> pattern as every other player in
                  the app (this preview was the last ReactPlayer user). */}
              <video
                className="h-full w-full"
                src={course.lectures?.[0]?.videoUrl || undefined}
                poster={course.courseThumbnail || undefined}
                controls
                preload="metadata"
              />
            </div>
            <CardContent className="space-y-3 p-5">
              <p className="text-sm text-muted-foreground">
                {course.lectures?.[0]?.lectureTitle || "Course preview"}
              </p>
              <Separator />
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-muted-foreground">Course price</span>
                <span className="text-2xl font-bold">₹{course.coursePrice}</span>
              </div>
              {purchased ? (
                <Button onClick={handleContinueCourse} className="h-11 w-full">
                  Continue Course
                </Button>
              ) : (
                <BuyCourseButton courseId={courseId} />
              )}
              {!purchased ? (
                <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
                  <ShoppingCart className="h-3.5 w-3.5" />
                  Secure checkout via Stripe
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </PageShell>
    </div>
  );
};

export default CourseDetail;
