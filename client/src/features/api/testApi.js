import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

// Standalone timed tests with integrity logging. Student payloads never
// carry correct answers before an attempt is submitted — scoring and
// the warning count both live on the server.
const API_ROOT = import.meta.env.VITE_API_URL + "/api/v1";

export const testApi = createApi({
  reducerPath: "testApi",
  baseQuery: fetchBaseQuery({
    baseUrl: API_ROOT,
    credentials: "include",
  }),
  tagTypes: ["MyTests", "TestBrief", "CourseTests", "TestAttempts"],
  endpoints: (builder) => ({
    // ----- student -----
    getMyTests: builder.query({
      query: () => ({ url: `/test/mine`, method: "GET" }),
      providesTags: ["MyTests"],
    }),
    getTestBrief: builder.query({
      query: (testId) => ({ url: `/test/${testId}/brief`, method: "GET" }),
      providesTags: (result, error, testId) => [{ type: "TestBrief", id: testId }],
    }),
    startTestAttempt: builder.mutation({
      query: ({ testId, consent, noticeVersion }) => ({
        url: `/test/${testId}/start`,
        method: "POST",
        body: { consent, noticeVersion },
      }),
      invalidatesTags: ["MyTests"],
    }),
    saveAttemptAnswers: builder.mutation({
      query: ({ attemptId, answers }) => ({
        url: `/test/attempt/${attemptId}/answers`,
        method: "PUT",
        body: { answers },
      }),
    }),
    postAttemptEvent: builder.mutation({
      query: ({ attemptId, ...event }) => ({
        url: `/test/attempt/${attemptId}/event`,
        method: "POST",
        body: event,
      }),
    }),
    submitTestAttempt: builder.mutation({
      query: ({ attemptId, answers }) => ({
        url: `/test/attempt/${attemptId}/submit`,
        method: "POST",
        body: { answers },
      }),
      invalidatesTags: ["MyTests"],
    }),
    getAttemptResult: builder.query({
      query: (attemptId) => ({
        url: `/test/attempt/${attemptId}/result`,
        method: "GET",
      }),
    }),
    // ----- instructor -----
    getCourseTests: builder.query({
      query: (courseId) => ({ url: `/test/course/${courseId}`, method: "GET" }),
      providesTags: (result, error, courseId) => [
        { type: "CourseTests", id: courseId },
      ],
    }),
    createTest: builder.mutation({
      query: ({ courseId, ...body }) => ({
        url: `/test/course/${courseId}`,
        method: "POST",
        body,
      }),
      invalidatesTags: (result, error, { courseId }) => [
        { type: "CourseTests", id: courseId },
      ],
    }),
    updateTest: builder.mutation({
      query: ({ testId, ...body }) => ({
        url: `/test/${testId}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["CourseTests"],
    }),
    deleteTest: builder.mutation({
      query: (testId) => ({ url: `/test/${testId}`, method: "DELETE" }),
      invalidatesTags: ["CourseTests"],
    }),
    setTestPublished: builder.mutation({
      query: ({ testId, published }) => ({
        url: `/test/${testId}/publish`,
        method: "PATCH",
        body: { published },
      }),
      invalidatesTags: ["CourseTests"],
    }),
    getTestAttempts: builder.query({
      query: (testId) => ({ url: `/test/${testId}/attempts`, method: "GET" }),
      providesTags: (result, error, testId) => [
        { type: "TestAttempts", id: testId },
      ],
    }),
    reviewTestAttempt: builder.mutation({
      query: ({ attemptId, decision }) => ({
        url: `/test/attempt/${attemptId}/review`,
        method: "PATCH",
        body: { decision },
      }),
      invalidatesTags: ["TestAttempts"],
    }),
  }),
});
export const {
  useGetMyTestsQuery,
  useGetTestBriefQuery,
  useStartTestAttemptMutation,
  useSaveAttemptAnswersMutation,
  usePostAttemptEventMutation,
  useSubmitTestAttemptMutation,
  useGetAttemptResultQuery,
  useGetCourseTestsQuery,
  useCreateTestMutation,
  useUpdateTestMutation,
  useDeleteTestMutation,
  useSetTestPublishedMutation,
  useGetTestAttemptsQuery,
  useReviewTestAttemptMutation,
} = testApi;
