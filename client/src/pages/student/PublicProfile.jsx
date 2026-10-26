import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, PageShell, SectionHeader } from "@/components/SiteUI";
import { useGetPublicStudentProfileQuery } from "@/features/api/authApi";
import { Award, BookOpenCheck, CalendarDays, Flame } from "lucide-react";
import React from "react";
import { Link, useParams } from "react-router-dom";

const initialsOf = (name) =>
  (name || "?")
    .split(" ")
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();

// Public student skill profile — strictly opt-in on the server: a
// disabled profile answers 404 here, exactly like a wrong link. The
// payload has no contact details by construction, so this page simply
// renders what it receives.
const PublicProfile = () => {
  const { slug } = useParams();
  const { data, isLoading, isError } = useGetPublicStudentProfileQuery(slug);

  if (isLoading) {
    return (
      <PageShell className="py-10">
        <Skeleton className="mb-6 h-40 w-full" />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </PageShell>
    );
  }

  const profile = data?.profile;
  if (isError || !profile) {
    return (
      <PageShell className="py-14">
        <EmptyState
          title="Profile not found"
          description="This public profile doesn't exist or hasn't been shared publicly."
          action={
            <Button asChild className="h-10">
              <Link to="/">Browse courses</Link>
            </Button>
          }
        />
      </PageShell>
    );
  }

  const { streaks } = profile;

  return (
    <PageShell className="py-10">
      <Card className="mb-10">
        <CardContent className="flex flex-col items-center gap-4 p-6 text-center sm:flex-row sm:text-left">
          <Avatar className="h-20 w-20">
            <AvatarImage src={profile.photoUrl || undefined} alt="" />
            <AvatarFallback className="text-lg">{initialsOf(profile.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 space-y-1">
            <h1 className="text-2xl font-bold">{profile.name}</h1>
            {profile.bio ? (
              <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {profile.bio}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1 sm:justify-start">
              <Badge variant="secondary">
                <BookOpenCheck className="mr-1 h-3.5 w-3.5" />
                {profile.completedCourses.length} course
                {profile.completedCourses.length === 1 ? "" : "s"} completed
              </Badge>
              {profile.certificatesIssued > 0 ? (
                <Badge variant="secondary">
                  <Award className="mr-1 h-3.5 w-3.5" />
                  {profile.certificatesIssued} verified certificate
                  {profile.certificatesIssued === 1 ? "" : "s"}
                </Badge>
              ) : null}
              {profile.memberSince ? (
                <Badge variant="outline">
                  <CalendarDays className="mr-1 h-3.5 w-3.5" />
                  Learning since{" "}
                  {new Date(profile.memberSince).toLocaleDateString(undefined, {
                    month: "short",
                    year: "numeric",
                  })}
                </Badge>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      {streaks && streaks.totalActiveDays > 0 ? (
        <section className="mb-10">
          <SectionHeader title="Learning streak" className="mb-4" />
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-5 text-center">
                <Flame className="mx-auto mb-2 h-5 w-5 text-primary" />
                <p className="text-2xl font-bold">{streaks.currentStreak}</p>
                <p className="text-xs text-muted-foreground">Current streak (days)</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5 text-center">
                <p className="text-2xl font-bold">{streaks.longestStreak}</p>
                <p className="mt-7 text-xs text-muted-foreground">Longest streak (days)</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5 text-center">
                <p className="text-2xl font-bold">{streaks.totalActiveDays}</p>
                <p className="mt-7 text-xs text-muted-foreground">Active learning days</p>
              </CardContent>
            </Card>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            A learning day counts when a lecture is completed or a quiz is
            passed. Streaks are counted from when activity tracking began.
          </p>
        </section>
      ) : null}

      <section>
        <SectionHeader title="Completed courses" className="mb-6" />
        {profile.completedCourses.length === 0 ? (
          <EmptyState
            icon={BookOpenCheck}
            title="No completed courses yet"
            description="Courses appear here once every lecture has been completed."
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {profile.completedCourses.map((course) => (
              <Card key={course._id}>
                <CardContent className="space-y-3 p-5">
                  <div>
                    <p className="font-medium leading-snug">{course.courseTitle}</p>
                    {course.instructorName ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Instructor: {course.instructorName}
                      </p>
                    ) : null}
                    {course.completedAt ? (
                      <p className="text-xs text-muted-foreground">
                        Completed{" "}
                        {new Date(course.completedAt).toLocaleDateString(undefined, {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    ) : null}
                  </div>
                  {course.quiz ? (
                    <p className="text-sm">
                      Quiz average (best attempts):{" "}
                      <span className="font-semibold">{course.quiz.averageBestScore}%</span>
                      <span className="text-muted-foreground">
                        {" "}
                        · {course.quiz.quizzesPassed}/{course.quiz.quizzesAttempted} quizzes passed
                      </span>
                    </p>
                  ) : null}
                  {course.certificateId ? (
                    <Button asChild size="sm" variant="outline" className="h-9">
                      <Link to={`/verify/${course.certificateId}`}>
                        <Award className="mr-1.5 h-4 w-4" /> Verify certificate
                      </Link>
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </PageShell>
  );
};

export default PublicProfile;
