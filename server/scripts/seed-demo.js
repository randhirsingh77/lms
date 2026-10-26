// Seed script: creates the DEMO showcase course with a demo
// instructor and a demo student, so the certificate / quiz / doubt /
// public-profile features can be tried end-to-end.
//
//   cd server && node scripts/seed-demo.js
//
// Reads MONGO_URI from server/.env (same config as the server).
// Idempotent: it deletes the previous demo course (found by title),
// its lectures, quizzes, attempts, doubts and progress, then rebuilds.
// It never touches any other course or account.
//
// The demo accounts are throwaway showcase accounts — their password
// is deliberately published here (that is their purpose), they are NOT
// anyone's real account:
//   demo.instructor@example.com / DemoPass123!
//   demo.student@example.com    / DemoPass123!
// The demo student is enrolled DIRECTLY (both enrolment arrays), never
// through Stripe checkout.
import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(serverRoot, ".env") });

const { User } = await import("../models/user.model.js");
const { Course } = await import("../models/course.model.js");
const { Lecture } = await import("../models/lecture.model.js");
const { Quiz } = await import("../models/quiz.model.js");
const { QuizAttempt } = await import("../models/quizAttempt.model.js");
const { Doubt } = await import("../models/doubt.model.js");
const { CourseProgress } = await import("../models/courseProgress.js");
const { Certificate } = await import("../models/certificate.model.js");

const DEMO_COURSE_TITLE = "Demo Course: Web Development Foundations";
const DEMO_PASSWORD = "DemoPass123!";

// Public sample videos (Google's public sample bucket) — placeholders
// so the demo course plays end-to-end without any media account.
const SAMPLE_VIDEOS = {
  bunny: "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  elephants: "https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
  blazes: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
};

const LECTURES = [
  {
    lectureTitle: "Welcome — How the Web Works",
    videoUrl: SAMPLE_VIDEOS.bunny,
    quiz: {
      passPct: 70,
      questions: [
        {
          prompt: "When you type a website address and press Enter, what happens first?",
          options: [
            "The browser asks a DNS server for the site's IP address",
            "The browser downloads the site's entire database",
            "Your computer builds the page from scratch",
            "The page is sent to your email",
          ],
          correctIndex: 0,
          explanation: "The browser first resolves the domain name to an IP address using DNS, then connects to that server.",
        },
        {
          prompt: "What does a web server send back to the browser?",
          options: [
            "Only a screenshot of the page",
            "Files such as HTML, CSS and JavaScript that the browser renders",
            "The server's hard drive",
            "Nothing — the browser guesses the page",
          ],
          correctIndex: 1,
          explanation: "The server responds with the page's files; the browser reads them and renders the page you see.",
        },
        {
          prompt: "What is the role of HTTPS compared to HTTP?",
          options: [
            "It makes pages load in higher resolution",
            "It lets a site work offline",
            "It encrypts the data sent between browser and server",
            "It removes the need for a server",
          ],
          correctIndex: 2,
          explanation: "The S in HTTPS stands for Secure — traffic is encrypted so others on the network cannot read or alter it.",
        },
        {
          prompt: "Which of these runs in the browser (client side)?",
          options: [
            "The database",
            "The HTML, CSS and JavaScript of the page",
            "The payment gateway",
            "The email server",
          ],
          correctIndex: 1,
          explanation: "Client-side code is what the browser downloads and runs: HTML for structure, CSS for styling, JavaScript for behaviour.",
        },
      ],
    },
  },
  {
    lectureTitle: "HTML and CSS Essentials",
    videoUrl: SAMPLE_VIDEOS.elephants,
    quiz: {
      passPct: 70,
      questions: [
        {
          prompt: "What does HTML mainly define on a web page?",
          options: [
            "The database tables",
            "The structure and content of the page",
            "The server's security rules",
            "The page's loading speed",
          ],
          correctIndex: 1,
          explanation: "HTML marks up content — headings, paragraphs, links, images — giving the page its structure.",
        },
        {
          prompt: "Which language is used to style a page (colours, spacing, layout)?",
          options: ["HTML", "SQL", "CSS", "JSON"],
          correctIndex: 2,
          explanation: "CSS (Cascading Style Sheets) controls presentation: colours, fonts, spacing and layout.",
        },
        {
          prompt: "In CSS, what does a class selector start with?",
          options: ["#", ".", "@", "$"],
          correctIndex: 1,
          explanation: "A dot selects a class (.card), while a hash selects an id (#header).",
        },
        {
          prompt: "Which HTML tag creates a hyperlink?",
          options: ["<link>", "<href>", "<a>", "<url>"],
          correctIndex: 2,
          explanation: "The anchor tag <a href=\"...\"> creates links; <link> is for external resources like stylesheets.",
        },
      ],
    },
  },
  {
    lectureTitle: "JavaScript Basics — Variables and Functions",
    videoUrl: SAMPLE_VIDEOS.blazes,
    quiz: {
      passPct: 70,
      questions: [
        {
          prompt: "Which keyword declares a variable whose value cannot be reassigned?",
          options: ["var", "let", "const", "static"],
          correctIndex: 2,
          explanation: "const declares a binding that cannot be reassigned after its initial value (the value itself can still be an object you mutate).",
        },
        {
          prompt: "What does a function return if it has no return statement?",
          options: ["null", "0", "An empty string", "undefined"],
          correctIndex: 3,
          explanation: "In JavaScript, a function without an explicit return evaluates to undefined.",
        },
        {
          prompt: "Which of these is the strict equality operator (no type coercion)?",
          options: ["=", "==", "===", "!=="],
          correctIndex: 2,
          explanation: "=== compares value AND type without converting, so 5 === \"5\" is false, unlike ==.",
        },
        {
          prompt: "What is an array in JavaScript?",
          options: [
            "A single text value",
            "An ordered list of values stored in one variable",
            "A type of function",
            "A database table",
          ],
          correctIndex: 1,
          explanation: "An array holds an ordered list — [10, 20, 30] — accessed by index starting at 0.",
        },
      ],
    },
  },
];

