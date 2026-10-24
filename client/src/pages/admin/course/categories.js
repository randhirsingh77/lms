// One canonical category list for the whole app. The VALUE is what gets
// stored on the course and what the student-side Filter sends back to the
// search API — AddCourse and CourseTab used to store different strings
// ("Next JS") than the filter searched for ("nextjs"), so filtered search
// silently missed courses.
export const CATEGORIES = [
  { value: "nextjs", label: "Next JS" },
  { value: "data science", label: "Data Science" },
  { value: "frontend development", label: "Frontend Development" },
  { value: "fullstack development", label: "Fullstack Development" },
  { value: "mern stack development", label: "MERN Stack Development" },
  { value: "backend development", label: "Backend Development" },
  { value: "javascript", label: "Javascript" },
  { value: "python", label: "Python" },
  { value: "docker", label: "Docker" },
  { value: "mongodb", label: "MongoDB" },
  { value: "html", label: "HTML" },
];
