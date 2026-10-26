import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useDeleteAuthoringQuizMutation,
  useGetAuthoringQuizQuery,
  useSaveAuthoringQuizMutation,
} from "@/features/api/quizApi";
import { Loader2, Plus, Trash2 } from "lucide-react";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";

// Quiz authoring for one lecture. A lecture does not need a quiz —
// lectures without one never block students — but where a quiz exists,
// passing it is required before a certificate can be issued for the
// course. Correct answers live only on the server; students never
// receive them before submitting.
const emptyQuestion = () => ({
  prompt: "",
  options: ["", ""],
  correctIndex: 0,
  explanation: "",
});

const QuizEditor = ({ courseId, lectureId }) => {
  const { data, isLoading } = useGetAuthoringQuizQuery({ courseId, lectureId });
  const [saveQuiz, { isLoading: isSaving }] = useSaveAuthoringQuizMutation();
  const [deleteQuiz, { isLoading: isDeleting }] = useDeleteAuthoringQuizMutation();

  const [passPct, setPassPct] = useState(70);
  const [questions, setQuestions] = useState([]);

  useEffect(() => {
    if (data?.quiz) {
      setPassPct(data.quiz.passPct ?? 70);
      setQuestions(
        (data.quiz.questions || []).map((q) => ({
          prompt: q.prompt || "",
          options: [...(q.options || ["", ""])],
          correctIndex: q.correctIndex ?? 0,
          explanation: q.explanation || "",
        }))
      );
    }
  }, [data?.quiz]);

  const updateQuestion = (qi, patch) =>
    setQuestions((prev) => prev.map((q, i) => (i === qi ? { ...q, ...patch } : q)));
  const updateOption = (qi, oi, value) =>
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qi
          ? { ...q, options: q.options.map((o, j) => (j === oi ? value : o)) }
          : q
      )
    );

  const handleSave = async () => {
    try {
      await saveQuiz({ courseId, lectureId, passPct: Number(passPct), questions }).unwrap();
      toast.success("Quiz saved.");
    } catch (err) {
      toast.error(err?.data?.message || "Failed to save quiz");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteQuiz({ courseId, lectureId }).unwrap();
      setQuestions([]);
      setPassPct(70);
      toast.success("Quiz removed.");
    } catch (err) {
      toast.error(err?.data?.message || "Failed to remove quiz");
    }
  };

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading quiz…</p>;
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <p className="text-sm font-semibold">Lecture quiz</p>
        <p className="text-xs text-muted-foreground">
          Optional — but if this lecture has a quiz, students must pass it
          before they can earn the course certificate. 3–5 short questions
          work best; retakes are unlimited.
        </p>
      </div>

      <div className="grid max-w-xs grid-cols-[1fr_auto] items-center gap-3">
        <Label htmlFor="quiz-pass">Pass mark (%)</Label>
        <Input
          id="quiz-pass"
          type="number"
          min={1}
          max={100}
          value={passPct}
          onChange={(e) => setPassPct(e.target.value)}
          className="h-11 w-24"
        />
      </div>

      {questions.map((question, qi) => (
        <div key={qi} className="space-y-3 rounded-lg border p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">Question {qi + 1}</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-destructive hover:text-destructive"
              onClick={() => setQuestions((prev) => prev.filter((_, i) => i !== qi))}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Remove
            </Button>
          </div>
          <Input
            value={question.prompt}
            onChange={(e) => updateQuestion(qi, { prompt: e.target.value })}
            placeholder="Type the question"
            maxLength={500}
            className="h-11"
          />
          <div className="space-y-2">
            {question.options.map((option, oi) => (
              <div key={oi} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`correct-${qi}`}
                  aria-label={`Mark option ${oi + 1} as correct`}
                  className="h-4 w-4 shrink-0 accent-primary"
                  checked={question.correctIndex === oi}
                  onChange={() => updateQuestion(qi, { correctIndex: oi })}
                />
                <Input
                  value={option}
                  onChange={(e) => updateOption(qi, oi, e.target.value)}
                  placeholder={`Option ${oi + 1}`}
                  maxLength={300}
                  className="h-10"
                />
                {question.options.length > 2 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    aria-label={`Remove option ${oi + 1}`}
                    onClick={() =>
                      updateQuestion(qi, {
                        options: question.options.filter((_, j) => j !== oi),
                        correctIndex:
                          question.correctIndex >= oi && question.correctIndex > 0
                            ? question.correctIndex - 1
                            : question.correctIndex,
                      })
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            ))}
            {question.options.length < 6 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9"
                onClick={() => updateQuestion(qi, { options: [...question.options, ""] })}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add option
              </Button>
            ) : null}
            <p className="text-xs text-muted-foreground">
              Select the radio button next to the correct option.
            </p>
          </div>
          <Input
            value={question.explanation}
            onChange={(e) => updateQuestion(qi, { explanation: e.target.value })}
            placeholder="Explanation shown after submission (optional)"
            maxLength={1000}
            className="h-10"
          />
        </div>
      ))}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-11"
          disabled={questions.length >= 20}
          onClick={() => setQuestions((prev) => [...prev, emptyQuestion()])}
        >
          <Plus className="mr-2 h-4 w-4" /> Add question
        </Button>
        {questions.length > 0 ? (
          <Button type="button" className="h-11" disabled={isSaving} onClick={handleSave}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving
              </>
            ) : (
              "Save quiz"
            )}
          </Button>
        ) : null}
        {data?.quiz ? (
          <Button
            type="button"
            variant="destructive"
            className="h-11"
            disabled={isDeleting}
            onClick={handleDelete}
          >
            Remove quiz
          </Button>
        ) : null}
      </div>
    </div>
  );
};

export default QuizEditor;
