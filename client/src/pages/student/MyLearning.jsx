import CourseCard from "@/components/CourseCard";
import {
  CourseGridSkeleton,
  EmptyState,
  PageHeader,
  PageShell,
  SectionHeader,
} from "@/components/SiteUI";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLoadUserQuery } from "@/features/api/authApi";
import { useGetMyCertificatesQuery } from "@/features/api/certificateApi";
import { Award, BookOpen } from "lucide-react";
import React from "react";
import { Link } from "react-router-dom";

const MyLearning = () => {
  const { data, isLoading } = useLoadUserQuery();
  const myLearning = data?.user?.enrolledCourses || [];
  const { data: certData } = useGetMyCertificatesQuery();
  const certificates = (certData?.certificates || []).filter((c) => !c.revoked);

  return (
    <PageShell className="py-10">
      <PageHeader
        title="My Learning"
        description="Courses you're enrolled in — continue where you left off."
        className="mb-8"
      />
      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <CourseGridSkeleton count={3} />
        </div>
      ) : myLearning.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No courses yet"
          description="You are not enrolled in any course yet. Browse the catalogue and pick your first one."
          action={
            <Button asChild className="h-10">
              <Link to="/course/search?query=">Browse courses</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {myLearning.map((course) => (
            <CourseCard key={course._id} course={course} />
          ))}
        </div>
      )}

      {certificates.length > 0 ? (
        <section className="mt-12">
          <SectionHeader
            title="My certificates"
            description="Certificates you've earned — each one is publicly verifiable."
            className="mb-6"
          />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {certificates.map((cert) => (
              <Card key={cert.certId}>
                <CardContent className="space-y-3 p-5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Award className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-medium leading-snug">{cert.courseTitle}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Issued{" "}
                      {cert.issuedAt
                        ? new Date(cert.issuedAt).toLocaleDateString(undefined, {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : ""}
                      {" · "}
                      {cert.issuer}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button asChild size="sm" className="h-9">
                      <Link to={`/certificate/${cert.certId}`}>View / Print</Link>
                    </Button>
                    <Button asChild size="sm" variant="outline" className="h-9">
                      <Link to={`/verify/${cert.certId}`}>Verify</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}
    </PageShell>
  );
};

export default MyLearning;
