import { EmptyState, PageHeader } from "@/components/SiteUI";
import { formatTimestamp } from "@/components/DoubtsPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useGetDoubtInboxQuery,
  useReplyToDoubtMutation,
  useSetDoubtStatusMutation,
} from "@/features/api/doubtsApi";
import { MessageCircleQuestion, Send } from "lucide-react";
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

// Instructor doubt inbox: every doubt across the instructor's courses,
// open ones first. Answering from here marks the doubt answered
// automatically (the server treats a creator reply as the answer).
const DoubtsInbox = () => {
  const { data, isLoading } = useGetDoubtInboxQuery();
  const [replyToDoubt, { isLoading: isReplying }] = useReplyToDoubtMutation();
  const [setDoubtStatus] = useSetDoubtStatusMutation();
  const [openReplyId, setOpenReplyId] = useState(null);
  const [replyDraft, setReplyDraft] = useState("");

  const doubts = data?.doubts || [];
  const openCount = doubts.filter((d) => d.status === "open").length;

  const handleReply = async (doubtId) => {
    if (!replyDraft.trim()) return;
    try {
      await replyToDoubt({ doubtId, body: replyDraft.trim() }).unwrap();
      setReplyDraft("");
      setOpenReplyId(null);
      toast.success("Answer posted.");
    } catch (err) {
      toast.error(err?.data?.message || "Failed to post answer");
    }
  };

  const handleStatus = async (doubtId, status) => {
    try {
      await setDoubtStatus({ doubtId, status }).unwrap();
      toast.success("Doubt updated.");
    } catch (err) {
      toast.error(err?.data?.message || "Failed to update doubt");
    }
  };

  return (
    <div>
      <PageHeader
        title="Doubts inbox"
        description={
          openCount > 0
            ? `${openCount} open doubt${openCount === 1 ? "" : "s"} waiting for an answer.`
            : "Student questions pinned to moments in your lectures."
        }
        className="mb-8"
      />

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : doubts.length === 0 ? (
        <EmptyState
          icon={MessageCircleQuestion}
          title="No doubts yet"
          description="When students ask a question at a moment in one of your lectures, it will appear here."
        />
      ) : (
        <div className="space-y-4">
          {doubts.map((doubt) => (
            <Card key={doubt._id}>
              <CardContent className="space-y-3 p-5">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="secondary" className="font-mono">
                    {formatTimestamp(doubt.timestampSec)}
                  </Badge>
                  <span className="font-medium text-foreground">
                    {doubt.courseId?.courseTitle || "Course"}
                  </span>
                  <span>· {doubt.lectureId?.lectureTitle || "Lecture"}</span>
                  <Badge
                    variant={
                      doubt.status === "open"
                        ? "destructive"
                        : doubt.status === "answered"
                          ? "default"
                          : "outline"
                    }
                    className="capitalize"
                  >
                    {doubt.status}
                  </Badge>
                  {(doubt.upvotedBy || []).length > 0 ? (
                    <span>{doubt.upvotedBy.length} student(s) asked this too</span>
                  ) : null}
                </div>

                <p className="whitespace-pre-line text-sm leading-relaxed">{doubt.body}</p>
                <p className="text-xs text-muted-foreground">
                  Asked by {doubt.userId?.name || "Student"} ·{" "}
                  {new Date(doubt.createdAt).toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>

                {(doubt.replies || []).map((reply) => (
                  <div key={reply._id} className="rounded-lg bg-accent/60 px-3 py-2">
                    <p className="whitespace-pre-line text-sm leading-relaxed">{reply.body}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {reply.by?.name || "User"}
                      {reply.role === "instructor" ? " · Instructor" : ""}
                    </p>
                  </div>
                ))}

                <div className="flex flex-wrap gap-2 pt-1">
                  {doubt.status !== "closed" ? (
                    <Button
                      size="sm"
                      className="h-9"
                      onClick={() => {
                        setOpenReplyId(openReplyId === doubt._id ? null : doubt._id);
                        setReplyDraft("");
                      }}
                    >
                      <Send className="mr-1.5 h-3.5 w-3.5" />
                      {doubt.status === "answered" ? "Reply again" : "Answer"}
                    </Button>
                  ) : null}
                  {doubt.courseId?._id ? (
                    <Button asChild size="sm" variant="outline" className="h-9">
                      <Link to={`/course-progress/${doubt.courseId._id}`}>
                        Open course
                      </Link>
                    </Button>
                  ) : null}
                  {doubt.status !== "closed" ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-9"
                      onClick={() => handleStatus(doubt._id, "closed")}
                    >
                      Close
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-9"
                      onClick={() => handleStatus(doubt._id, "open")}
                    >
                      Reopen
                    </Button>
                  )}
                </div>

                {openReplyId === doubt._id ? (
                  <div className="space-y-2">
                    <textarea
                      value={replyDraft}
                      onChange={(e) => setReplyDraft(e.target.value)}
                      rows={3}
                      maxLength={2000}
                      placeholder="Explain the moment they're stuck on…"
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                    <Button
                      size="sm"
                      className="h-9"
                      disabled={isReplying || !replyDraft.trim()}
                      onClick={() => handleReply(doubt._id)}
                    >
                      Post answer
                    </Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default DoubtsInbox;
