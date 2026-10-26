import { EmptyState, PageHeader, PageShell } from "@/components/SiteUI";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetAttemptResultQuery } from "@/features/api/testApi";
import { eventLabel, formatClock, formatEventDetail } from "@/lib/testEvents";
import { AlertTriangle, Check, X } from "lucide-react";
import React from "react";
import { Link, useParams } from "react-router-dom";

// A finished attempt: the score, what was recorded during it, and the
// per-question breakdown (correct answers are revealed only here,
// after submission). Flagged events are shown as what they are —
// recorded events the instructor can review.
const TestResult = () => {
  const { attemptId } = useParams();
  const { data, isLoading, isError } = useGetAttemptResultQuery(attemptId);

  if (isLoading) {
    return (
      <PageShell className="py-10">
        <div className="mx-auto max-w-3xl space-y-4">
          <Skeleton className="h-9 w-1/2" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </PageShell>
    );
  }

  if (isError || !data) {
    return (
      <PageShell className="py-10">
        <EmptyState
          icon={AlertTriangle}
          title="Result not available"
          description="This attempt could not be loaded — it may still be in progress, or it belongs to a different account."
          action={
            <Button asChild className="h-10">
              <Link to="/tests">Back to tests</Link>
            </Button>
          }
        />
      </PageShell>
    );
  }

  const { test, attempt, results } = data;

  return (
    <PageShell className="py-10">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <PageHeader
          title={test.title}
          description={
            attempt.status === "auto_submitted"
              ? "This attempt was submitted automatically — the time ran out or the warning limit was reached — with the answers saved at that moment."
              : "Your submitted attempt."
          }
          action={
            <Button asChild variant="outline" className="h-11">
              <Link to="/tests">All tests</Link>
            </Button>
          }
        />

        <Card className="shadow-sm">
          <CardContent className="flex flex-wrap items-center gap-x-10 gap-y-4 pt-6">
            <div>
              <p className="text-4xl font-bold tabular-nums">{attempt.scorePct}%</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Pass mark {test.passPct}%
              </p>
            </div>
            {attempt.passed ? (
              <Badge className="bg-primary text-primary-foreground hover:bg-primary">
                Passed
              </Badge>
            ) : (
              <Badge variant="secondary">Not passed</Badge>
            )}
            <div className="text-sm text-muted-foreground">
              <p>Warnings used: {attempt.warningsUsed} of {test.maxWarnings}</p>
              <p>Submitted: {formatClock(attempt.submittedAt)}</p>
            </div>
          </CardContent>
        </Card>

        {attempt.flaggedEvents?.length ? (
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">
                Recorded during this attempt
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                These events were recorded in the test window and are
                visible to your instructor with this result.
                {attempt.reviewDecision === "cleared"
                  ? " Your instructor has reviewed them and cleared this attempt."
                  : attempt.reviewDecision === "upheld"
                    ? " Your instructor has reviewed them and upheld the flag on this attempt."
                    : " Your instructor can review them and record a decision."}
              </p>
              <ul className="space-y-2">
                {attempt.flaggedEvents.map((event, i) => (
                  <li
                    key={i}
                    className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border px-4 py-2.5"
                  >
                    <span className="font-medium">{eventLabel(event.type)}</span>
                    <span className="text-muted-foreground">
                      {formatEventDetail(event)}
                      {formatEventDetail(event) ? " · " : ""}
                      {formatClock(event.at)}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}

        <div className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight">Question review</h2>
          {results.map((r, i) => (
            <Card key={i} className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-start justify-between gap-3 text-base leading-relaxed">
                  <span>
                    {i + 1}. {r.prompt}
                  </span>
                  {r.correct ? (
                    <Badge className="shrink-0 bg-primary text-primary-foreground hover:bg-primary">
                      <Check className="mr-1 h-3.5 w-3.5" /> Correct
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="shrink-0">
                      <X className="mr-1 h-3.5 w-3.5" />{" "}
                      {r.yourAnswer >= 0 ? "Incorrect" : "Not answered"}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {r.options.map((option, oi) => (
                  <p
                    key={oi}
                    className={
                      oi === r.correctIndex
                        ? "rounded-lg bg-primary/10 px-3 py-2 font-medium"
                        : oi === r.yourAnswer
                          ? "rounded-lg bg-destructive/10 px-3 py-2"
                          : "rounded-lg px-3 py-2 text-muted-foreground"
                    }
                  >
                    {option}
                    {oi === r.correctIndex ? " — correct answer" : ""}
                    {oi === r.yourAnswer && oi !== r.correctIndex
                      ? " — your answer"
                      : ""}
                  </p>
                ))}
                {r.explanation ? (
                  <p className="pt-1 text-muted-foreground">{r.explanation}</p>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </PageShell>
  );
};

export default TestResult;
