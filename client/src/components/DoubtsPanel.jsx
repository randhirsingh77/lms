import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  useCreateDoubtMutation,
  useDeleteDoubtMutation,
  useGetDoubtsForLectureQuery,
  useReplyToDoubtMutation,
  useUpvoteDoubtMutation,
} from "@/features/api/doubtsApi";
import { cn } from "@/lib/utils";
import { MessageCircleQuestion, Pin, Send, ThumbsUp, Trash2 } from "lucide-react";
import React, { useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "sonner";

export const formatTimestamp = (totalSeconds) => {
  const s = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const m = Math.floor(s / 60);
  const rest = s % 60;
  return `${String(m).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
};

const STATUS_STYLES = {
  open: "secondary",
  answered: "default",
  closed: "outline",
};

// Timestamped doubts for the lecture currently in the player. "Ask at
// mm:ss" reads the moment straight from the video element — the
// student never types a timestamp — and clicking a doubt's timestamp
// seeks the player back to that exact second.
const DoubtsPanel = ({ courseId, lectureId, videoRef }) => {
  const { user } = useSelector((store) => store.auth);
  const { data, isLoading } = useGetDoubtsForLectureQuery(
    { courseId, lectureId },
    { skip: !courseId || !lectureId }
  );
  const [createDoubt, { isLoading: isPosting }] = useCreateDoubtMutation();
  const [replyToDoubt, { isLoading: isReplying }] = useReplyToDoubtMutation();
  const [upvoteDoubt] = useUpvoteDoubtMutation();
  const [deleteDoubt] = useDeleteDoubtMutation();

  const [draft, setDraft] = useState("");
  const [pinnedTime, setPinnedTime] = useState(null);
  const [openReplyId, setOpenReplyId] = useState(null);
  const [replyDraft, setReplyDraft] = useState("");

  const doubts = data?.doubts || [];

  const currentVideoTime = () => {
    const t = videoRef?.current?.currentTime;
    return Number.isFinite(t) ? Math.floor(t) : 0;
  };
  const currentVideoDuration = () => {
    const d = videoRef?.current?.duration;
    return Number.isFinite(d) ? Math.floor(d) : undefined;
  };

  const seekTo = (seconds) => {
    const video = videoRef?.current;
    if (!video) return;
    video.currentTime = seconds;
    video.play().catch(() => {});
  };

  const handleAsk = async () => {
    if (!draft.trim()) return;
    try {
      await createDoubt({
        courseId,
        lectureId,
        body: draft.trim(),
        timestampSec: pinnedTime ?? currentVideoTime(),
        videoDurationSec: currentVideoDuration(),
      }).unwrap();
      setDraft("");
      setPinnedTime(null);
      toast.success("Doubt posted.");
    } catch (err) {
      toast.error(err?.data?.message || "Failed to post doubt");
    }
  };

  const handleReply = async (doubtId) => {
    if (!replyDraft.trim()) return;
    try {
      await replyToDoubt({ doubtId, body: replyDraft.trim() }).unwrap();
      setReplyDraft("");
      setOpenReplyId(null);
      toast.success("Reply posted.");
    } catch (err) {
      toast.error(err?.data?.message || "Failed to post reply");
    }
  };

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="border-b px-5 py-4">
        <h2 className="flex items-center gap-2 font-semibold">
          <MessageCircleQuestion className="h-5 w-5 text-primary" />
          Doubts at a moment
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Ask about the exact second you're stuck on — click any timestamp
          to jump the video back to it.
        </p>
      </div>

      <div className="space-y-3 px-5 py-4">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={2}
          maxLength={2000}
          placeholder="What didn't make sense at this moment?"
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9"
            onClick={() => setPinnedTime(currentVideoTime())}
          >
            <Pin className="mr-1.5 h-3.5 w-3.5" />
            {pinnedTime === null
              ? "Pin current moment"
              : `Pinned at ${formatTimestamp(pinnedTime)} — tap to re-pin`}
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-9"
            disabled={isPosting || !draft.trim()}
            onClick={handleAsk}
          >
            <Send className="mr-1.5 h-3.5 w-3.5" />
            Ask at {formatTimestamp(pinnedTime ?? currentVideoTime())}
          </Button>
        </div>
      </div>

      <div className="divide-y border-t">
        {isLoading ? (
          <p className="px-5 py-4 text-sm text-muted-foreground">Loading doubts…</p>
        ) : doubts.length === 0 ? (
          <p className="px-5 py-4 text-sm text-muted-foreground">
            No doubts on this lecture yet. Be the first to ask.
          </p>
        ) : (
          doubts.map((doubt) => {
            const authorId = doubt.userId?._id || doubt.userId;
            const isMine = user && String(authorId) === String(user._id);
            const upvoted =
              user &&
              (doubt.upvotedBy || []).some((id) => String(id) === String(user._id));
            // The video was replaced with a different-length cut after
            // this doubt was asked — its timestamp may no longer point
            // at the moment the student meant.
            const possiblyStale =
              doubt.videoDurationSec &&
              currentVideoDuration() &&
              Math.abs(currentVideoDuration() - doubt.videoDurationSec) > 5;
            return (
              <div key={doubt._id} className="space-y-2 px-5 py-4">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => seekTo(doubt.timestampSec)}
                    className="shrink-0 rounded-md bg-primary/10 px-2 py-1 font-mono text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
                    title="Jump the video to this moment"
                  >
                    {formatTimestamp(doubt.timestampSec)}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="whitespace-pre-line text-sm leading-relaxed">
                      {doubt.body}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {doubt.userId?.name || "Student"}
                      {isMine ? " (you)" : ""} ·{" "}
                      {new Date(doubt.createdAt).toLocaleDateString(undefined, {
                        day: "numeric",
                        month: "short",
                      })}
                      {possiblyStale ? " · video changed since this was asked" : ""}
                    </p>
                  </div>
                  <Badge variant={STATUS_STYLES[doubt.status] || "secondary"} className="shrink-0 capitalize">
                    {doubt.status}
                  </Badge>
                </div>

                {(doubt.replies || []).map((reply) => (
                  <div key={reply._id} className="ml-12 rounded-lg bg-accent/60 px-3 py-2">
                    <p className="whitespace-pre-line text-sm leading-relaxed">{reply.body}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {reply.by?.name || "User"}
                      {reply.role === "instructor" ? " · Instructor" : ""}
                    </p>
                  </div>
                ))}

                <div className="ml-12 flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant={upvoted ? "secondary" : "ghost"}
                    size="sm"
                    className={cn("h-8", upvoted && "text-primary")}
                    onClick={() => upvoteDoubt(doubt._id)}
                  >
                    <ThumbsUp className="mr-1.5 h-3.5 w-3.5" />
                    {(doubt.upvotedBy || []).length || ""} Me too
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8"
                    onClick={() => {
                      setOpenReplyId(openReplyId === doubt._id ? null : doubt._id);
                      setReplyDraft("");
                    }}
                  >
                    Reply
                  </Button>
                  {isMine ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 text-destructive hover:text-destructive"
                      onClick={() => deleteDoubt(doubt._id)}
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
                    </Button>
                  ) : null}
                </div>

                {openReplyId === doubt._id ? (
                  <div className="ml-12 space-y-2">
                    <textarea
                      value={replyDraft}
                      onChange={(e) => setReplyDraft(e.target.value)}
                      rows={2}
                      maxLength={2000}
                      placeholder="Write a reply…"
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                    <Button
                      type="button"
                      size="sm"
                      className="h-9"
                      disabled={isReplying || !replyDraft.trim()}
                      onClick={() => handleReply(doubt._id)}
                    >
                      Post reply
                    </Button>
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
};

export default DoubtsPanel;
