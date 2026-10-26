import crypto from "node:crypto";
import { Certificate } from "../models/certificate.model.js";
import { Course } from "../models/course.model.js";
import { User } from "../models/user.model.js";
import { loadCourseForProgress } from "./courseProgress.controller.js";
import { getCertificateEligibility } from "../utils/certificateEligibility.js";

// The brand printed on every certificate and shown on the verify page.
export const CERTIFICATE_ISSUER = "E-Learning";

// Keyed checksum over the snapshot. The dedicated secret is optional:
// when CERTIFICATE_HMAC_SECRET is not configured the login secret is
// used, so the feature works out of the box and can never stop the
// server from booting (validateEnv treats the variable as optional).
const checksumFor = (cert) => {
  const secret = process.env.CERTIFICATE_HMAC_SECRET || process.env.SECRET_KEY || "";
  const payload = [
    cert.certId,
    cert.snapshot?.studentName || "",
    cert.snapshot?.courseTitle || "",
    cert.snapshot?.instructorName || "",
    cert.issuedAtISO || "",
  ].join("|");
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
};

const publicCertificateShape = (cert) => ({
  certId: cert.certId,
  issuer: cert.issuer,
  studentName: cert.snapshot.studentName,
  courseTitle: cert.snapshot.courseTitle,
  instructorName: cert.snapshot.instructorName,
  issuedAt: cert.createdAt,
  revoked: cert.revoked,
  // Short fingerprint shown on the printout and the verify page so the
  // two can be eyeballed against each other.
  checksum: (cert.checksum || "").slice(0, 16),
});

// POST /api/v1/certificate/course/:courseId — issue (or return the
// existing) certificate for the signed-in student. Enrolment is checked
// by the same guard that protects course content; eligibility comes
// from real per-lecture viewed records (see certificateEligibility),
// never from the "Mark as completed" marker.
export const issueCertificate = async (req, res) => {
  try {
    const { courseId } = req.params;
    const course = await loadCourseForProgress(req, res);
    if (!course) return;

    // The course creator teaches the course; certificates are for the
    // students enrolled in it.
    if (String(course.creator) === String(req.id)) {
      return res.status(400).json({
        success: false,
        message: "Course creators cannot issue a certificate to themselves.",
      });
    }

    const existing = await Certificate.findOne({ userId: req.id, courseId });
    if (existing && !existing.revoked) {
      return res.status(200).json({
        success: true,
        certificate: publicCertificateShape(existing),
        message: "Certificate already issued for this course.",
      });
    }

    const eligibility = await getCertificateEligibility(req.id, course);
    if (!eligibility.eligible) {
      return res.status(400).json({
        success: false,
        message:
          "Certificate not earned yet — watch every lecture" +
          (eligibility.quizLectureCount
            ? " and pass every lecture quiz"
            : "") +
          " first.",
        eligibility,
      });
    }

    const [student, instructor] = await Promise.all([
      User.findById(req.id).select("name"),
      User.findById(course.creator).select("name"),
    ]);
    if (!student) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const draft = {
      certId: crypto.randomUUID(),
      userId: req.id,
      courseId,
      issuer: CERTIFICATE_ISSUER,
      snapshot: {
        studentName: student.name,
        courseTitle: course.courseTitle,
        instructorName: instructor?.name || "",
      },
    };

    let certificate;
    if (existing?.revoked) {
      // Re-issue after revocation: fresh id + snapshot on the same
      // record so the old (revoked) id stays verifiable as revoked.
      existing.certId = draft.certId;
      existing.snapshot = draft.snapshot;
      existing.revoked = false;
      existing.revokedAt = undefined;
      certificate = await existing.save();
    } else {
      certificate = await Certificate.create(draft);
    }
    // The checksum covers createdAt, so it can only be stamped once the
    // record (and its timestamp) exists.
    certificate.checksum = checksumFor({
      certId: certificate.certId,
      snapshot: certificate.snapshot,
      issuedAtISO: certificate.createdAt
        ? new Date(certificate.createdAt).toISOString()
        : "",
    });
    await certificate.save();

    return res.status(201).json({
      success: true,
      certificate: publicCertificateShape(certificate),
      message: "Certificate issued.",
    });
  } catch (error) {
    if (error?.code === 11000) {
      const existing = await Certificate.findOne({ userId: req.id, courseId: req.params.courseId });
      if (existing) {
        return res.status(200).json({
          success: true,
          certificate: publicCertificateShape(existing),
          message: "Certificate already issued for this course.",
        });
      }
    }
    console.error(error?.name || "Error", "-", String(error?.message || "").slice(0, 200));
    return res.status(500).json({ success: false, message: "Failed to issue certificate" });
  }
};

