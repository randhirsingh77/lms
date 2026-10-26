import Stripe from "stripe";
import mongoose from "mongoose";
import { Course } from "../models/course.model.js";
import { CoursePurchase } from "../models/coursePurchase.model.js";
import { User } from "../models/user.model.js";
import { publicSocialLinksOf } from "../utils/publicProfile.js";

// Create the Stripe client lazily: constructing it at import time with a
// missing key throws, which used to take the WHOLE server down (even the
// routes that have nothing to do with payments).
let stripeClient = null;
const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  if (!stripeClient) stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  return stripeClient;
};

// Where Stripe sends the browser back after checkout. FRONTEND_URL must be
// a real http(s) origin — an unset or malformed value used to produce
// "undefined/course-progress/..." (or a localhost URL in production), so
// the student landed on a dead page after paying. Validate it, fall back
// through the same client-origin envs the rest of the server uses, and as
// a last resort use the deployed client origin (production) or the dev
// origin. Warn once so a misconfigured deploy is visible in the logs.
let frontendUrlWarned = false;
const frontendBaseUrl = () => {
  const candidates = [
    process.env.FRONTEND_URL,
    process.env.CLIENT_URL,
    ...(process.env.CLIENT_URLS || "").split(","),
  ];
  for (const raw of candidates) {
    const value = (raw || "").trim();
    if (!value) continue;
    try {
      const url = new URL(value);
      if (url.protocol === "http:" || url.protocol === "https:") {
        return url.origin;
      }
    } catch {
      // not a URL — keep looking through the candidates
    }
  }
  if (!frontendUrlWarned) {
    frontendUrlWarned = true;
    console.warn(
      "FRONTEND_URL is not a valid URL — Stripe success/cancel URLs are using a fallback origin. Set FRONTEND_URL to the deployed client origin."
    );
  }
  return process.env.NODE_ENV === "production"
    ? "https://lms-seven-gold.vercel.app"
    : "http://localhost:5173";
};

export const createCheckoutSession = async (req, res) => {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return res.status(503).json({ success: false, message: "Payments are not configured on this server." });
    }
    const userId = req.id;
    const { courseId } = req.body || {};
    if (typeof courseId !== "string" || !mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ success: false, message: "Invalid courseId" });
    }

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: "Course not found!" });
    // A draft isn't for sale: without this, anyone who learned an
    // unpublished course's id could buy (and thereby unlock) a course the
    // instructor never released — and the Stripe failure that used to
    // mask it answered a confusing 500 instead of a clean 404.
    if (!course.isPublished) return res.status(404).json({ message: "Course not found!" });

    // Already bought (a COMPLETED purchase exists): don't sell it twice.
    // Pending records from abandoned checkouts do not block a retry.
    const alreadyOwned = await CoursePurchase.findOne({ userId, courseId, status: "completed" });
    if (alreadyOwned) {
      return res.status(400).json({ success: false, message: "You already own this course." });
    }
    // The price ALWAYS comes from the database course — the client sends
    // only the course id, never an amount. A course with no sane price
    // cannot be sold (previously this produced a NaN amount at Stripe).
    if (typeof course.coursePrice !== "number" || !(course.coursePrice > 0)) {
      return res.status(400).json({ success: false, message: "Course is not available for purchase." });
    }

    // Create a new course purchase record
    const newPurchase = new CoursePurchase({
      courseId,
      userId,
      amount: course.coursePrice,
      status: "pending",
    });

    // Create a Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "inr",
            product_data: {
              name: course.courseTitle,
              // Only send images when a thumbnail exists — [undefined]
              // makes Stripe reject the whole session.
              ...(course.courseThumbnail ? { images: [course.courseThumbnail] } : {}),
            },
            unit_amount: course.coursePrice * 100, // Amount in paise (lowest denomination)
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      // ?checkout=success tells the progress page this arrival came from
      // a payment, so it may briefly poll while the webhook lands (the
      // webhook and the browser redirect race each other).
      success_url: `${frontendBaseUrl()}/course-progress/${courseId}?checkout=success&session_id={CHECKOUT_SESSION_ID}`, // once payment successful redirect to course progress page
      cancel_url: `${frontendBaseUrl()}/course-detail/${courseId}`,
      metadata: {
        courseId: courseId,

        userId: userId,
      },
      shipping_address_collection: {
        allowed_countries: ["IN"], // Optionally restrict allowed countries
      },
    });

    if (!session.url) {
      return res
        .status(400)
        .json({ success: false, message: "Error while creating session" });
    }

    // Save the purchase record
    newPurchase.paymentId = session.id;
    await newPurchase.save();

    return res.status(200).json({
      success: true,
      url: session.url, // Return the Stripe checkout URL
    });
  } catch (error) {
    console.error(error?.name || "Error", "-", String(error?.message || "").slice(0, 200));
    // This catch used to only log, so a Stripe failure left the request
    // hanging until the browser gave up.
    return res.status(500).json({ success: false, message: "Failed to create checkout session" });
  }
};

