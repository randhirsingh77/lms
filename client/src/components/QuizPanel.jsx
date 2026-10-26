import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  useGetLectureQuizQuery,
  useSubmitQuizMutation,
} from "@/features/api/quizApi";
import { cn } from "@/lib/utils";
import { CheckCircle2, ClipboardList, RotateCcw, XCircle } from "lucide-react";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";

// Per-lecture quiz, shown under the player. If the lecture has no quiz
// this renders nothing — lectures without a quiz never block anything.
// Answers are scored on the server; correct answers and explanations
// only come back inside a submission's result.
const QuizPanel = ({ lectureId }) => {
  const { data, isLoading } = useGetLectureQuizQuery(lectureId, {
    skip: !lectureId,
  });
  const [submitQuiz, { isLoading: isSubmitting }] = useSubmitQuizMutation();
  const [answers, setAnswers] = useState([]);
  const [result, setResult] = useState(null);

  const quiz = data?.quiz;
  const myStatus = data?.myStatus;

  // Fresh lecture → fresh attempt state.
  useEffect(() => {
    setAnswers([]);
    setResult(null);
  }, [lectureId]);

  if (isLoading || !quiz) return null;

  const allAnswered =
    answers.length === quiz.questions.length &&
    answers.every((a) => Number.isInteger(a));

  const handleSubmit = async () => {
    try {
      const res = await submitQuiz({
        quizId: quiz._id,
        lectureId,
        answers,
      }).unwrap();
      setResult(res);
      toast[res.attempt.passed ? "success" : "error"](
        res.attempt.passed
          ? `Passed with ${res.attempt.score}%.`
          : `You scored ${res.attempt.score}% — ${quiz.passPct}% needed to pass.`
      );
    } catch (err) {
      toast.error(err?.data?.message || "Failed to submit quiz");
    }
  };

  const handleRetake = () => {
    setAnswers([]);
    setResult(null);
  };

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="flex flex-wrap items-center gap-2 border-b px-5 py-4">
        <h2 className="flex items-center gap-2 font-semibold">
          <ClipboardList className="h-5 w-5 text-primary" />
          Lecture quiz
        </h2>
        <span className="text-sm text-muted-foreground">
          {quiz.questions.length} questions · {quiz.passPct}% to pass ·
          unlimited retakes
        </span>
        {myStatus?.passed ? (
          <Badge className="ml-auto">
            <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Passed
            {myStatus.bestScore !== null ? ` · best ${myStatus.bestScore}%` : ""}
          </Badge>
        ) : myStatus?.attempts ? (
          <Badge variant="secondary" className="ml-auto">
            {myStatus.attempts} attempt{myStatus.attempts === 1 ? "" : "s"} · not passed yet
          </Badge>
        ) : null}
      </div>

      <div className="space-y-6 px-5 py-5">
        {quiz.questions.map((question, qi) => {
          const questionResult = result?.results?.[qi];
          return (
            <fieldset key={qi} disabled={!!result}>
              <legend className="text-sm font-medium">
                {qi + 1}. {question.prompt}
              </legend>
              <div className="mt-2 space-y-2">
                {question.options.map((option, oi) => {
                  const selected = answers[qi] === oi;
                  const isCorrectOption =
                    questionResult && questionResult.correctIndex === oi;
                  return (
                    <label
                      key={oi}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors",
                        selected && "border-primary bg-primary/5",
                        result && isCorrectOption && "border-primary bg-primary/10",
                        result && selected && !isCorrectOption && "border-destructive bg-destructive/10"
                      )}
                    >
                      <input
                        type="radio"
                        name={`quiz-q-${qi}`}
                        className="h-4 w-4 shrink-0 accent-primary"
                        checked={selected}
                        onChange={() =>
                          setAnswers((prev) => {
                            const next = [...prev];
                            next[qi] = oi;
                            return next;
                          })
                        }
                      />
                      <span className="flex-1">{option}</span>
                      {result && isCorrectOption ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                      ) : result && selected ? (
                        <XCircle className="h-4 w-4 shrink-0 text-destructive" />
                      ) : null}
                    </label>
                  );
                })}
              </div>
              {questionResult?.explanation ? (
                <p className="mt-2 rounded-lg bg-accent/60 px-3 py-2 text-sm text-muted-foreground">
                  {questionResult.explanation}
                </p>
              ) : null}
            </fieldset>
          );
        })}

        {result ? (
          <div className="flex flex-wrap items-center gap-3 border-t pt-4">
            <p className="text-sm font-medium">
              You scored {result.attempt.score}% —{" "}
              {result.attempt.passed
                ? "quiz passed."
                : `${quiz.passPct}% is needed to pass.`}
            </p>
            <Button onClick={handleRetake} variant="outline" className="h-10">
              <RotateCcw className="mr-2 h-4 w-4" /> Retake quiz
            </Button>
          </div>
        ) : (
          <div className="border-t pt-4">
            <Button
              onClick={handleSubmit}
              disabled={!allAnswered || isSubmitting}
              className="h-10"
            >
              {isSubmitting ? "Checking…" : "Submit answers"}
            </Button>
            {!allAnswered ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Answer every question to submit.
              </p>
            ) : null}
          </div>
        )}
      </div>
    </Card>
  );
};

export default QuizPanel;
