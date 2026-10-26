import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

// Live sessions (Jitsi Meet embed). Scheduling lives on our server;
// the call itself runs in the browser via Jitsi's IFrame API. The
// server only releases the room slug inside the join window.
const API_ROOT = import.meta.env.VITE_API_URL + "/api/v1";

export const liveSessionApi = createApi({
  reducerPath: "liveSessionApi",
  baseQuery: fetchBaseQuery({
    baseUrl: API_ROOT,
    credentials: "include",
  }),
  tagTypes: ["MyLiveSessions", "CourseLiveSessions"],
  endpoints: (builder) => ({
    // ----- student -----
    getMyLiveSessions: builder.query({
      query: () => ({ url: `/live-session/mine`, method: "GET" }),
      providesTags: ["MyLiveSessions"],
    }),
    getLiveSessionJoinInfo: builder.query({
      query: (sessionId) => ({
        url: `/live-session/${sessionId}/join`,
        method: "GET",
      }),
    }),
    // ----- instructor -----
    getCourseLiveSessions: builder.query({
      query: (courseId) => ({
        url: `/live-session/course/${courseId}`,
        method: "GET",
      }),
      providesTags: (result, error, courseId) => [
        { type: "CourseLiveSessions", id: courseId },
      ],
    }),
    createLiveSession: builder.mutation({
      query: ({ courseId, ...body }) => ({
        url: `/live-session/course/${courseId}`,
        method: "POST",
        body,
      }),
      invalidatesTags: (result, error, { courseId }) => [
        { type: "CourseLiveSessions", id: courseId },
        "MyLiveSessions",
      ],
    }),
    setLiveSessionStatus: builder.mutation({
      query: ({ sessionId, status }) => ({
        url: `/live-session/${sessionId}/status`,
        method: "PATCH",
        body: { status },
      }),
      invalidatesTags: ["CourseLiveSessions", "MyLiveSessions"],
    }),
    deleteLiveSession: builder.mutation({
      query: (sessionId) => ({
        url: `/live-session/${sessionId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["CourseLiveSessions", "MyLiveSessions"],
    }),
  }),
});
export const {
  useGetMyLiveSessionsQuery,
  useGetLiveSessionJoinInfoQuery,
  useGetCourseLiveSessionsQuery,
  useCreateLiveSessionMutation,
  useSetLiveSessionStatusMutation,
  useDeleteLiveSessionMutation,
} = liveSessionApi;
