import {configureStore} from "@reduxjs/toolkit" 
import rootReducer from "./rootReducer";
import { authApi } from "@/features/api/authApi";
import { courseApi } from "@/features/api/courseApi";
import { purchaseApi } from "@/features/api/purchaseApi";
import { courseProgressApi } from "@/features/api/courseProgressApi";
import { certificateApi } from "@/features/api/certificateApi";
import { doubtsApi } from "@/features/api/doubtsApi";
import { quizApi } from "@/features/api/quizApi";
import { testApi } from "@/features/api/testApi";

export const appStore = configureStore({
    reducer: rootReducer,
    middleware:(defaultMiddleware) => defaultMiddleware().concat(authApi.middleware, courseApi.middleware, purchaseApi.middleware, courseProgressApi.middleware, certificateApi.middleware, doubtsApi.middleware, quizApi.middleware, testApi.middleware)
});

const initializeApp = async () => {
    await appStore.dispatch(authApi.endpoints.loadUser.initiate({},{forceRefetch:true}))
}
initializeApp();