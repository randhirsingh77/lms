import { EmptyState, PageHeader, PageShell } from "@/components/SiteUI";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetMyTestsQuery } from "@/features/api/testApi";
import { ClipboardList, Clock, ListChecks } from "lucide-react";
import React from "react";
import { Link } from "react-router-dom";

// The student's test list: every published test from their enrolled
// courses, with their own status on each (not started, in progress,
// best score so far).
const Tests = () => {
  const { data, isLoading, isError, refetch } = useGetMyTestsQuery();
  const tests = data?.tests || [];

  return (
    <PageShell className="py-10">
      <div className="space-y-8">
        <PageHeader
          title="Tests"
          description="Timed tests from your courses. Before a test starts you'll see exactly what it records while you take it."
        />

        {isLoading ? (
          <div className="grid gap-5 md:grid-cols-2">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-44 w-full" />
            ))}
          </div>
        ) : isError ? (
          <EmptyState
            icon={ClipboardList}
            title="Could not load your tests"
            description="Something went wrong while loading. Please try again."
            action={
              <Button className="h-10" onClick={() => refetch()}>
                Try again
              </Button>
            }
          />
        ) : tests.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No tests yet"
            description="When an instructor publishes a test for one of your courses, it will appear here."
          />
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {tests.map((test) => {
              const status = test.myStatus;
              const inProgress = !!status?.inProgressAttemptId;
              const lastFinished =
                status?.lastAttempt && status.lastAttempt.status !== "in_progress"
                  ? status.lastAttempt
                  : null;
              return (
                <Card key={test._id} className="flex flex-col shadow-sm">
                  <CardHeader className="space-y-1.5">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {test.courseTitle}
                    </p>
                    <CardTitle className="text-xl">{test.title}</CardTitle>
                    {test.description ? (
                      <p className="text-sm text-muted-foreground">{test.description}</p>
                    ) : null}
                  </CardHeader>
                  <CardContent className="mt-auto space-y-4">
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4" /> {test.durationMin} minutes
                      </span>
                      <span className="flex items-center gap-1.5">
                        <ListChecks className="h-4 w-4" /> {test.questionCount} questions
                      </span>
                      <span>Pass mark: {test.passPct}%</span>
                    </div>

                    {inProgress ? (
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <Badge variant="secondary">In progress</Badge>
                        <Button asChild className="h-11">
                          <Link to={`/test/${test._id}`}>Continue test</Link>
                        </Button>
                      </div>
                    ) : lastFinished ? (
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <span className="flex items-center gap-2 text-sm">
                          Best score: <strong>{status.bestScorePct}%</strong>
                          {status.passed ? (
                            <Badge className="bg-primary text-primary-foreground hover:bg-primary">
                              Passed
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Not passed yet</Badge>
                          )}
                        </span>
                        <span className="flex gap-2">
                          <Button asChild variant="outline" className="h-11">
                            <Link to={`/test-attempt/${lastFinished._id}`}>
                              View result
                            </Link>
                          </Button>
                          <Button asChild className="h-11">
                            <Link to={`/test/${test._id}`}>Retake</Link>
                          </Button>
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-3">
                        <Badge variant="secondary">Not started</Badge>
                        <Button asChild className="h-11">
                          <Link to={`/test/${test._id}`}>Start test</Link>
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </PageShell>
  );
};

export default Tests;
