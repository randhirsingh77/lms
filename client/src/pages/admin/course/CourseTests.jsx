import { EmptyState, PageHeader } from "@/components/SiteUI";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  useCreateTestMutation,
  useDeleteTestMutation,
  useGetCourseTestsQuery,
  useSetTestPublishedMutation,
  useUpdateTestMutation,
} from "@/features/api/testApi";
import { ClipboardList, Loader2, Plus, Trash2, Users } from "lucide-react";
import React, { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";

// Test authoring for one course. A test is a standalone timed paper —
// questions use the same shape as lecture quizzes, and correct answers
// stay server-side until a student submits. Students only see a test
// once it is published.

const emptyQuestion = () => ({
  prompt: "",
  options: ["", ""],
  correctIndex: 0,
  explanation: "",
});

const emptyForm = () => ({
  title: "",
  description: "",
  durationMin: 30,
  passPct: 70,
  maxWarnings: 3,
  questions: [emptyQuestion()],
});

const QuestionEditor = ({ questions, setQuestions }) => {
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
  const addOption = (qi) =>
    setQuestions((prev) =>
      prev.map((q, i) => (i === qi ? { ...q, options: [...q.options, ""] } : q))
    );
  const removeOption = (qi, oi) =>
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qi) return q;
        const options = q.options.filter((_, j) => j !== oi);
        return {
          ...q,
          options,
          correctIndex: Math.min(q.correctIndex, options.length - 1),
        };
      })
    );
  const removeQuestion = (qi) =>
    setQuestions((prev) => prev.filter((_, i) => i !== qi));

  return (
    <div className="space-y-4">
      {questions.map((q, qi) => (
        <div key={qi} className="space-y-3 rounded-xl border p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">Question {qi + 1}</p>
            {questions.length > 1 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 text-destructive hover:text-destructive"
                onClick={() => removeQuestion(qi)}
              >
                <Trash2 className="mr-1.5 h-4 w-4" /> Remove
              </Button>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor={`q-${qi}-prompt`}>Question text</Label>
            <Input
              id={`q-${qi}-prompt`}
              value={q.prompt}
              onChange={(e) => updateQuestion(qi, { prompt: e.target.value })}
              placeholder="Type the question"
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            {q.options.map((option, oi) => (
              <div key={oi} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`correct-${qi}`}
                  aria-label={`Mark option ${oi + 1} as correct`}
                  className="h-4 w-4 shrink-0 accent-primary"
                  checked={q.correctIndex === oi}
                  onChange={() => updateQuestion(qi, { correctIndex: oi })}
                />
                <Input
                  value={option}
                  onChange={(e) => updateOption(qi, oi, e.target.value)}
                  placeholder={`Option ${oi + 1}`}
                  className="h-11"
                />
                {q.options.length > 2 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 shrink-0"
                    aria-label={`Remove option ${oi + 1}`}
                    onClick={() => removeOption(qi, oi)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            ))}
            {q.options.length < 6 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9"
                onClick={() => addOption(qi)}
              >
                <Plus className="mr-1.5 h-4 w-4" /> Add option
              </Button>
            ) : null}
            <p className="text-xs text-muted-foreground">
              The selected radio marks the correct answer. Students never see
              it before submitting.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`q-${qi}-explanation`}>Explanation (optional)</Label>
            <Input
              id={`q-${qi}-explanation`}
              value={q.explanation}
              onChange={(e) => updateQuestion(qi, { explanation: e.target.value })}
              placeholder="Shown to the student after they submit"
              className="h-11"
            />
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        className="h-10"
        onClick={() => setQuestions((prev) => [...prev, emptyQuestion()])}
      >
        <Plus className="mr-1.5 h-4 w-4" /> Add question
      </Button>
    </div>
  );
};

const TestForm = ({ initial, onSave, saving, submitLabel, onCancel }) => {
  const [form, setForm] = useState(initial);
  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="test-title">Title</Label>
        <Input
          id="test-title"
          value={form.title}
          onChange={(e) => set({ title: e.target.value })}
          placeholder="e.g. Midterm — Chapters 1 to 4"
          required
          className="h-11"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="test-description">Description (optional)</Label>
        <Input
          id="test-description"
          value={form.description}
          onChange={(e) => set({ description: e.target.value })}
          placeholder="What this test covers"
          className="h-11"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="test-duration">Duration (minutes)</Label>
          <Input
            id="test-duration"
            type="number"
            min={1}
            max={600}
            value={form.durationMin}
            onChange={(e) => set({ durationMin: Number(e.target.value) })}
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="test-pass">Pass mark (%)</Label>
          <Input
            id="test-pass"
            type="number"
            min={1}
            max={100}
            value={form.passPct}
            onChange={(e) => set({ passPct: Number(e.target.value) })}
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="test-warnings">Warnings before auto-submit</Label>
          <Input
            id="test-warnings"
            type="number"
            min={0}
            max={20}
            value={form.maxWarnings}
            onChange={(e) => set({ maxWarnings: Number(e.target.value) })}
            className="h-11"
          />
          <p className="text-xs text-muted-foreground">
            Students are warned as events are recorded; at this many
            warnings they get a final warning, and one more recorded event
            submits the test.
          </p>
        </div>
      </div>

      <QuestionEditor
        questions={form.questions}
        setQuestions={(questions) => set({ questions })}
      />

      <div className="flex flex-wrap gap-2">
        <Button type="submit" className="h-11" disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…
            </>
          ) : (
            submitLabel
          )}
        </Button>
        {onCancel ? (
          <Button type="button" variant="ghost" className="h-11" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
};

const CourseTests = () => {
  const { courseId } = useParams();
  const { data, isLoading, isError, refetch } = useGetCourseTestsQuery(courseId);
  const [createTest, { isLoading: isCreating }] = useCreateTestMutation();
  const [updateTest, { isLoading: isUpdating }] = useUpdateTestMutation();
  const [deleteTest] = useDeleteTestMutation();
  const [setPublished] = useSetTestPublishedMutation();

  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const tests = data?.tests || [];

  const handleCreate = async (form) => {
    try {
      await createTest({ courseId, ...form }).unwrap();
      toast.success("Test created. Publish it when you're ready.");
      setShowCreate(false);
    } catch (err) {
      toast.error(err?.data?.message || "Could not create the test.");
    }
  };

  const handleUpdate = async (testId, form) => {
    try {
      await updateTest({ testId, ...form }).unwrap();
      toast.success("Test updated.");
      setEditingId(null);
    } catch (err) {
      toast.error(err?.data?.message || "Could not update the test.");
    }
  };

  const handleDelete = async (testId) => {
    try {
      await deleteTest(testId).unwrap();
      toast.success("Test deleted.");
    } catch (err) {
      toast.error(err?.data?.message || "Could not delete the test.");
    }
    setConfirmDeleteId(null);
  };

  const togglePublished = async (test) => {
    try {
      await setPublished({ testId: test._id, published: !test.published }).unwrap();
    } catch (err) {
      toast.error(err?.data?.message || "Could not update the test.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tests"
        description="Timed tests for this course. Students see a test only after you publish it."
        action={
          !showCreate ? (
            <Button className="h-11" onClick={() => setShowCreate(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> New test
            </Button>
          ) : null
        }
      />

      {showCreate ? (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">New test</CardTitle>
          </CardHeader>
          <CardContent>
            <TestForm
              initial={emptyForm()}
              onSave={handleCreate}
              saving={isCreating}
              submitLabel="Create test"
              onCancel={() => setShowCreate(false)}
            />
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
          icon={ClipboardList}
          title="Could not load tests"
          description="Something went wrong while loading this course's tests."
          action={
            <Button className="h-10" onClick={() => refetch()}>
              Try again
            </Button>
          }
        />
      ) : tests.length === 0 && !showCreate ? (
        <EmptyState
          icon={ClipboardList}
          title="No tests for this course yet"
          description="Create a timed test — students will see what it records before they start, and you review the recorded events with each result."
          action={
            <Button className="h-11" onClick={() => setShowCreate(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> Create the first test
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {tests.map((test) => (
            <Card key={test._id} className="shadow-sm">
              <CardContent className="space-y-4 pt-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="flex flex-wrap items-center gap-2 font-semibold">
                      {test.title}
                      {test.published ? (
                        <Badge className="bg-primary text-primary-foreground hover:bg-primary">
                          Published
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Draft</Badge>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {test.questions.length} questions · {test.durationMin} minutes
                      · pass {test.passPct}% · {test.maxWarnings} warnings
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label
                      htmlFor={`publish-${test._id}`}
                      className="text-sm text-muted-foreground"
                    >
                      Published
                    </Label>
                    <Switch
                      id={`publish-${test._id}`}
                      checked={test.published}
                      onCheckedChange={() => togglePublished(test)}
                    />
                  </div>
                </div>

                {editingId === test._id ? (
                  <TestForm
                    initial={{
                      title: test.title,
                      description: test.description || "",
                      durationMin: test.durationMin,
                      passPct: test.passPct,
                      maxWarnings: test.maxWarnings,
                      questions: test.questions.map((q) => ({
                        prompt: q.prompt,
                        options: [...q.options],
                        correctIndex: q.correctIndex,
                        explanation: q.explanation || "",
                      })),
                    }}
                    onSave={(form) => handleUpdate(test._id, form)}
                    saving={isUpdating}
                    submitLabel="Save changes"
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      className="h-10"
                      onClick={() => setEditingId(test._id)}
                    >
                      Edit
                    </Button>
                    <Button asChild variant="outline" className="h-10">
                      <Link to={`/admin/course/${courseId}/tests/${test._id}/attempts`}>
                        <Users className="mr-1.5 h-4 w-4" /> Attempts
                      </Link>
                    </Button>
                    {confirmDeleteId === test._id ? (
                      <>
                        <Button
                          variant="destructive"
                          className="h-10"
                          onClick={() => handleDelete(test._id)}
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
                        onClick={() => setConfirmDeleteId(test._id)}
                      >
                        <Trash2 className="mr-1.5 h-4 w-4" /> Delete
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default CourseTests;
