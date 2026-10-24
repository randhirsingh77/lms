import { useGetCategoriesQuery } from "@/features/api/courseApi";

// The DEFAULT category list: built-ins the app ships with. Instructors
// can add their own categories (stored server-side); every consumer
// should read the live list through useCategoryList() below, which asks
// the API and falls back to these defaults if the request fails — the
// list used to be two hand-copied arrays (admin forms vs student
// filter) that could drift apart; now the server is the single source.
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

// Live category list (built-ins + instructor-created) from the API,
// with the built-ins as the offline/failure fallback so forms and
// filters never render empty.
export const useCategoryList = () => {
  const { data } = useGetCategoriesQuery();
  const apiCategories = data?.categories;
  return Array.isArray(apiCategories) && apiCategories.length > 0
    ? apiCategories
    : CATEGORIES;
};
