import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

// Base is the API root because quiz endpoints live in two routers:
// student endpoints under /quiz, authoring under /course.
const API_ROOT = import.meta.env.VITE_API_URL + "/api/v1";

export const quizApi = createApi({
  reducerPath: "quizApi",
  baseQuery: fetchBaseQuery({
    baseUrl: API_ROOT,
    credentials: "include",
  }),
  tagTypes: ["LectureQuiz", "AuthoringQuiz"],
  endpoints: (builder) => ({
    // Student view — the server strips correct answers from this
    // payload; scoring happens server-side on submit.
    getLectureQuiz: builder.query({
      query: (lectureId) => ({
        url: `/quiz/lecture/${lectureId}`,
        method: "GET",
      }),
      providesTags: (result, error, lectureId) => [
        { type: "LectureQuiz", id: lectureId },
      ],
    }),
    submitQuiz: builder.mutation({
      query: ({ quizId, answers }) => ({
        url: `/quiz/${quizId}/submit`,
        method: "POST",
        body: { answers },
      }),
      invalidatesTags: (result, error, { lectureId }) => [
        { type: "LectureQuiz", id: lectureId },
        "LectureQuiz",
      ],
    }),
    getCourseQuizStatus: builder.query({
      query: (courseId) => ({
        url: `/quiz/course/${courseId}/status`,
        method: "GET",
      }),
      providesTags: ["LectureQuiz"],
    }),
    // Authoring (instructor + owner only, enforced on the server).
    getAuthoringQuiz: builder.query({
      query: ({ courseId, lectureId }) => ({
        url: `/course/${courseId}/lecture/${lectureId}/quiz`,
        method: "GET",
      }),
      providesTags: (result, error, { lectureId }) => [
        { type: "AuthoringQuiz", id: lectureId },
      ],
    }),
    saveAuthoringQuiz: builder.mutation({
      query: ({ courseId, lectureId, passPct, questions }) => ({
        url: `/course/${courseId}/lecture/${lectureId}/quiz`,
        method: "PUT",
        body: { passPct, questions },
      }),
      invalidatesTags: (result, error, { lectureId }) => [
        { type: "AuthoringQuiz", id: lectureId },
        { type: "LectureQuiz", id: lectureId },
      ],
    }),
    deleteAuthoringQuiz: builder.mutation({
      query: ({ courseId, lectureId }) => ({
        url: `/course/${courseId}/lecture/${lectureId}/quiz`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, { lectureId }) => [
        { type: "AuthoringQuiz", id: lectureId },
        { type: "LectureQuiz", id: lectureId },
      ],
    }),
  }),
});
export const {
  useGetLectureQuizQuery,
  useSubmitQuizMutation,
  useGetCourseQuizStatusQuery,
  useGetAuthoringQuizQuery,
  useSaveAuthoringQuizMutation,
  useDeleteAuthoringQuizMutation,
} = quizApi;
