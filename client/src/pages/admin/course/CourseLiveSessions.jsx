import { EmptyState, PageHeader } from "@/components/SiteUI";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCreateLiveSessionMutation,
  useDeleteLiveSessionMutation,
  useGetCourseLiveSessionsQuery,
  useSetLiveSessionStatusMutation,
} from "@/features/api/liveSessionApi";
import { CalendarClock, Loader2, Plus, Trash2, Video } from "lucide-react";
import React, { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";

// Live-session scheduling for one course. Sessions run on Jitsi Meet,
// embedded in the app — there is nothing to install and no meeting
// link to paste. Students see the schedule; the actual room name is
// only released to enrolled students once joining opens.

const formatWhen = (value) =>
  new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

// datetime-local needs a local "YYYY-MM-DDTHH:mm" string; default the
// form to tomorrow at this time so scheduling is one edit, not five.
const defaultStart = () => {
  const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
  d.setSeconds(0, 0);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const statusBadge = (session) => {
  if (session.status === "live") {
    return <Badge className="bg-primary text-primary-foreground hover:bg-primary">Live now</Badge>;
  }
  if (session.status === "ended") {
    return <Badge variant="secondary">Ended</Badge>;
  }
  return <Badge variant="outline">Scheduled</Badge>;
};

const CourseLiveSessions = () => {
  const { courseId } = useParams();
  const { data, isLoading, isError, refetch } = useGetCourseLiveSessionsQuery(courseId);
  const [createSession, { isLoading: isCreating }] = useCreateLiveSessionMutation();
  const [setStatus] = useSetLiveSessionStatusMutation();
  const [deleteSession] = useDeleteLiveSessionMutation();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", startsAt: defaultStart(), durationMin: 60 });
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const sessions = data?.sessions || [];
  const upcoming = sessions.filter((s) => s.status !== "ended");
  const past = sessions.filter((s) => s.status === "ended");

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await createSession({
        courseId,
        title: form.title,
        startsAt: new Date(form.startsAt).toISOString(),
        durationMin: Number(form.durationMin),
      }).unwrap();
      toast.success("Live session scheduled.");
      setForm({ title: "", startsAt: defaultStart(), durationMin: 60 });
      setShowForm(false);
    } catch (err) {
      toast.error(err?.data?.message || "Could not schedule the session.");
    }
  };

  const changeStatus = async (sessionId, status) => {
    try {
      await setStatus({ sessionId, status }).unwrap();
    } catch (err) {
      toast.error(err?.data?.message || "Could not update the session.");
    }
  };

  const handleDelete = async (sessionId) => {
    try {
      await deleteSession(sessionId).unwrap();
      toast.success("Session deleted.");
    } catch (err) {
      toast.error(err?.data?.message || "Could not delete the session.");
    }
    setConfirmDeleteId(null);
  };

  const renderSession = (session) => (
    <Card key={session._id} className="shadow-sm">
      <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
        <div className="min-w-0 space-y-1">
          <p className="flex flex-wrap items-center gap-2 font-semibold">
            {session.title}
            {statusBadge(session)}
          </p>
          <p className="text-sm text-muted-foreground">
            {formatWhen(session.startsAt)} · {session.durationMin} minutes
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {session.status !== "ended" ? (
            <Button asChild className="h-10">
              <Link to={`/live/${session._id}`}>
                <Video className="mr-1.5 h-4 w-4" />
                {session.status === "live" ? "Rejoin" : "Start / join"}
              </Link>
            </Button>
          ) : null}
          {session.status === "scheduled" ? (
            <Button
              variant="outline"
              className="h-10"
              onClick={() => changeStatus(session._id, "live")}
            >
              Mark live
            </Button>
          ) : null}
          {session.status === "live" ? (
            <Button
              variant="outline"
              className="h-10"
              onClick={() => changeStatus(session._id, "ended")}
            >
              End session
            </Button>
          ) : null}
          {confirmDeleteId === session._id ? (
            <>
              <Button
                variant="destructive"
                className="h-10"
                onClick={() => handleDelete(session._id)}
              >
                Confirm delete
              </Button>
              <Button
                variant="ghost"
                className="h-10"
                onClick={() => setConfirmDeleteId(null)}
              >
                Keep it
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              className="h-10 text-destructive hover:text-destructive"
              onClick={() => setConfirmDeleteId(session._id)}
            >
              <Trash2 className="mr-1.5 h-4 w-4" /> Delete
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Live sessions"
        description="Video classes for this course, embedded in the app with Jitsi Meet."
        action={
          !showForm ? (
            <Button className="h-11" onClick={() => setShowForm(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> Schedule session
            </Button>
          ) : null
        }
      />

      <div className="rounded-xl border bg-accent/50 px-4 py-3 text-sm leading-relaxed text-accent-foreground">
        <strong>Join first.</strong> Jitsi may ask whoever starts a room to
        sign in with a Google, GitHub or Facebook account — that is
        Jitsi&apos;s own rule for hosting, not an account on this site.
        Join a few minutes before your students; they join from their Live
        page without signing in anywhere. Joining opens for students 15
        minutes before the start time (or as soon as you mark the session
        live).
      </div>

      {showForm ? (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">New live session</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="session-title">Title</Label>
                <Input
                  id="session-title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Doubt-clearing — Chapter 4"
                  required
                  className="h-11"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="session-start">Starts at</Label>
                  <Input
                    id="session-start"
                    type="datetime-local"
                    value={form.startsAt}
                    onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                    required
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="session-duration">Duration (minutes)</Label>
                  <Input
                    id="session-duration"
                    type="number"
                    min={5}
                    max={600}
                    value={form.durationMin}
                    onChange={(e) =>
                      setForm({ ...form, durationMin: Number(e.target.value) })
                    }
                    className="h-11"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" className="h-11" disabled={isCreating}>
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Scheduling…
                    </>
                  ) : (
                    "Schedule session"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-11"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          icon={CalendarClock}
          title="Could not load live sessions"
          description="Something went wrong while loading this course's sessions."
          action={
            <Button className="h-10" onClick={() => refetch()}>
              Try again
            </Button>
          }
        />
      ) : sessions.length === 0 && !showForm ? (
        <EmptyState
          icon={Video}
          title="No live sessions yet"
          description="Schedule a video class for this course — enrolled students will see it on their Live page and join from inside the app."
          action={
            <Button className="h-11" onClick={() => setShowForm(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> Schedule the first session
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          {upcoming.length ? (
            <div className="space-y-4">{upcoming.map(renderSession)}</div>
          ) : null}
          {past.length ? (
            <div className="space-y-4">
              <h2 className="text-lg font-bold tracking-tight">Past sessions</h2>
              {past.map(renderSession)}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default CourseLiveSessions;