// Marks a purchase completed and enrolls the buyer. Shared by the Stripe
// webhook and the verify-on-return endpoint so both paths behave exactly
// the same. Idempotent: completing an already-completed purchase is a
// no-op, so the webhook and the browser return can race safely.
//
// NOTE: a purchase must never change lecture preview flags — the old
// webhook set isPreviewFree=true on EVERY lecture after the first sale,
// which silently unlocked the whole course for every visitor.
const completePurchase = async (purchase, amountTotal) => {
  if (purchase.status === "completed") return purchase;
  if (amountTotal) purchase.amount = amountTotal / 100;
  purchase.status = "completed";
  await purchase.save();
  const courseId = purchase.courseId?._id || purchase.courseId;
  await User.findByIdAndUpdate(
    purchase.userId,
    { $addToSet: { enrolledCourses: courseId } },
    { new: true }
  );
  await Course.findByIdAndUpdate(
    courseId,
    { $addToSet: { enrolledStudents: purchase.userId } },
    { new: true }
  );
  return purchase;
};

export const stripeWebhook = async (req, res) => {
  let event;

  try {
    const stripe = getStripe();
    const secret = process.env.WEBHOOK_ENDPOINT_SECRET;
    if (!stripe || !secret) {
      return res.status(503).send("Payments are not configured on this server.");
    }
    // Verify the event against the signature header Stripe sent, using the
    // RAW request body (mounted as express.raw in index.js). The old code
    // re-stringified the parsed body and generated its OWN test header —
    // i.e. it "verified" every payload against itself, so anyone could POST
    // a forged checkout.session.completed and get enrolled for free, while
    // genuine Stripe events could not be verified at all.
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers["stripe-signature"],
      secret
    );
  } catch (error) {
    console.error("Webhook error:", error.message);
    return res.status(400).send(`Webhook error: ${error.message}`);
  }

  // Handle the checkout session completed event
  if (event.type === "checkout.session.completed") {
    try {
      const session = event.data.object;

      const purchase = await CoursePurchase.findOne({
        paymentId: session.id,
      }).populate({ path: "courseId" });

      if (!purchase) {
        return res.status(404).json({ message: "Purchase not found" });
      }

      await completePurchase(purchase, session.amount_total);
    } catch (error) {
      console.error("Error handling event:", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }
  res.status(200).send();
};
// Verify-on-return: the browser lands back from Stripe long before the
// webhook is guaranteed to arrive (a sleeping free-tier server can hold
// the webhook up, and Stripe's retries are spaced far apart). Instead of
// making a student who just paid stare at a "confirming" screen, the
// progress page sends the checkout session id here; we ask Stripe
// directly whether it was paid and, if so, complete the purchase through
// the exact same path as the webhook. The webhook stays as the backstop
// for buyers who close the tab before returning.
export const verifyCheckoutSession = async (req, res) => {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return res.status(503).json({ success: false, message: "Payments are not configured on this server." });
    }
    const { sessionId } = req.body || {};
    if (typeof sessionId !== "string" || !sessionId.startsWith("cs_")) {
      return res.status(400).json({ success: false, message: "Invalid sessionId" });
    }
    let session;
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId);
    } catch {
      return res.status(400).json({ success: false, message: "Could not verify this payment session." });
    }
    // The session must belong to the signed-in user — never let one
    // account complete a purchase using another account's session id.
    if (!session.metadata || String(session.metadata.userId) !== String(req.id)) {
      return res.status(403).json({ success: false, message: "This payment session does not belong to your account." });
    }
    if (session.payment_status !== "paid") {
      return res.status(200).json({ success: true, purchased: false });
    }
    const purchase = await CoursePurchase.findOne({ paymentId: session.id });
    if (!purchase) {
      return res.status(404).json({ success: false, message: "Purchase not found" });
    }
    await completePurchase(purchase, session.amount_total);
    return res.status(200).json({ success: true, purchased: true });
  } catch (error) {
    console.error(error?.name || "Error", "-", String(error?.message || "").slice(0, 200));
    return res.status(500).json({ success: false, message: "Failed to verify payment" });
  }
};