// GET /api/v1/certificate/mine — the signed-in user's certificates.
export const getMyCertificates = async (req, res) => {
  try {
    const certificates = await Certificate.find({ userId: req.id })
      .sort({ createdAt: -1 })
      .lean();
    return res.status(200).json({
      success: true,
      certificates: certificates.map((cert) => ({
        ...publicCertificateShape(cert),
        courseId: cert.courseId,
      })),
    });
  } catch (error) {
    console.error(error?.name || "Error", "-", String(error?.message || "").slice(0, 200));
    return res.status(500).json({ success: false, message: "Failed to load certificates" });
  }
};

// GET /api/v1/certificate/verify/:certId — PUBLIC. Anyone holding the
// link (an employer, a recruiter) can confirm a certificate is real.
// The payload is built field-by-field: no user id, no email, nothing
// beyond what is printed on the certificate itself. The response
// distinguishes valid / revoked / checksum-mismatch / not-found so a
// forged or altered id gets a clear answer instead of a silent 404.
export const verifyCertificate = async (req, res) => {
  try {
    const { certId } = req.params;
    const cert = await Certificate.findOne({ certId }).lean();
    if (!cert) {
      return res.status(404).json({
        success: true,
        valid: false,
        status: "not_found",
        message: "No certificate exists with this ID.",
      });
    }
    const recomputed = checksumFor({
      ...cert,
      issuedAtISO: cert.createdAt ? new Date(cert.createdAt).toISOString() : "",
    });
    // Certificates issued before checksums existed have an empty stored
    // value; only a PRESENT-but-different checksum is a failure.
    const checksumOk = !cert.checksum || recomputed === cert.checksum;
    if (cert.revoked) {
      return res.status(200).json({
        success: true,
        valid: false,
        status: "revoked",
        certificate: publicCertificateShape(cert),
        message: "This certificate has been revoked by the issuer.",
      });
    }
    if (!checksumOk) {
      return res.status(200).json({
        success: true,
        valid: false,
        status: "checksum_mismatch",
        message: "This certificate record failed its integrity check.",
      });
    }
    return res.status(200).json({
      success: true,
      valid: true,
      status: "valid",
      certificate: publicCertificateShape(cert),
      message: "Certificate is valid.",
    });
  } catch (error) {
    console.error(error?.name || "Error", "-", String(error?.message || "").slice(0, 200));
    return res.status(500).json({ success: false, message: "Failed to verify certificate" });
  }
};

// POST /api/v1/certificate/:certId/revoke — the instructor who created
// the course (checked by the isInstructor middleware + ownership here)
// can revoke a certificate, e.g. one issued in error.
export const revokeCertificate = async (req, res) => {
  try {
    const { certId } = req.params;
    const cert = await Certificate.findOne({ certId });
    if (!cert) {
      return res.status(404).json({ success: false, message: "Certificate not found" });
    }
    const course = await Course.findById(cert.courseId).select("creator");
    if (!course || String(course.creator) !== String(req.id)) {
      return res.status(403).json({
        success: false,
        message: "Only the course creator can revoke this certificate.",
      });
    }
    if (!cert.revoked) {
      cert.revoked = true;
      cert.revokedAt = new Date();
      await cert.save();
    }
    return res.status(200).json({
      success: true,
      certificate: publicCertificateShape(cert),
      message: "Certificate revoked.",
    });
  } catch (error) {
    console.error(error?.name || "Error", "-", String(error?.message || "").slice(0, 200));
    return res.status(500).json({ success: false, message: "Failed to revoke certificate" });
  }
};
