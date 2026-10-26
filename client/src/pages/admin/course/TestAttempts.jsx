import { EmptyState, PageHeader } from "@/components/SiteUI";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useGetTestAttemptsQuery,
  useReviewTestAttemptMutation,
} from "@/features/api/testApi";
import { eventLabel, formatClock, formatEventDetail } from "@/lib/testEvents";
import { ClipboardList } from "lucide-react";
import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";

// Instructor review for one test: every attempt, its score, and the
// flagged event timeline — labelled "Flagged events — review
// recommended" because that is exactly what they are. The system
// records and flags; the instructor records the decision.
const decisionBadge = (decision) => {
  if (decision === "cleared") {
    return (
      <Badge className="bg-primary text-primary-foreground hover:bg-primary">
        Cleared
      </Badge>
    );
  }
  if (decision === "upheld") {
    return <Badge variant="destructive">Flag upheld</Badge>;
  }
  return <Badge variant="secondary">Review pending</Badge>;
};

const TestAttempts = () => {
  const { testId } = useParams();
  const { data, isLoading, isError, refetch } = useGetTestAttemptsQuery(testId);
  const [reviewAttempt, { isLoading: isReviewing }] = useReviewTestAttemptMutation();
  const [expandedId, setExpandedId] = useState(null);

  const attempts = data?.attempts || [];
  const test = data?.test;

  const review = async (attemptId, decision) => {
    try {
      await reviewAttempt({ attemptId, decision }).unwrap();
      toast.success(
        decision === "cleared"
          ? "Attempt cleared."
          : "Flag upheld for this attempt."
      );
    } catch (err) {
      toast.error(err?.data?.message || "Could not record the decision.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={test ? `Attempts — ${test.title}` : "Attempts"}
        description="Scores with the events recorded during each attempt. Flagged events are listed for your review — you decide what they mean."
      />

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          icon={ClipboardList}
          title="Could not load attempts"
          description="Something went wrong while loading attempts for this test."
          action={
            <Button className="h-10" onClick={() => refetch()}>
              Try again
            </Button>
          }
        />
      ) : attempts.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No attempts yet"
          description="When students take this test, their attempts and the events recorded during them appear here."
        />
      ) : (
        <div className="space-y-4">
          {attempts.map((attempt) => {
            const flagged = attempt.events.filter((e) => e.counted);
            const expanded = expandedId === attempt._id;
            const finished = attempt.status !== "in_progress";
            return (
              <Card key={attempt._id} className="shadow-sm">
                <CardContent className="space-y-4 pt-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <p className="font-semibold">
                        {attempt.student?.name || "Unknown student"}
                        <span className="ml-2 text-sm font-normal text-muted-foreground">
                          {attempt.student?.email || ""}
                        </span>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Started {formatClock(attempt.startedAt)}
                        {attempt.submittedAt
                          ? ` · Submitted ${formatClock(attempt.submittedAt)}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {attempt.status === "in_progress" ? (
                        <Badge variant="secondary">In progress</Badge>
                      ) : (
                        <>
                          <Badge variant="outline" className="tabular-nums">
                            Score {attempt.scorePct}%
                          </Badge>
                          {attempt.passed ? (
                            <Badge className="bg-primary text-primary-foreground hover:bg-primary">
                              Passed
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Not passed</Badge>
                          )}
                          {attempt.status === "auto_submitted" ? (
                            <Badge variant="outline">Auto-submitted</Badge>
                          ) : null}
                        </>
                      )}
                      {finished ? decisionBadge(attempt.reviewDecision) : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-muted-foreground">
                      Warnings: {attempt.warningsUsed} · Flagged events:{" "}
                      {flagged.length} · Total recorded events:{" "}
                      {attempt.events.length}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        className="h-10"
                        onClick={() => setExpandedId(expanded ? null : attempt._id)}
                        aria-expanded={expanded}
                      >
                        {expanded ? "Hide timeline" : "Flagged events — review recommended"}
                      </Button>
                      {finished ? (
                        <>
                          <Button
                            className="h-10"
                            disabled={isReviewing || attempt.reviewDecision === "cleared"}
                            onClick={() => review(attempt._id, "cleared")}
                          >
                            Clear flag
                          </Button>
                          <Button
                            variant="destructive"
                            className="h-10"
                            disabled={isReviewing || attempt.reviewDecision === "upheld"}
                            onClick={() => review(attempt._id, "upheld")}
                          >
                            Uphold flag
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </div>

                  {expanded ? (
                    <div className="rounded-xl border">
                      {attempt.events.length === 0 ? (
                        <p className="px-4 py-3 text-sm text-muted-foreground">
                          No events were recorded during this attempt.
                        </p>
                      ) : (
                        <ul className="divide-y">
                          {attempt.events.map((event, i) => (
                            <li
                              key={i}
                              className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-2.5 text-sm"
                            >
                              <span className="flex items-center gap-2">
                                <span className="font-medium">
                                  {eventLabel(event.type)}
                                </span>
                                {event.counted ? (
                                  <Badge variant="destructive" className="text-xs">
                                    Warning
                                  </Badge>
                                ) : null}
                              </span>
                              <span className="text-muted-foreground">
                                {formatEventDetail(event)}
                                {formatEventDetail(event) ? " · " : ""}
                                {formatClock(event.at)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TestAttempts;
