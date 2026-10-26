import { EmptyState, PageShell } from "@/components/SiteUI";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetLiveSessionJoinInfoQuery } from "@/features/api/liveSessionApi";
import { AlertTriangle, Video } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";

// The embedded class itself. The server's join endpoint is the gate —
// it answers with the room name only for enrolled students (or the
// course owner) inside the join window — and this page then hands the
// room to Jitsi Meet's IFrame API, loaded from meet.jit.si. No Jitsi
// account or key is involved on our side.
const JITSI_DOMAIN = "meet.jit.si";

const loadJitsiApi = () =>
  new Promise((resolve, reject) => {
    if (window.JitsiMeetExternalAPI) {
      resolve(window.JitsiMeetExternalAPI);
      return;
    }
    const script = document.createElement("script");
    script.src = `https://${JITSI_DOMAIN}/external_api.js`;
    script.async = true;
    script.onload = () => resolve(window.JitsiMeetExternalAPI);
    script.onerror = () => reject(new Error("Could not load the video service."));
    document.body.appendChild(script);
  });

const LiveJoin = () => {
  const { sessionId } = useParams();
  const { data, isLoading, isError, error } = useGetLiveSessionJoinInfoQuery(sessionId);
  const containerRef = useRef(null);
  const apiRef = useRef(null);
  const [embedError, setEmbedError] = useState("");

  const roomSlug = data?.session?.roomSlug;
  const displayName = data?.me?.name;

  useEffect(() => {
    if (!roomSlug || !containerRef.current) return;
    let disposed = false;
    loadJitsiApi()
      .then((JitsiMeetExternalAPI) => {
        if (disposed || !containerRef.current) return;
        const api = new JitsiMeetExternalAPI(JITSI_DOMAIN, {
          roomName: roomSlug,
          parentNode: containerRef.current,
          userInfo: { displayName: displayName || "Guest" },
          configOverwrite: {
            startWithAudioMuted: true,
            startWithVideoMuted: false,
          },
        });
        apiRef.current = api;
      })
      .catch(() => {
        if (!disposed) {
          setEmbedError(
            "The video service could not be loaded. Check your connection and try again."
          );
        }
      });
    return () => {
      disposed = true;
      if (apiRef.current) {
        try {
          apiRef.current.dispose();
        } catch {
          /* already gone */
        }
        apiRef.current = null;
      }
    };
  }, [roomSlug, displayName]);

  if (isLoading) {
    return (
      <PageShell className="py-10">
        <div className="space-y-4">
          <Skeleton className="h-9 w-1/2" />
          <Skeleton className="aspect-video w-full" />
        </div>
      </PageShell>
    );
  }

  if (isError || !data?.session) {
    return (
      <PageShell className="py-10">
        <EmptyState
          icon={AlertTriangle}
          title="Can't join this session yet"
          description={
            error?.data?.message ||
            "This session could not be opened. It may not have started, may have ended, or you may not be enrolled in its course."
          }
          action={
            <Button asChild className="h-10">
              <Link to="/live-sessions">Back to live classes</Link>
            </Button>
          }
        />
      </PageShell>
    );
  }

  const { session, me } = data;

  return (
    <PageShell className="py-10">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold tracking-tight">
              {session.title}
            </h1>
            <p className="text-sm text-muted-foreground">
              Joining as {me.name} · the call runs on Jitsi Meet, embedded here
            </p>
          </div>
          <Button asChild variant="outline" className="h-11">
            <Link to="/live-sessions">Leave page</Link>
          </Button>
        </div>

        {me.role === "instructor" ? (
          <p className="rounded-xl border bg-accent/50 px-4 py-3 text-sm leading-relaxed text-accent-foreground">
            If Jitsi asks you to sign in before the room opens, that is
            Jitsi&apos;s own rule for whoever hosts a room — sign in with a
            Google, GitHub or Facebook account and your students can join.
            Students are never asked to sign in.
          </p>
        ) : (
          <p className="rounded-xl border px-4 py-3 text-sm leading-relaxed text-muted-foreground">
            If the room says it is waiting for a host, your teacher has not
            opened it yet — stay on this page and it will start when they
            join.
          </p>
        )}

        {embedError ? (
          <EmptyState icon={Video} title="Video unavailable" description={embedError} />
        ) : (
          <div
            ref={containerRef}
            className="aspect-video w-full overflow-hidden rounded-xl border bg-black [&>iframe]:h-full [&>iframe]:w-full"
            aria-label={`Live video session: ${session.title}`}
          />
        )}
      </div>
    </PageShell>
  );
};

export default LiveJoin;
