import { EmptyState, PageShell } from "@/components/SiteUI";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetMyCertificatesQuery } from "@/features/api/certificateApi";
import { Printer } from "lucide-react";
import QRCode from "qrcode";
import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

// The printable certificate. The certificate itself is the server
// record (see the verify page) — this page is just its paper form.
// The QR code encodes ONLY the public verify URL; anyone scanning it
// lands on /verify/<id> and sees the live status, so a revoked
// certificate fails verification even from an old printout.
const CertificatePage = () => {
  const { certId } = useParams();
  const { data, isLoading } = useGetMyCertificatesQuery();
  const [qrDataUrl, setQrDataUrl] = useState("");

  const certificate = (data?.certificates || []).find((c) => c.certId === certId);
  const verifyUrl = certificate
    ? `${window.location.origin}/verify/${certificate.certId}`
    : "";

  useEffect(() => {
    if (!verifyUrl) return;
    QRCode.toDataURL(verifyUrl, { width: 240, margin: 1 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(""));
  }, [verifyUrl]);

  if (isLoading) {
    return (
      <PageShell className="py-10">
        <Skeleton className="mx-auto aspect-[1.414/1] w-full max-w-3xl" />
      </PageShell>
    );
  }

  if (!certificate) {
    return (
      <PageShell className="py-14">
        <EmptyState
          title="Certificate not found"
          description="This certificate doesn't belong to your account, or it hasn't been issued yet."
          action={
            <Button asChild className="h-10">
              <Link to="/my-learning">Back to my learning</Link>
            </Button>
          }
        />
      </PageShell>
    );
  }

  return (
    <PageShell className="py-10">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #certificate-print, #certificate-print * { visibility: visible; }
          #certificate-print {
            position: absolute;
            inset: 0 auto auto 0;
            width: 100%;
            box-shadow: none !important;
          }
        }
      `}</style>

      <div className="no-print mx-auto mb-6 flex w-full max-w-3xl items-center justify-between gap-3">
        <Button asChild variant="outline" className="h-10">
          <Link to="/my-learning">Back to my learning</Link>
        </Button>
        <Button onClick={() => window.print()} className="h-10">
          <Printer className="mr-2 h-4 w-4" /> Print / Save as PDF
        </Button>
      </div>

      <div
        id="certificate-print"
        className="mx-auto w-full max-w-3xl rounded-xl border-4 border-double bg-card p-8 shadow-sm sm:p-12"
      >
        <div className="flex flex-col items-center text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            {certificate.issuer}
          </p>
          <h1 className="mt-4 text-3xl font-bold sm:text-4xl">
            Certificate of Completion
          </h1>
          <p className="mt-6 text-sm text-muted-foreground">This certifies that</p>
          <p className="mt-2 text-2xl font-semibold sm:text-3xl">
            {certificate.studentName}
          </p>
          <p className="mt-6 text-sm text-muted-foreground">
            has completed all lectures and requirements of the course
          </p>
          <p className="mt-2 max-w-lg text-xl font-semibold sm:text-2xl">
            {certificate.courseTitle}
          </p>
          {certificate.instructorName ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Instructor: {certificate.instructorName}
            </p>
          ) : null}

          <div className="mt-10 flex w-full flex-col items-center justify-between gap-6 border-t pt-6 text-left sm:flex-row sm:items-end">
            <div className="text-xs text-muted-foreground">
              <p>
                Issued on{" "}
                {certificate.issuedAt
                  ? new Date(certificate.issuedAt).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : "—"}
              </p>
              <p className="mt-1 break-all">Certificate ID: {certificate.certId}</p>
              {certificate.checksum ? <p>Checksum: {certificate.checksum}</p> : null}
              <p className="mt-1 max-w-xs">
                Verify this certificate at {verifyUrl}
              </p>
            </div>
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`QR code linking to the verification page for certificate ${certificate.certId}`}
                className="h-28 w-28 shrink-0"
              />
            ) : null}
          </div>
        </div>
      </div>

      <p className="mx-auto mt-6 w-full max-w-3xl text-center text-xs text-muted-foreground">
        Verification confirms this certificate was issued by {certificate.issuer}. It does
        not imply accreditation by any external body.
      </p>
    </PageShell>
  );
};

export default CertificatePage;
