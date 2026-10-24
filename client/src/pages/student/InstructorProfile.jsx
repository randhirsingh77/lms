import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import CourseCard from "@/components/CourseCard";
import SocialIconLinks from "@/components/SocialIconLinks";
import {
  EmptyState,
  PageHeader,
  PageShell,
  SectionHeader,
} from "@/components/SiteUI";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetInstructorProfileQuery } from "@/features/api/authApi";
import { BookOpen, CalendarDays, Mail, Phone, Users } from "lucide-react";
import React from "react";
import { Link, useParams } from "react-router-dom";

const initialsOf = (name) =>
  (name || "?")
    .split(" ")
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();

// Public instructor page. The API payload is privacy-filtered on the
// server — a field the instructor marked private (email/phone by
// default) is not in the response at all, so this page simply renders
// what it receives and can never leak what it never got.
const InstructorProfile = () => {
  const { instructorId } = useParams();
  const { data, isLoading, isError } = useGetInstructorProfileQuery(instructorId);

  if (isLoading) {
    return (
      <PageShell className="py-10">
        <Skeleton className="mb-6 h-40 w-full" />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </PageShell>
    );
  }

  const instructor = data?.instructor;
  if (isError || !instructor) {
    return (
      <PageShell className="py-14">
        <EmptyState
          title="Instructor not found"
          description="This instructor profile doesn't exist or is no longer available."
          action={
            <Button asChild className="h-10">
              <Link to="/">Browse courses</Link>
            </Button>
          }
        />
      </PageShell>
    );
  }

  const memberSince = instructor.memberSince
    ? new Date(instructor.memberSince).toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <PageShell className="py-10">
      <Card className="mb-10">
        <CardContent className="flex flex-col gap-6 p-6 sm:flex-row sm:items-start sm:p-8">
          <Avatar className="h-24 w-24 shrink-0 sm:h-28 sm:w-28">
            <AvatarImage src={instructor.photoUrl || undefined} alt="" />
            <AvatarFallback className="text-2xl">
              {initialsOf(instructor.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                {instructor.name}
              </h1>
              <Badge variant="secondary" className="capitalize">
                Instructor
              </Badge>
            </div>
            {instructor.bio ? (
              <p className="max-w-2xl leading-relaxed text-muted-foreground">
                {instructor.bio}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <BookOpen className="h-4 w-4" />
                {instructor.courses?.length ?? 0} courses
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                {instructor.totalStudents ?? 0} students
              </span>
              {memberSince ? (
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4" />
                  Teaching since {memberSince}
                </span>
              ) : null}
              {instructor.email ? (
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="h-4 w-4" />
                  {instructor.email}
                </span>
              ) : null}
              {instructor.phone ? (
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="h-4 w-4" />
                  {instructor.phone}
                </span>
              ) : null}
            </div>
            <SocialIconLinks socialLinks={instructor.socialLinks} className="pt-1" />
          </div>
        </CardContent>
      </Card>

      <section>
        <SectionHeader
          title={`Courses by ${instructor.name}`}
          className="mb-6"
        />
        {(instructor.courses?.length ?? 0) === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No published courses yet"
            description="This instructor hasn't published a course yet — check back soon."
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {instructor.courses.map((course) => (
              <CourseCard
                key={course._id}
                course={{
                  ...course,
                  creator: {
                    _id: instructor._id,
                    name: instructor.name,
                    photoUrl: instructor.photoUrl,
                  },
                }}
              />
            ))}
          </div>
        )}
      </section>
    </PageShell>
  );
};

export default InstructorProfile;
