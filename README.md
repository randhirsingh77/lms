# LMS — Learning Management System

I built this full-stack learning platform: instructors publish courses with video lectures, and students purchase, watch, and track their progress. Built with the MERN stack + Redux Toolkit.

## Features

**Students**
- Browse and open course detail pages
- Purchase courses and access enrolled content
- Watch lectures (React Player) and track course progress
- Personal profile with enrolled courses

**Admin / Instructor**
- Dashboard with course management (add, edit, publish)
- Lecture management per course (create, edit, reorder)
- Rich-text course descriptions (Jodit / Quill editors)
- Sales and course data views (Recharts)

**Platform**
- Authenticated student and admin roles (protected routes on both client and server)
- Dark mode, responsive UI (Tailwind CSS + Radix UI components)

## Tech stack

- **Client:** React, Vite, Redux Toolkit, React Router, Tailwind CSS, Radix UI, Axios
- **Server:** Node.js, Express, MongoDB (Mongoose), authentication middleware with protected routes
- **Media/Content:** React Player for lectures, rich-text editors for course content

## Project structure

```
client/   React + Vite front end (student & admin pages, Redux store)
server/   Express API — users, courses, lectures, purchases, progress
```

## Getting started

```bash
# client
cd client && npm install && npm run dev

# server (separate terminal)
cd server && npm install && node index.js
```

The server expects a MongoDB connection string and related secrets in `server/.env` (see `server/.gitignore` — `.env` is intentionally not committed).

## Status

Portfolio project demonstrating a complete MERN workflow: auth, role-based dashboards, CRUD, media lectures, purchase flow, and progress tracking.
