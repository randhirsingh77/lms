import PageLoader from "@/components/PageLoader";
import { useGetCourseDetailWithStatusQuery, useVerifyCheckoutSessionMutation } from "@/features/api/purchaseApi";
import React, { useEffect, useRef, useState } from "react";

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
  const sessionId = searchParams.get("session_id");
  const { data, isLoading, refetch } = useGetCourseDetailWithStatusQuery(courseId);
  const [verifyCheckoutSession] = useVerifyCheckoutSessionMutation();
  const verifyFired = useRef(false);
  const [attempts, setAttempts] = useState(0);

  const purchased = !!data?.purchased;
  const confirming = fromCheckout && !purchased && attempts < MAX_CONFIRM_ATTEMPTS;

  // Don't wait for the webhook: with the session id in the return URL,
  // ask the server to confirm the payment with Stripe directly. This
  // completes the purchase in about a second; the polling below stays
  // as a fallback for returns without a session id.
  useEffect(() => {
    if (fromCheckout && sessionId && !purchased && !verifyFired.current) {
      verifyFired.current = true;
      verifyCheckoutSession(sessionId)
        .unwrap()
        .catch(() => {})
        .finally(() => refetch());
    }
  }, [fromCheckout, sessionId, purchased, verifyCheckoutSession, refetch]);

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
    return <PageLoader contained />;
  }

  if (purchased) return children;

  if (confirming) {
    return (
      <PageLoader
        contained
        message="Confirming your payment…"
        description="Your payment went through — we're just waiting for the confirmation to reach us. This usually takes a few seconds."
      />
    );
  }

  return <Navigate to={`/course-detail/${courseId}`} replace />;
};
export default PurchaseCourseProtectedRoute;
