// Where a user lands right after login/signup: instructors go to their
// admin dashboard, students to their learning page. Single source so the
// login screen, signup screen and any future auth flow agree.
export const landingPathFor = (user) =>
  user?.role === "instructor" ? "/admin/dashboard" : "/my-learning";