export const getCourseDetailWithPurchaseStatus = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.id;

    const course = await Course.findById(courseId)
      // Field allow-list: populating the creator WITHOUT a select embedded
      // the instructor's full user document — password hash included — in
      // this public-to-students response. socialLinks/socialPrivacy are
      // loaded only so the payload can be reduced to the PUBLIC links
      // below — they never leave the server unfiltered.
      .populate({ path: "creator", select: "name photoUrl socialLinks socialPrivacy" })
      .populate({ path: "lectures" });

    if (!course) {
      return res.status(404).json({ message: "course not found!" });
    }

    const isOwner = !!course.creator && String(course.creator._id) === String(userId);
    // Drafts are the creator's private workspace (see course.controller).
    if (!course.isPublished && !isOwner) {
      return res.status(404).json({ message: "course not found!" });
    }

    // Only a COMPLETED purchase counts. An abandoned checkout leaves a
    // "pending" record, and counting it used to unlock the full course —
    // including the progress page — without paying.
    const purchased = await CoursePurchase.findOne({ userId, courseId, status: "completed" });

    // Replace the populated creator with its public summary: identity
    // fields + only the social links the instructor marked public.
    const coursePayload = course.toObject();
    // The buyer roster (enrolledStudents user ids) is the instructor's
    // private data — this public-to-students payload only needs the
    // COUNT for the "students enrolled" line. The id list itself used
    // to ride along to every viewer of the course page, buyer or not.
    coursePayload.enrolledCount = (course.enrolledStudents || []).length;
    delete coursePayload.enrolledStudents;
    if (course.creator) {
      coursePayload.creator = {
        _id: course.creator._id,
        name: course.creator.name,
        photoUrl: course.creator.photoUrl || "",
        socialLinks: publicSocialLinksOf(course.creator),
      };
    }
    // Lecture video URLs are the paid content. A non-buyer (who isn't the
    // creator) receives the lecture list for display — titles, order,
    // preview flags — but the playable URL only for free previews. The
    // page used to receive every video URL and merely hide the buttons.
    if (!purchased && !isOwner) {
      coursePayload.lectures = (coursePayload.lectures || []).map((lecture) =>
        lecture.isPreviewFree ? lecture : { ...lecture, videoUrl: "", publicId: "" }
      );
    }

    return res.status(200).json({
      course: coursePayload,
      purchased: !!purchased, // true if purchased, false otherwise
    });
  } catch (error) {
    console.error(error?.name || "Error", "-", String(error?.message || "").slice(0, 200));
    return res.status(500).json({ message: "Failed to get course details" });
  }
};

export const getAllPurchasedCourse = async (req, res) => {
  try {
    // Scope the feed to the CALLER's own courses. It used to return every
    // completed sale on the whole platform to any instructor — leaking
    // other instructors' revenue and sales counts into their dashboard
    // (and making a fresh instructor's "no sales yet" state unreachable).
    const ownCourses = await Course.find({ creator: req.id }).select("_id");
    const purchasedCourse = await CoursePurchase.find({
      status: "completed",
      courseId: { $in: ownCourses.map((c) => c._id) },
    }).populate("courseId");
    if (!purchasedCourse) {
      return res.status(404).json({
        purchasedCourse: [],
      });
    }
    return res.status(200).json({
      purchasedCourse,
    });
  } catch (error) {
    console.error(error?.name || "Error", "-", String(error?.message || "").slice(0, 200));
    return res.status(500).json({ message: "Failed to get purchased courses" });
  }
};
