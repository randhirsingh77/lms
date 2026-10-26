import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import ChangePassword from "./pages/ChangePassword";
import InstructorProfile from "./pages/student/InstructorProfile";
import NotFound from "./pages/NotFound";
import HeroSection from "./pages/student/HeroSection";
import MainLayout from "./layout/MainLayout";
import Courses from "./pages/student/Courses";
import MyLearning from "./pages/student/MyLearning";
import Profile from "./pages/student/Profile";
import Sidebar from "./pages/admin/Sidebar";
import Dashboard from "./pages/admin/Dashboard";
import CourseTable from "./pages/admin/course/CourseTable";
import AddCourse from "./pages/admin/course/AddCourse";
import EditCourse from "./pages/admin/course/EditCourse";
import CreateLecture from "./pages/admin/lecture/CreateLecture";
import EditLecture from "./pages/admin/lecture/EditLecture";
import CourseDetail from "./pages/student/CourseDetail";
import CourseProgress from "./pages/student/CourseProgress";
import VerifyCertificate from "./pages/student/VerifyCertificate";
import CertificatePage from "./pages/student/CertificatePage";
import SearchPage from "./pages/student/SearchPage";
import {
  AdminRoute,
  AuthenticatedUser,
  ProtectedRoute,
} from "./components/ProtectedRoutes";
import PurchaseCourseProtectedRoute from "./components/PurchaseCourseProtectedRoute";
import { ThemeProvider } from "./components/ThemeProvider";
import RouteError from "./components/RouteError";

const appRouter = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    errorElement: <RouteError />,
    children: [
      {
        path: "/",
        element: (
          <>
            <HeroSection />
            <Courses />
          </>
        ),
      },
      {
        path: "login",
        element: (
          <AuthenticatedUser>
            <Login />
          </AuthenticatedUser>
        ),
      },
      {
        path: "signup",
        element: (
          <AuthenticatedUser>
            <Signup />
          </AuthenticatedUser>
        ),
      },
      {
        path: "forgot-password",
        element: <ForgotPassword />,
      },
      {
        path: "reset-password",
        element: <ResetPassword />,
      },
      {
        path: "my-learning",
        element: (
          <ProtectedRoute>
            <MyLearning />
          </ProtectedRoute>
        ),
      },
      {
        path: "profile",
        element: (
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        ),
      },
      {
        path: "change-password",
        element: (
          <ProtectedRoute>
            <ChangePassword />
          </ProtectedRoute>
        ),
      },
      {
        // Public instructor page — no login required; the API payload is
        // privacy-filtered on the server.
        path: "instructor/:instructorId",
        element: <InstructorProfile />,
      },
      {
        // Public certificate verification — no login required; the API
        // payload contains only what is printed on the certificate.
        path: "verify/:certId",
        element: <VerifyCertificate />,
      },
      {
        // The student's own printable certificate (looked up in their
        // certificate list, so another account's id shows "not found").
        path: "certificate/:certId",
        element: (
          <ProtectedRoute>
            <CertificatePage />
          </ProtectedRoute>
        ),
      },
      {
        path: "course/search",
        element: (
          <ProtectedRoute>
            <SearchPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "course-detail/:courseId",
        element: (
          <ProtectedRoute>
            <CourseDetail />
          </ProtectedRoute>
        ),
      },
      {
        path: "course-progress/:courseId",
        element: (
          <ProtectedRoute>
            <PurchaseCourseProtectedRoute>
            <CourseProgress />
            </PurchaseCourseProtectedRoute>
          </ProtectedRoute>
        ),
      },

      // admin routes start from here
      {
        path: "admin",
        element: (
          <AdminRoute>
            <Sidebar />
          </AdminRoute>
        ),
        children: [
          {
            path: "dashboard",
            element: <Dashboard />,
          },
          {
            path: "course",
            element: <CourseTable />,
          },
          {
            path: "course/create",
            element: <AddCourse />,
          },
          {
            path: "course/:courseId",
            element: <EditCourse />,
          },
          {
            path: "course/:courseId/lecture",
            element: <CreateLecture />,
          },
          {
            path: "course/:courseId/lecture/:lectureId",
            element: <EditLecture />,
          },
        ],
      },

      // Catch-all LAST: unknown paths get a designed 404 inside the
      // layout instead of react-router's bare error screen.
      {
        path: "*",
        element: <NotFound />,
      },
    ],
  },
]);

function App() {
  return (
    <main>
      <ThemeProvider>
      <RouterProvider router={appRouter} />
      </ThemeProvider>
    </main>
  );
}

export default App;
