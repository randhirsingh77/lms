import { EmptyState, PageShell } from "@/components/SiteUI";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useVerifyCertificateQuery } from "@/features/api/certificateApi";
import { Award, CalendarDays, ShieldCheck, ShieldX, User } from "lucide-react";
import React from "react";
import { Link, useParams } from "react-router-dom";

// Public certificate verification. Anyone with the link — typically an
// employer checking a certificate a student shared — lands here without
// an account. The API answers valid / revoked / not-found; this page
// just renders that verdict plainly. Verification confirms the
// certificate was issued by this platform; it is not an accreditation.
const VerifyCertificate = () => {
  const { certId } = useParams();
  const { data, isLoading, isError } = useVerifyCertificateQuery(certId);

  if (isLoading) {
    return (
      <PageShell className="py-10">
        <Skeleton className="mx-auto h-64 w-full max-w-xl" />
      </PageShell>
    );
  }

  const notFound = isError || data?.status === "not_found";
  if (notFound) {
    return (
      <PageShell className="py-14">
        <EmptyState
          icon={ShieldX}
          title="Certificate not found"
          description="No certificate exists with this ID. Check the ID on the certificate and try again."
          action={
            <Button asChild className="h-10">
              <Link to="/">Browse courses</Link>
            </Button>
          }
        />
      </PageShell>
    );
  }

  const cert = data?.certificate;
  const valid = data?.valid === true;

  return (
    <PageShell className="py-10">
      <Card className="mx-auto w-full max-w-xl">
        <CardContent className="space-y-6 p-6 sm:p-8">
          <div className="flex flex-col items-center gap-3 text-center">
            {valid ? (
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                <ShieldCheck className="h-7 w-7" />
              </span>
            ) : (
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <ShieldX className="h-7 w-7" />
              </span>
            )}
            <div>
              <h1 className="text-xl font-semibold">
                {valid ? "Certificate verified" : "Certificate not valid"}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">{data?.message}</p>
            </div>
            <Badge variant={valid ? "secondary" : "destructive"}>
              {data?.status === "revoked" ? "Revoked" : valid ? "Valid" : "Invalid"}
            </Badge>
          </div>

          {cert ? (
            <dl className="space-y-4 border-t pt-6 text-sm">
              <div className="flex items-start gap-3">
                <User className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Awarded to
                  </dt>
                  <dd className="mt-0.5 font-medium">{cert.studentName}</dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Award className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Course
                  </dt>
                  <dd className="mt-0.5 font-medium">{cert.courseTitle}</dd>
                  {cert.instructorName ? (
                    <dd className="text-muted-foreground">
                      Instructor: {cert.instructorName}
                    </dd>
                  ) : null}
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Issued by {cert.issuer}
                  </dt>
                  <dd className="mt-0.5">
                    {cert.issuedAt
                      ? new Date(cert.issuedAt).toLocaleDateString(undefined, {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })
                      : "—"}
                  </dd>
                </div>
              </div>
              <div className="border-t pt-4 text-xs text-muted-foreground">
                <p className="break-all">Certificate ID: {cert.certId}</p>
                {cert.checksum ? <p className="mt-1">Checksum: {cert.checksum}</p> : null}
              </div>
            </dl>
          ) : null}

          <p className="text-center text-xs leading-relaxed text-muted-foreground">
            This page confirms the certificate was issued by {cert?.issuer || "E-Learning"}.
            It does not imply accreditation by any external body.
          </p>
        </CardContent>
      </Card>
    </PageShell>
  );
};

export default VerifyCertificate;
