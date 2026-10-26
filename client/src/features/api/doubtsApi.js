import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const DOUBT_API = import.meta.env.VITE_API_URL + "/api/v1/doubt";

export const doubtsApi = createApi({
  reducerPath: "doubtsApi",
  baseQuery: fetchBaseQuery({
    baseUrl: DOUBT_API,
    credentials: "include",
  }),
  tagTypes: ["LectureDoubts", "DoubtInbox"],
  endpoints: (builder) => ({
    getDoubtsForLecture: builder.query({
      query: ({ courseId, lectureId }) => ({
        url: `/course/${courseId}/lecture/${lectureId}`,
        method: "GET",
      }),
      providesTags: (result, error, { lectureId }) => [
        { type: "LectureDoubts", id: lectureId },
      ],
    }),
    createDoubt: builder.mutation({
      query: ({ courseId, lectureId, body, timestampSec, videoDurationSec }) => ({
        url: `/course/${courseId}/lecture/${lectureId}`,
        method: "POST",
        body: { body, timestampSec, videoDurationSec },
      }),
      invalidatesTags: (result, error, { lectureId }) => [
        { type: "LectureDoubts", id: lectureId },
        "DoubtInbox",
      ],
    }),
    replyToDoubt: builder.mutation({
      query: ({ doubtId, body }) => ({
        url: `/${doubtId}/reply`,
        method: "POST",
        body: { body },
      }),
      invalidatesTags: ["LectureDoubts", "DoubtInbox"],
    }),
    upvoteDoubt: builder.mutation({
      query: (doubtId) => ({
        url: `/${doubtId}/upvote`,
        method: "POST",
      }),
      invalidatesTags: ["LectureDoubts", "DoubtInbox"],
    }),
    getDoubtInbox: builder.query({
      query: () => ({
        url: "/inbox",
        method: "GET",
      }),
      providesTags: ["DoubtInbox"],
    }),
    setDoubtStatus: builder.mutation({
      query: ({ doubtId, status }) => ({
        url: `/${doubtId}/status`,
        method: "PATCH",
        body: { status },
      }),
      invalidatesTags: ["LectureDoubts", "DoubtInbox"],
    }),
    deleteDoubt: builder.mutation({
      query: (doubtId) => ({
        url: `/${doubtId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["LectureDoubts", "DoubtInbox"],
    }),
  }),
});
export const {
  useGetDoubtsForLectureQuery,
  useCreateDoubtMutation,
  useReplyToDoubtMutation,
  useUpvoteDoubtMutation,
  useGetDoubtInboxQuery,
  useSetDoubtStatusMutation,
  useDeleteDoubtMutation,
} = doubtsApi;
