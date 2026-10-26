import { EmptyState, PageHeader, PageShell } from "@/components/SiteUI";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetMyLiveSessionsQuery } from "@/features/api/liveSessionApi";
import { CalendarClock, Video } from "lucide-react";
import React from "react";
import { Link } from "react-router-dom";

// The student's live-class list: sessions scheduled for their enrolled
// courses. The Join button activates inside the join window (15
// minutes before the start, or when the teacher marks the session
// live) — before that the schedule is visible but the room stays shut.
const formatWhen = (value) =>
  new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

const LiveSessions = () => {
  const { data, isLoading, isError, refetch } = useGetMyLiveSessionsQuery();
  const sessions = data?.sessions || [];
  const upcoming = sessions.filter((s) => s.status !== "ended");
  const past = sessions.filter((s) => s.status === "ended");

  const renderSession = (session) => (
    <Card key={session._id} className="flex flex-col shadow-sm">
      <CardHeader className="space-y-1.5">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {session.courseTitle}
        </p>
        <CardTitle className="text-xl">{session.title}</CardTitle>
      </CardHeader>
      <CardContent className="mt-auto space-y-4">
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <CalendarClock className="h-4 w-4" />
          {formatWhen(session.startsAt)} · {session.durationMin} minutes
        </p>
        {session.status === "ended" ? (
          <Badge variant="secondary">Ended</Badge>
        ) : session.status === "live" ? (
          <div className="flex items-center justify-between gap-3">
            <Badge className="bg-primary text-primary-foreground hover:bg-primary">
              Live now
            </Badge>
            <Button asChild className="h-11">
              <Link to={`/live/${session._id}`}>
                <Video className="mr-1.5 h-4 w-4" /> Join class
              </Link>
            </Button>
          </div>
        ) : session.joinable ? (
          <div className="flex items-center justify-between gap-3">
            <Badge variant="outline">Joining open</Badge>
            <Button asChild className="h-11">
              <Link to={`/live/${session._id}`}>
                <Video className="mr-1.5 h-4 w-4" /> Join class
              </Link>
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <Badge variant="secondary">Scheduled</Badge>
            <span className="text-sm text-muted-foreground">
              Joining opens 15 min before
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <PageShell className="py-10">
      <div className="space-y-8">
        <PageHeader
          title="Live classes"
          description="Video sessions scheduled for your courses. Joining opens 15 minutes before the start time — your teacher joins first."
        />

        {isLoading ? (
          <div className="grid gap-5 md:grid-cols-2">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-44 w-full" />
            ))}
          </div>
        ) : isError ? (
          <EmptyState
            icon={Video}
            title="Could not load live classes"
            description="Something went wrong while loading. Please try again."
            action={
              <Button className="h-10" onClick={() => refetch()}>
                Try again
              </Button>
            }
          />
        ) : sessions.length === 0 ? (
          <EmptyState
            icon={Video}
            title="No live classes scheduled"
            description="When an instructor schedules a video class for one of your courses, it will appear here."
          />
        ) : (
          <div className="space-y-8">
            {upcoming.length ? (
              <div className="grid gap-5 md:grid-cols-2">
                {upcoming.map(renderSession)}
              </div>
            ) : null}
            {past.length ? (
              <div className="space-y-4">
                <h2 className="text-xl font-bold tracking-tight">Past sessions</h2>
                <div className="grid gap-5 md:grid-cols-2">
                  {past.map(renderSession)}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </PageShell>
  );
};

export default LiveSessions;
