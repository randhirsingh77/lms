import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import isInstructor from "../middlewares/isInstructor.js";
import { validateIds } from "../middlewares/validateIds.js";
import {
  createDoubt,
  deleteDoubt,
  getDoubtsForLecture,
  getInstructorInbox,
  replyToDoubt,
  setDoubtStatus,
  upvoteDoubt,
} from "../controllers/doubt.controller.js";

const router = express.Router();

// "/inbox" is registered before the ":doubtId" routes so it can never
// be captured as an id.
router.route("/inbox").get(isAuthenticated, isInstructor, getInstructorInbox);
router
  .route("/course/:courseId/lecture/:lectureId")
  .get(isAuthenticated, validateIds("courseId", "lectureId"), getDoubtsForLecture)
  .post(isAuthenticated, validateIds("courseId", "lectureId"), createDoubt);
router.route("/:doubtId/reply").post(isAuthenticated, validateIds("doubtId"), replyToDoubt);
router.route("/:doubtId/upvote").post(isAuthenticated, validateIds("doubtId"), upvoteDoubt);
router.route("/:doubtId/status").patch(isAuthenticated, isInstructor, validateIds("doubtId"), setDoubtStatus);
router.route("/:doubtId").delete(isAuthenticated, validateIds("doubtId"), deleteDoubt);

export default router;
