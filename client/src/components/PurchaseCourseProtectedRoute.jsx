import { useGetCourseDetailWithStatusQuery } from "@/features/api/purchaseApi";
import { Loader2 } from "lucide-react";
import React, { useEffect, useState } from "react";

import { useParams, Navigate, useSearchParams } from "react-router-dom";

// Guards the course-progress page. Straight navigation by someone who
// never bought the course redirects to the detail page immediately.
// Arrivals from Stripe carry ?checkout=success (set on the server's
// success_url): the webhook that marks the purchase "completed" races
// the browser redirect, so a just-paid student can land here a second
// before their purchase exists. For those arrivals only, poll a few
// times showing a "confirming" state instead of bouncing a paying
// customer back to a Buy button.
const MAX_CONFIRM_ATTEMPTS = 6;

const PurchaseCourseProtectedRoute = ({ children }) => {
  const { courseId } = useParams();
  const [searchParams] = useSearchParams();
  const fromCheckout = searchParams.get("checkout") === "success";
  const { data, isLoading, refetch } = useGetCourseDetailWithStatusQuery(courseId);
  const [attempts, setAttempts] = useState(0);

  const purchased = !!data?.purchased;
  const confirming = fromCheckout && !purchased && attempts < MAX_CONFIRM_ATTEMPTS;

  useEffect(() => {
    if (!isLoading && confirming) {
      const timer = setTimeout(() => {
        setAttempts((a) => a + 1);
        refetch();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isLoading, confirming, refetch]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading…
      </div>
    );
  }

  if (purchased) return children;

  if (confirming) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="font-medium">Confirming your payment…</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Your payment went through — we&apos;re just waiting for the
          confirmation to reach us. This usually takes a few seconds.
        </p>
      </div>
    );
  }

  return <Navigate to={`/course-detail/${courseId}`} replace />;
};
export default PurchaseCourseProtectedRoute;
