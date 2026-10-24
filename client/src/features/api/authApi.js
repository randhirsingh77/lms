import {createApi, fetchBaseQuery} from "@reduxjs/toolkit/query/react";
import { userLoggedIn, userLoggedOut } from "../authSlice";

const USER_API = import.meta.env.VITE_API_URL + "/api/v1/user/"

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
            async onQueryStarted(_, {dispatch}) {
                // Clear the local session immediately; the server call
                // clears the cookie.
                dispatch(userLoggedOut());
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
    useChangePasswordMutation
} = authApi;
