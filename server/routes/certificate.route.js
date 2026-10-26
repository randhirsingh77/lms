import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import isInstructor from "../middlewares/isInstructor.js";
import { validateIds } from "../middlewares/validateIds.js";
import {
  getMyCertificates,
  issueCertificate,
  revokeCertificate,
  verifyCertificate,
} from "../controllers/certificate.controller.js";

const router = express.Router();

// Public verification — NO auth. The certId is an unguessable UUID, the
// payload is privacy-safe by construction, and index.js mounts a strict
// rate limiter on this exact path so ids can't be brute-forced.
router.route("/verify/:certId").get(verifyCertificate);
router.route("/mine").get(isAuthenticated, getMyCertificates);
router
  .route("/course/:courseId")
  .post(isAuthenticated, validateIds("courseId"), issueCertificate);
router
  .route("/:certId/revoke")
  .post(isAuthenticated, isInstructor, revokeCertificate);

export default router;
