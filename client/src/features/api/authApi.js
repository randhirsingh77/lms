import {createApi, fetchBaseQuery} from "@reduxjs/toolkit/query/react";
import { userLoggedIn, userLoggedOut } from "../authSlice";
import { courseApi } from "./courseApi";
import { purchaseApi } from "./purchaseApi";
import { courseProgressApi } from "./courseProgressApi";
import { certificateApi } from "./certificateApi";
import { doubtsApi } from "./doubtsApi";

const USER_API = import.meta.env.VITE_API_URL + "/api/v1/user/"

// RTK Query caches are keyed by endpoint + arguments only — they know
// nothing about WHO is logged in. Without an explicit reset, logging out
// and straight back in as a different account in the same browser kept
// serving the previous account's cached dashboard numbers, course lists
// and purchase state. Every identity change (login, register, logout)
// therefore wipes all user-scoped caches.
const resetUserScopedCaches = (dispatch) => {
    dispatch(courseApi.util.resetApiState());
    dispatch(purchaseApi.util.resetApiState());
    dispatch(courseProgressApi.util.resetApiState());
    dispatch(certificateApi.util.resetApiState());
    dispatch(doubtsApi.util.resetApiState());
};

export const authApi = createApi({
    reducerPath:"authApi",
    baseQuery:fetchBaseQuery({
        baseUrl:USER_API,
        credentials:'include'
    }),
    endpoints: (builder) => ({
        registerUser: builder.mutation({
            query: (inputData) => ({
                url:"register",
                method:"POST",
                body:inputData
            }),
            // The server sets the session cookie on register too, so a
            // signup is immediately a logged-in session — mirror login's
            // state update or the route guards would bounce the new user.
            async onQueryStarted(_, {queryFulfilled, dispatch}) {
                try {
                    const result = await queryFulfilled;
                    dispatch(userLoggedIn({user:result.data.user}));
                    // New identity: drop anything a previous account left
                    // in the user-scoped caches and refetch the profile.
                    resetUserScopedCaches(dispatch);
                    dispatch(authApi.endpoints.loadUser.initiate(undefined, {forceRefetch:true}));
                } catch {
                    // failed signup; the UI surfaces the server message.
                }
            }
        }),
        loginUser: builder.mutation({
            query: (inputData) => ({
                url:"login",
                method:"POST",
                body:inputData
            }),
            async onQueryStarted(_, {queryFulfilled, dispatch}) {
                try {
                    const result = await queryFulfilled;
                    dispatch(userLoggedIn({user:result.data.user}));
                    resetUserScopedCaches(dispatch);
                    dispatch(authApi.endpoints.loadUser.initiate(undefined, {forceRefetch:true}));
                } catch {
                    // expected for a failed login / logged-out visitor;
                    // the UI surfaces the real error message itself.
                }
            }
        }),
        logoutUser: builder.mutation({
            query: () => ({
                url:"logout",
                method:"GET"
            }),
            async onQueryStarted(_, {queryFulfilled, dispatch}) {
                // Clear the local session immediately; the server call
                // clears the cookie.
                dispatch(userLoggedOut());
                try {
                    await queryFulfilled;
                } catch {
                    // Even if the server call fails, the local wipe below
                    // still stands — a half-logged-out browser must not
                    // keep showing the previous account's data.
                }
                resetUserScopedCaches(dispatch);
                dispatch(authApi.util.resetApiState());
            }
        }),
        loadUser: builder.query({
            query: () => ({
                url:"profile",
                method:"GET"
            }),
            async onQueryStarted(_, {queryFulfilled, dispatch}) {
                try {
                    const result = await queryFulfilled;
                    dispatch(userLoggedIn({user:result.data.user}));
                } catch {
                    // expected for a failed login / logged-out visitor;
                    // the UI surfaces the real error message itself.
                }
            }
        }),
        updateUser: builder.mutation({
            query: (formData) => ({
                url:"profile/update",
                method:"PUT",
                body:formData,
                credentials:"include"
            })
        }),
        forgotPassword: builder.mutation({
            query: (inputData) => ({
                url:"forgot-password",
                method:"POST",
                body:inputData
            })
        }),
        resetPassword: builder.mutation({
            query: (inputData) => ({
                url:"reset-password",
                method:"POST",
                body:inputData
            })
        }),
        changePassword: builder.mutation({
            query: (inputData) => ({
                url:"change-password",
                method:"POST",
                body:inputData
            })
        }),
        // Public instructor page. The endpoint needs no login and its
        // payload is already privacy-filtered on the server.
        getInstructorProfile: builder.query({
            query: (instructorId) => ({
                url:`instructor/${instructorId}`,
                method:"GET"
            })
        })
    })
});
export const {
    useRegisterUserMutation,
    useLoginUserMutation,
    useLogoutUserMutation,
    useLoadUserQuery,
    useUpdateUserMutation,
    useForgotPasswordMutation,
    useResetPasswordMutation,
    useChangePasswordMutation,
    useGetInstructorProfileQuery
} = authApi;
