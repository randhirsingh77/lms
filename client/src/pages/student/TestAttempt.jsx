import { EmptyState, PageHeader, PageShell } from "@/components/SiteUI";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useGetTestBriefQuery,
  usePostAttemptEventMutation,
  useSaveAttemptAnswersMutation,
  useStartTestAttemptMutation,
  useSubmitTestAttemptMutation,
} from "@/features/api/testApi";
import { AlertTriangle, Clock, Maximize } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

// One screen, two phases:
//  1. Consent — the student reads exactly what the test records while
//     it runs and agrees before anything starts. The agreement (and the
//     version of this notice) is stored on the attempt, server-side.
//  2. Attempt — timed, fullscreen. The page reports what happens in the
//     test window (tab hidden, fullscreen exit, window blur, copy /
//     paste / right-click attempts) to the server, which counts
//     warnings and can auto-submit. Nothing is judged on this page; the
//     instructor reviews the recorded timeline afterwards.
const TestAttempt = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const { data: briefData, isLoading, isError, refetch } = useGetTestBriefQuery(testId);
  const [startAttempt, { isLoading: isStarting }] = useStartTestAttemptMutation();
  const [saveAnswers] = useSaveAttemptAnswersMutation();
  const [postEvent] = usePostAttemptEventMutation();
  const [submitAttempt, { isLoading: isSubmitting }] = useSubmitTestAttemptMutation();

  const [agreed, setAgreed] = useState(false);
  const [attempt, setAttempt] = useState(null); // { _id, endsAt, warningsUsed }
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [warningsUsed, setWarningsUsed] = useState(0);
  const [warningLevel, setWarningLevel] = useState("none");
  const [showFinalWarning, setShowFinalWarning] = useState(false);
  const [remainingMs, setRemainingMs] = useState(null);
  const [inFullscreen, setInFullscreen] = useState(false);

  const saveTimer = useRef(null);
  const hiddenSince = useRef(null);
  const blurSince = useRef(null);
  const enteredFullscreen = useRef(false);
  const finished = useRef(false);

  const brief = briefData?.test;
  const maxWarnings = brief?.maxWarnings ?? attempt?.maxWarnings ?? 3;

  const goToResult = useCallback(
    (attemptId) => {
      finished.current = true;
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      navigate(`/test-attempt/${attemptId}`, { replace: true });
    },
    [navigate]
  );

  const handleEventResponse = useCallback(
    (res) => {
      if (!res) return;
      setWarningsUsed(res.warningsUsed ?? 0);
      if (res.warningLevel === "warning" || res.warningLevel === "final") {
        setWarningLevel(res.warningLevel);
        if (res.warningLevel === "final") setShowFinalWarning(true);
      }
      if (res.warningLevel === "auto_submitted" || res.status === "auto_submitted") {
        toast.error(
          "The warning limit was reached, so your test was submitted with the answers saved so far."
        );
        if (attempt) goToResult(attempt._id);
      }
    },
    [attempt, goToResult]
  );

  const reportEvent = useCallback(
    async (event) => {
      if (!attempt || finished.current) return;
      try {
        const res = await postEvent({ attemptId: attempt._id, ...event }).unwrap();
        handleEventResponse(res);
      } catch {
        // A failed event report must never break the test itself.
      }
    },
    [attempt, postEvent, handleEventResponse]
  );

  // --- integrity event listeners (attempt phase only) ---
  useEffect(() => {
    if (!attempt) return;

    const onVisibility = () => {
      if (document.hidden) {
        hiddenSince.current = Date.now();
      } else if (hiddenSince.current) {
        const durationMs = Date.now() - hiddenSince.current;
        hiddenSince.current = null;
        reportEvent({ type: "tab_hidden", durationMs });
      }
    };
    const onBlur = () => {
      blurSince.current = Date.now();
    };
    const onFocus = () => {
      if (blurSince.current) {
        const durationMs = Date.now() - blurSince.current;
        blurSince.current = null;
        // Very short blurs are usually the browser's own UI (a
        // notification, the fullscreen prompt) — the server only
        // counts longer ones, but don't even send the noise.
        if (durationMs >= 1000) {
          reportEvent({ type: "window_blur", durationMs });
        }
      }
    };
    const onFullscreenChange = () => {
      const active = !!document.fullscreenElement;
      setInFullscreen(active);
      if (active) {
        enteredFullscreen.current = true;
      } else if (enteredFullscreen.current && !finished.current) {
        reportEvent({ type: "fullscreen_exited" });
      }
    };
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [attempt, reportEvent]);

  // --- countdown ---
  useEffect(() => {
    if (!attempt) return;
    const tick = () => {
      const left = new Date(attempt.endsAt).getTime() - Date.now();
      setRemainingMs(Math.max(0, left));
      if (left <= 0 && !finished.current) {
        finished.current = true;
        submitAttempt({ attemptId: attempt._id, answers })
          .unwrap()
          .catch(() => {})
          .finally(() => goToResult(attempt._id));
      }
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  const enterFullscreen = () => {
    document.documentElement.requestFullscreen?.().catch(() => {});
  };

  const handleStart = async () => {
    try {
      const res = await startAttempt({
        testId,
        consent: true,
        noticeVersion: briefData.noticeVersion,
      }).unwrap();
      setAttempt(res.attempt);
      setQuestions(res.test.questions);
      setAnswers(res.test.questions.map((_, i) => res.attempt.answers?.[i] ?? -1));
      setWarningsUsed(res.attempt.warningsUsed || 0);
      enterFullscreen();
    } catch (err) {
      toast.error(err?.data?.message || "Could not start the test.");
      refetch();
    }
  };

  const chooseAnswer = (qi, oi) => {
    const next = answers.map((a, i) => (i === qi ? oi : a));
    setAnswers(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveAnswers({ attemptId: attempt._id, answers: next }).catch(() => {});
    }, 800);
  };

  const handleSubmit = async () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    try {
      await submitAttempt({ attemptId: attempt._id, answers }).unwrap();
    } catch (err) {
      // 409 = already auto-submitted by the server; the result page
      // explains either way.
      if (err?.status !== 409) {
        toast.error(err?.data?.message || "Could not submit the test.");
        return;
      }
    }
    goToResult(attempt._id);
  };

  const onCopy = () => reportEvent({ type: "copy_attempt" });
  const onPaste = (e) => {
    let charCount = 0;
    try {
      charCount = (e.clipboardData?.getData("text/plain") || "").length;
    } catch {
      charCount = 0;
    }
    // Only the COUNT is sent — never the pasted text itself.
    reportEvent({ type: "paste_attempt", charCount });
  };
  const onContextMenu = () => reportEvent({ type: "context_menu" });

  if (isLoading) {
    return (
      <PageShell className="py-10">
        <div className="mx-auto max-w-2xl space-y-4">
          <Skeleton className="h-9 w-2/3" />
          <Skeleton className="h-64 w-full" />
        </div>
      </PageShell>
    );
  }

  if (isError || !brief) {
    return (
      <PageShell className="py-10">
        <EmptyState
          icon={AlertTriangle}
          title="Test not available"
          description="This test could not be loaded. It may be unpublished, or you may not be enrolled in its course."
          action={
            <Button className="h-10" onClick={() => navigate("/tests")}>
              Back to tests
            </Button>
          }
        />
      </PageShell>
    );
  }

  // ---------- phase 1: consent ----------
  if (!attempt) {
    const resuming = !!briefData.myStatus?.inProgressAttemptId;
    return (
      <PageShell className="py-10">
        <div className="mx-auto w-full max-w-2xl space-y-6">
          <PageHeader
            title={brief.title}
            description={
              brief.description ||
              `${brief.questionCount} questions · ${brief.durationMin} minutes · pass mark ${brief.passPct}%`
            }
          />
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">
                Before you start — what this test records
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-relaxed">
              {resuming ? (
                <p className="rounded-lg bg-accent px-4 py-3 text-accent-foreground">
                  You already have an attempt in progress — its timer has
                  kept running. Continuing picks up your saved answers.
                </p>
              ) : null}
              <p>
                This is a timed test. It runs in fullscreen and lasts{" "}
                <strong>{brief.durationMin} minutes</strong>. When the time
                runs out, it submits itself with the answers you have saved.
              </p>
              <p>While the test is running, it records:</p>
              <ul className="list-disc space-y-1.5 pl-5">
                <li>when you switch tabs or leave the test window, and for how long;</li>
                <li>when you exit fullscreen;</li>
                <li>
                  copy, paste and right-click attempts inside the test — for a
                  paste, only <em>how many</em> characters were pasted, never
                  the text itself.
                </li>
              </ul>
              <p>
                Leaving the tab for more than a few seconds, exiting
                fullscreen, or switching away from the window counts as a
                warning. At <strong>{brief.maxWarnings} warnings</strong> you
                get a final warning; one more and the test submits itself.
              </p>
              <p>
                Your instructor sees a timeline of these recorded events
                together with your result, and reviews it. The events show
                what happened in the test window — your instructor decides
                what they mean.
              </p>
              <div className="flex items-start gap-3 rounded-lg border p-4">
                <Checkbox
                  id="test-consent"
                  checked={agreed}
                  onCheckedChange={(v) => setAgreed(v === true)}
                  className="mt-0.5 h-5 w-5"
                />
                <Label htmlFor="test-consent" className="text-sm leading-relaxed">
                  I understand what is recorded during this test and I agree
                  to take it under these rules.
                </Label>
              </div>
              <Button
                className="h-11 w-full"
                disabled={!agreed || isStarting}
                onClick={handleStart}
              >
                {isStarting
                  ? "Starting…"
                  : resuming
                    ? "Continue my test"
                    : "I understand — start the test"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </PageShell>
    );
  }

  // ---------- phase 2: attempt ----------
  const mm = remainingMs != null ? Math.floor(remainingMs / 60000) : 0;
  const ss = remainingMs != null ? Math.floor((remainingMs % 60000) / 1000) : 0;
  const answeredCount = answers.filter((a) => a >= 0).length;

  return (
    <PageShell className="py-10">
      <div className="mx-auto w-full max-w-3xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{brief.title}</h1>
          <div className="flex items-center gap-2">
            <Badge
              variant={remainingMs != null && remainingMs < 60000 ? "destructive" : "secondary"}
              className="h-8 gap-1.5 px-3 text-sm tabular-nums"
            >
              <Clock className="h-4 w-4" />
              {String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}
            </Badge>
            <Badge variant="outline" className="h-8 px-3 text-sm">
              Warnings: {warningsUsed} / {maxWarnings}
            </Badge>
          </div>
        </div>

        {warningLevel !== "none" ? (
          <div
            role="alert"
            className={
              warningLevel === "final"
                ? "flex items-start gap-3 rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm"
                : "flex items-start gap-3 rounded-xl border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm"
            }
          >
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <p>
              {warningLevel === "final" ? (
                <>
                  <strong>Final warning.</strong> Another tab switch,
                  fullscreen exit or long switch away from this window will
                  submit your test immediately.
                </>
              ) : (
                <>
                  <strong>Warning {warningsUsed} of {maxWarnings}.</strong>{" "}
                  Leaving the test window is recorded. Stay on this page
                  until you submit.
                </>
              )}
            </p>
          </div>
        ) : null}

        {!inFullscreen ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm">
            <span>This test runs in fullscreen.</span>
            <Button size="sm" className="h-10 gap-2" onClick={enterFullscreen}>
              <Maximize className="h-4 w-4" /> Re-enter fullscreen
            </Button>
          </div>
        ) : null}

        <div
          className="space-y-5"
          onCopy={onCopy}
          onPaste={onPaste}
          onContextMenu={onContextMenu}
        >
          {questions.map((q, qi) => (
            <Card key={qi} className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base leading-relaxed">
                  {qi + 1}. {q.prompt}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {q.options.map((option, oi) => (
                  <label
                    key={oi}
                    className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-4 py-2.5 text-sm transition-colors hover:bg-accent has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                  >
                    <input
                      type="radio"
                      name={`question-${qi}`}
                      className="h-4 w-4 shrink-0 accent-primary"
                      checked={answers[qi] === oi}
                      onChange={() => chooseAnswer(qi, oi)}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
          <p className="text-sm text-muted-foreground">
            {answeredCount} of {questions.length} answered · answers save as
            you go
          </p>
          <Button className="h-11" disabled={isSubmitting} onClick={handleSubmit}>
            {isSubmitting ? "Submitting…" : "Submit test"}
          </Button>
        </div>
      </div>

      {showFinalWarning ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="final-warning-title"
            className="w-full max-w-md rounded-xl border bg-card p-6 shadow-lg"
          >
            <h2 id="final-warning-title" className="text-lg font-semibold">
              Final warning
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              You have used {warningsUsed} of {maxWarnings} warnings. One more
              tab switch, fullscreen exit, or long switch away from this
              window will submit your test immediately, with the answers
              saved so far.
            </p>
            <Button
              className="mt-5 h-11 w-full"
              onClick={() => setShowFinalWarning(false)}
            >
              I understand — continue
            </Button>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
};

export default TestAttempt;
