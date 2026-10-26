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
import DoubtsInbox from "./pages/admin/DoubtsInbox";
import CourseTests from "./pages/admin/course/CourseTests";
import TestAttempts from "./pages/admin/course/TestAttempts";
import CourseLiveSessions from "./pages/admin/course/CourseLiveSessions";
import LiveSessions from "./pages/student/LiveSessions";
import LiveJoin from "./pages/student/LiveJoin";
import Tests from "./pages/student/Tests";
import TestAttempt from "./pages/student/TestAttempt";
import TestResult from "./pages/student/TestResult";
import CourseDetail from "./pages/student/CourseDetail";
import CourseProgress from "./pages/student/CourseProgress";
import VerifyCertificate from "./pages/student/VerifyCertificate";
import CertificatePage from "./pages/student/CertificatePage";
import PublicProfile from "./pages/student/PublicProfile";
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
        // Public student skill profile — opt-in on the server; a
        // disabled profile answers 404 like a bad link.
        path: "u/:slug",
        element: <PublicProfile />,
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
        // Standalone timed tests: list, the attempt screen (consent →
        // timed attempt), and a finished attempt's result page.
        path: "tests",
        element: (
          <ProtectedRoute>
            <Tests />
          </ProtectedRoute>
        ),
      },
      {
        path: "test/:testId",
        element: (
          <ProtectedRoute>
            <TestAttempt />
          </ProtectedRoute>
        ),
      },
      {
        path: "test-attempt/:attemptId",
        element: (
          <ProtectedRoute>
            <TestResult />
          </ProtectedRoute>
        ),
      },
      {
        // Live classes: the student's schedule list and the embedded
        // Jitsi join page (the server gates the room name at join time).
        path: "live-sessions",
        element: (
          <ProtectedRoute>
            <LiveSessions />
          </ProtectedRoute>
        ),
      },
      {
        path: "live/:sessionId",
        element: (
          <ProtectedRoute>
            <LiveJoin />
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
            path: "doubts",
            element: <DoubtsInbox />,
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
          {
            path: "course/:courseId/tests",
            element: <CourseTests />,
          },
          {
            path: "course/:courseId/tests/:testId/attempts",
            element: <TestAttempts />,
          },
          {
            path: "course/:courseId/live-sessions",
            element: <CourseLiveSessions />,
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
