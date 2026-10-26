import { combineReducers } from "@reduxjs/toolkit";
import authReducer from "../features/authSlice"; 
import { authApi } from "@/features/api/authApi";
import { courseApi } from "@/features/api/courseApi";
import { purchaseApi } from "@/features/api/purchaseApi";
import { courseProgressApi } from "@/features/api/courseProgressApi";
import { certificateApi } from "@/features/api/certificateApi";
import { doubtsApi } from "@/features/api/doubtsApi";

const rootReducer = combineReducers({
    [authApi.reducerPath]:authApi.reducer,
    [courseApi.reducerPath]:courseApi.reducer,
    [purchaseApi.reducerPath]:purchaseApi.reducer,
    [courseProgressApi.reducerPath]:courseProgressApi.reducer,
    [certificateApi.reducerPath]:certificateApi.reducer,
    [doubtsApi.reducerPath]:doubtsApi.reducer,
    auth:authReducer, 
});
export default rootReducer;