const upsertDemoUser = async ({ name, email, role }) => {
  const hashed = await bcrypt.hash(DEMO_PASSWORD, 12);
  return User.findOneAndUpdate(
    { email },
    { name, email, password: hashed, role },
    { new: true, upsert: true }
  );
};

const main = async () => {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is not set — copy server/.env.example to server/.env and fill it in.");
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected. Seeding demo data…");

  const instructor = await upsertDemoUser({
    name: "Demo Instructor",
    email: "demo.instructor@example.com",
    role: "instructor",
  });
  const student = await upsertDemoUser({
    name: "Demo Student",
    email: "demo.student@example.com",
    role: "student",
  });

  // Remove the previous demo course and everything attached to it.
  const old = await Course.findOne({ courseTitle: DEMO_COURSE_TITLE });
  if (old) {
    const oldLectureIds = old.lectures || [];
    const oldQuizzes = await Quiz.find({ courseId: old._id }).select("_id");
    await QuizAttempt.deleteMany({ quizId: { $in: oldQuizzes.map((q) => q._id) } });
    await Quiz.deleteMany({ courseId: old._id });
    await Doubt.deleteMany({ courseId: old._id });
    await CourseProgress.deleteMany({ courseId: String(old._id) });
    await Certificate.deleteMany({ courseId: old._id });
    await Lecture.deleteMany({ _id: { $in: oldLectureIds } });
    await Course.deleteOne({ _id: old._id });
    await User.updateMany(
      { enrolledCourses: old._id },
      { $pull: { enrolledCourses: old._id } }
    );
    console.log("Removed previous demo course.");
  }

  const course = await Course.create({
    courseTitle: DEMO_COURSE_TITLE,
    subTitle: "A short showcase course with a quiz on every lecture",
    description:
      "A small demo course used to showcase verifiable certificates, per-lecture quizzes, timestamped doubts and the public skill profile. Watch the lectures, pass each quiz, and claim your certificate.",
    category: "fullstack development",
    courseLevel: "Beginner",
    coursePrice: 0,
    creator: instructor._id,
    isPublished: true,
  });

  const lectureIds = [];
  for (const spec of LECTURES) {
    const lecture = await Lecture.create({
      lectureTitle: spec.lectureTitle,
      videoUrl: spec.videoUrl,
      isPreviewFree: false,
    });
    lectureIds.push(lecture._id);
    await Quiz.create({
      lectureId: lecture._id,
      courseId: course._id,
      passPct: spec.quiz.passPct,
      questions: spec.quiz.questions,
    });
  }
  course.lectures = lectureIds;

  // Direct enrolment — demo only, never through checkout.
  course.enrolledStudents = [student._id];
  await course.save();
  await User.findByIdAndUpdate(student._id, {
    $addToSet: { enrolledCourses: course._id },
  });

  console.log("Demo seed complete:");
  console.log(`  Course:      ${course.courseTitle} (${course._id})`);
  console.log(`  Lectures:    ${lectureIds.length}, each with a ${LECTURES[0].quiz.questions.length}-question quiz`);
  console.log("  Instructor:  demo.instructor@example.com / DemoPass123!");
  console.log("  Student:     demo.student@example.com / DemoPass123! (enrolled)");
  await mongoose.disconnect();
};

main().catch(async (err) => {
  console.error("Seed failed:", err?.message || err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
