import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const CERTIFICATE_API = import.meta.env.VITE_API_URL + "/api/v1/certificate";

export const certificateApi = createApi({
  reducerPath: "certificateApi",
  baseQuery: fetchBaseQuery({
    baseUrl: CERTIFICATE_API,
    credentials: "include",
  }),
  tagTypes: ["MyCertificates"],
  endpoints: (builder) => ({
    getMyCertificates: builder.query({
      query: () => ({
        url: "/mine",
        method: "GET",
      }),
      providesTags: ["MyCertificates"],
    }),
    issueCertificate: builder.mutation({
      query: (courseId) => ({
        url: `/course/${courseId}`,
        method: "POST",
      }),
      invalidatesTags: ["MyCertificates"],
    }),
    // Public verification — works logged out; the payload only contains
    // what is printed on the certificate itself.
    verifyCertificate: builder.query({
      query: (certId) => ({
        url: `/verify/${certId}`,
        method: "GET",
      }),
    }),
  }),
});
export const {
  useGetMyCertificatesQuery,
  useIssueCertificateMutation,
  useVerifyCertificateQuery,
} = certificateApi;
