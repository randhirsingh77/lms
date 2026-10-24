 
import fs from "node:fs";
import { Course } from "../models/course.model.js";
import { Lecture } from "../models/lecture.model.js";
import { Category, categoryKeyOf } from "../models/category.model.js";
import {deleteMediaFromCloudinary, deleteVideoFromCloudinary, uploadMedia} from "../utils/cloudinary.js";

export const createCourse = async (req,res) => {
    try {
        const {courseTitle, category} = req.body || {};
        if(typeof courseTitle !== "string" || !courseTitle.trim() || courseTitle.length > 200 ||
           typeof category !== "string" || !category.trim() || category.length > 100) {
            return res.status(400).json({
                message:"Course title and category is required."
            })
        }

        const course = await Course.create({
            courseTitle,
            category,
            creator:req.id
        });

        return res.status(201).json({
            course,
            message:"Course created."
        })
    } catch (error) {
        console.error(error?.name || "Error", "-", String(error?.message || "").slice(0, 200));
        return res.status(500).json({
            message:"Failed to create course"
        })
    }
}

// ---------------------------------------------------------------------------
// Categories: the built-in list (same values the client helper ships) plus
// whatever instructors create. One list for course forms AND search
// filters, served from GET /categories so the two can never drift apart
// again (they used to be two hand-copied arrays).
// ---------------------------------------------------------------------------
export const BUILT_IN_CATEGORIES = [
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

export const getCategories = async (req, res) => {
    try {
        const created = await Category.find({}).sort({ name: 1 }).lean();
        const seen = new Set(BUILT_IN_CATEGORIES.map((c) => categoryKeyOf(c.value)));
        const merged = [...BUILT_IN_CATEGORIES];
        for (const c of created) {
            if (seen.has(c.nameKey)) continue;
            seen.add(c.nameKey);
            merged.push({ value: c.name, label: c.name });
        }
        merged.sort((a, b) => a.label.localeCompare(b.label));
        return res.status(200).json({ success: true, categories: merged });
    } catch (error) {
        console.error(error?.name || "Error", "-", String(error?.message || "").slice(0, 200));
        return res.status(500).json({
            success: false,
            message: "Failed to load categories",
        });
    }
};

export const createCategory = async (req, res) => {
    try {
        const { name } = req.body || {};
        if (typeof name !== "string" || !name.trim() || name.trim().length < 2 || name.trim().length > 100) {
            return res.status(400).json({
                success: false,
                message: "Category name must be between 2 and 100 characters.",
            });
        }
        const cleanName = name.trim().replace(/\s+/g, " ");
        const nameKey = categoryKeyOf(cleanName);
        if (!nameKey) {
            return res.status(400).json({
                success: false,
                message: "Category name must contain letters or numbers.",
            });
        }
        // A name that only re-spells a built-in (or an existing created
        // category) is a duplicate, not a new category.
        if (BUILT_IN_CATEGORIES.some((c) => categoryKeyOf(c.value) === nameKey)) {
            return res.status(409).json({
                success: false,
                message: "That category already exists.",
            });
        }
        const category = await Category.create({ name: cleanName, nameKey, createdBy: req.id });
        return res.status(201).json({
            success: true,
            category: { value: category.name, label: category.name },
            message: "Category created.",
        });
    } catch (error) {
        if (error?.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "That category already exists.",
            });
        }
        console.error(error?.name || "Error", "-", String(error?.message || "").slice(0, 200));
        return res.status(500).json({
            success: false,
            message: "Failed to create category",
        });
    }
};

// Escape user text before putting it into a Mongo $regex — an unbalanced
// character like "(" used to make the query throw, and the catch below
// never responded, so the search request hung forever.
const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Ownership guard for course mutations: any logged-in user used to be able
// to edit, publish or add lectures to SOMEONE ELSE'S course.
const assertCourseOwner = (course, req, res) => {
    if (!course) {
        res.status(404).json({ message: "Course not found!" });
        return false;
    }
    if (String(course.creator) !== String(req.id)) {
        res.status(403).json({ message: "You can only manage your own courses." });
        return false;
    }
    return true;
};

// Read-access helpers (bug-hunt round): ownership was enforced on WRITES
// but several READ endpoints handed drafts and paid content to any
// logged-in account. The rules now:
//  - an UNPUBLISHED course is visible only to its creator (404 to anyone
//    else, so its existence isn't even confirmed);
//  - a published course's identity is public, but its non-preview
//    lectures (and their video URLs) belong to the creator and to
//    enrolled students.
const isCourseOwner = (course, req) => String(course.creator) === String(req.id);
const isEnrolledIn = (course, req) =>
    (course.enrolledStudents || []).some((id) => String(id) === String(req.id));

export const searchCourse = async (req,res) => {
    try {
        const {query = "", categories, sortByPrice =""} = req.query;
        // Cap the search text: the regex runs over three fields on every
        // published course, so an unbounded query is a cheap DoS handle.
        const safeQuery = escapeRegExp(String(query).slice(0, 200));

        // create search query
        const searchCriteria = {
            isPublished:true,
            $or:[
                {courseTitle: {$regex:safeQuery, $options:"i"}},
                {subTitle: {$regex:safeQuery, $options:"i"}},
                {category: {$regex:safeQuery, $options:"i"}},
            ]
        }

        // The client sends categories as ONE comma-separated string
        // ("nextjs,python"). It used to be passed straight into $in, so
        // selecting 2+ categories matched nothing. Split it, and match
        // case-insensitively because older courses were stored with
        // display-case categories ("Next JS") while the filter uses ids
        // ("nextjs").
        const categoryList = (Array.isArray(categories) ? categories.join(",") : categories || "")
            .split(",")
            .map((c) => c.trim())
            .filter(Boolean);
        if(categoryList.length > 0) {
            // Match ignoring case AND spaces: filter id "nextjs" must find a
            // course stored with the display label "Next JS".
            const categoryPattern = (c) =>
                new RegExp(
                    "^" + escapeRegExp(c).replace(/\s+/g, "").split("").map(escapeRegExp).join("\\s*") + "$",
                    "i"
                );
            searchCriteria.category = { $in: categoryList.map(categoryPattern) };
        }

        // define sorting order
        const sortOptions = {};
        if(sortByPrice === "low"){
            sortOptions.coursePrice = 1;//sort by price in ascending
        }else if(sortByPrice === "high"){
            sortOptions.coursePrice = -1; // descending
        }

        // select("-enrolledStudents"): the result rows used to embed the
        // raw list of enrolled students' user ids — nobody consuming
        // search results needs it, and a public catalogue must not hand
        // out the roster of who bought what.
        let courses = await Course.find(searchCriteria).select("-enrolledStudents").populate({path:"creator", select:"name photoUrl"}).sort(sortOptions);

        return res.status(200).json({
            success:true,
            courses: courses || []
        });

    } catch (error) {
        console.error(error?.name || "Error", "-", String(error?.message || "").slice(0, 200));
        return res.status(500).json({
            success:false,
            message:"Failed to search courses"
        })
    }
}

export const getPublishedCourse = async (_,res) => {
    try {
        // Same roster concern as search: this endpoint is UNAUTHENTICATED,
        // so enrolledStudents (buyer user ids) is excluded from the payload.
        const courses = await Course.find({isPublished:true}).select("-enrolledStudents").populate({path:"creator", select:"name photoUrl"});
        if(!courses){
            return res.status(404).json({
                message:"Course not found"
            })
        }
        return res.status(200).json({
            courses,
        })
    } catch (error) {
        console.error(error?.name || "Error", "-", String(error?.message || "").slice(0, 200));
        return res.status(500).json({
            message:"Failed to get published courses"
        })
    }
}
export const getCreatorCourses = async (req,res) => {
    try {
        const userId = req.id;
        const courses = await Course.find({creator:userId});
        if(!courses){
            return res.status(404).json({
                courses:[],
                message:"Course not found"
            })
        };
        return res.status(200).json({
            courses,
        })
    } catch (error) {
        console.error(error?.name || "Error", "-", String(error?.message || "").slice(0, 200));
        return res.status(500).json({
            message:"Failed to get creator courses"
        })
    }
}
export const editCourse = async (req,res) => {
    try {
        const courseId = req.params.courseId;
        const {courseTitle, subTitle, description, category, courseLevel, coursePrice} = req.body;
        const thumbnail = req.file;

        let course = await Course.findById(courseId);
        if(!assertCourseOwner(course, req, res)) return;
        let courseThumbnail;
        if(thumbnail){
            if(course.courseThumbnail){
                const publicId = course.courseThumbnail.split("/").pop().split(".")[0];
                await deleteMediaFromCloudinary(publicId); // delete old image
            }
            // upload a thumbnail on clourdinary — a provider failure used
            // to escape as the generic "Failed to update course" 500 and
            // leak the temp file; report the real reason and clean up.
            try {
                courseThumbnail = await uploadMedia(thumbnail.path);
            } catch {
                courseThumbnail = null;
            }
            fs.unlink(thumbnail.path, () => {}); // temp copy no longer needed
            if(!courseThumbnail?.secure_url){
                return res.status(500).json({
                    message:"Failed to upload course thumbnail"
                })
            }
        }

        // Multipart forms carry only strings, and unset fields arrive as the
        // literal text "undefined" — storing that (or casting it to Number)
        // used to fail the whole save with a 500. Only update fields that
        // carry a real value.
        const clean = (v) => (v === undefined || v === "" || v === "undefined" ? undefined : v);
        const updateData = {};
        const textFields = {courseTitle, subTitle, description, category, courseLevel};
        for (const [key, value] of Object.entries(textFields)) {
            const v = clean(value);
            // Only strings may be stored in string fields (an object here
            // is a mass-assignment / cast attack, not a real form value).
            if (v !== undefined && typeof v === "string") updateData[key] = v;
        }
        const price = clean(coursePrice);
        if (price !== undefined && !Number.isNaN(Number(price)) && Number(price) >= 0) {
            updateData.coursePrice = Number(price);
        }
        if (courseThumbnail?.secure_url) {
            updateData.courseThumbnail = courseThumbnail.secure_url;
        }

        // runValidators: updates bypass schema validators by default, so
        // the courseLevel enum (and any future rule) was not enforced here.
        course = await Course.findByIdAndUpdate(courseId, updateData, {new:true, runValidators:true});

        return res.status(200).json({
            course,
            message:"Course updated successfully."
        })

    } catch (error) {
        console.error(error?.name || "Error", "-", String(error?.message || "").slice(0, 200));
        return res.status(500).json({
            message:"Failed to update course"
        })
    }
}
export const getCourseById = async (req,res) => {
    try {
        const {courseId} = req.params;

        const course = await Course.findById(courseId);

        // A draft is the creator's private workspace: anyone else gets
        // the same 404 as a course that doesn't exist.
        if(!course || (!course.isPublished && !isCourseOwner(course, req))){
            return res.status(404).json({
                message:"Course not found!"
            })
        }
        return res.status(200).json({
            course
        })
    } catch (error) {
        console.error(error?.name || "Error", "-", String(error?.message || "").slice(0, 200));
        return res.status(500).json({
            message:"Failed to get course by id"
        })
    }
}

export const createLecture = async (req,res) => {
    try {
        const {lectureTitle} = req.body || {};
        const {courseId} = req.params;

        if(typeof lectureTitle !== "string" || !lectureTitle.trim() || lectureTitle.length > 200 || !courseId){
            return res.status(400).json({
                message:"Lecture title is required"
            })
        };

        // Find the course FIRST: a lecture for a missing course used to be
        // created anyway (orphaned in the DB) and still answered 201.
        const course = await Course.findById(courseId);
        if(!assertCourseOwner(course, req, res)) return;

        // create lecture
        const lecture = await Lecture.create({lectureTitle});
        course.lectures.push(lecture._id);
        await course.save();

        return res.status(201).json({
            lecture,
            message:"Lecture created successfully."
        });

    } catch (error) {
        console.error(error?.name || "Error", "-", String(error?.message || "").slice(0, 200));
        return res.status(500).json({
            message:"Failed to create lecture"
        })
    }
}
export const getCourseLecture = async (req,res) => {
    try {
        const {courseId} = req.params;
        const course = await Course.findById(courseId).populate("lectures");
        if(!course || (!course.isPublished && !isCourseOwner(course, req))){
            return res.status(404).json({
                message:"Course not found"
            })
        }
        // Full lecture list (with video URLs) only for the creator and
        // enrolled students. Everyone else sees the free previews — the
        // lectures themselves are the product being sold.
        const lectures = (isCourseOwner(course, req) || isEnrolledIn(course, req))
            ? course.lectures
            : course.lectures.filter((lecture) => lecture.isPreviewFree);
        return res.status(200).json({
            lectures
        });

    } catch (error) {
        console.error(error?.name || "Error", "-", String(error?.message || "").slice(0, 200));
        return res.status(500).json({
            message:"Failed to get lectures"
        })
    }
}
export const editLecture = async (req,res) => {
    try {
        const {lectureTitle, videoInfo, isPreviewFree} = req.body;
        
        const {courseId, lectureId} = req.params;
        const lecture = await Lecture.findById(lectureId);
        if(!lecture){
            return res.status(404).json({
                message:"Lecture not found!"
            })
        }

        // The course in the URL must exist and belong to the caller —
        // checked BEFORE anything is changed.
        const course = await Course.findById(courseId);
        if(!assertCourseOwner(course, req, res)) return;

        // The lecture must actually belong to THAT course. Without this
        // check, pairing any lecture id with a course you own let you
        // edit (and graft into your course) a lecture from someone
        // else's course.
        if(!(course.lectures || []).some((id) => String(id) === String(lectureId))){
            return res.status(404).json({
                message:"Lecture not found in this course!"
            })
        }

        // update lecture (string fields accept strings only)
        if(typeof lectureTitle === "string" && lectureTitle.trim()) lecture.lectureTitle = lectureTitle;
        if(typeof videoInfo?.videoUrl === "string") lecture.videoUrl = videoInfo.videoUrl;
        if(typeof videoInfo?.publicId === "string") lecture.publicId = videoInfo.publicId;
        if(typeof isPreviewFree === "boolean") lecture.isPreviewFree = isPreviewFree;

        await lecture.save();
        return res.status(200).json({
            lecture,
            message:"Lecture updated successfully."
        })
    } catch (error) {
        console.error(error?.name || "Error", "-", String(error?.message || "").slice(0, 200));
        return res.status(500).json({
            message:"Failed to edit lectures"
        })
    }
}
export const removeLecture = async (req,res) => {
    try {
        const {lectureId} = req.params;
        const lecture = await Lecture.findById(lectureId);
        if(!lecture){
            return res.status(404).json({
                message:"Lecture not found!"
            });
        }
        // Ownership: only the creator of the course that owns this lecture
        // may delete it. A lecture no course references has no verifiable
        // owner — it used to skip the check entirely and be deletable by
        // ANY logged-in account, so it is refused like a missing lecture.
        const ownerCourse = await Course.findOne({lectures:lectureId});
        if(!ownerCourse){
            return res.status(404).json({
                message:"Lecture not found!"
            });
        }
        if(!assertCourseOwner(ownerCourse, req, res)) return;

        // Order of operations (chosen so a Cloudinary problem can never
        // strand a half-deleted lecture):
        //  1. Delete the uploaded video while we still know its publicId.
        //     deleteVideoFromCloudinary treats an already-missing asset as
        //     success and logs+swallows provider errors — the file delete
        //     is best-effort and its outcome is only logged.
        //  2. Delete the DB record AND pull the course's reference, so the
        //     lecture is actually gone (the old order deleted the record
        //     first and then AWAITED the provider call — any failure or
        //     timeout there answered 500 after partial work, the client
        //     kept showing the lecture, and a retry found a dangling
        //     course reference with no lecture behind it).
        // A 200 from this endpoint now means the lecture record and the
        // reference are both gone; a repeat delete is a clean 404.
        if(lecture.publicId){
            await deleteVideoFromCloudinary(lecture.publicId);
        }
        await Lecture.findByIdAndDelete(lectureId);
        if(ownerCourse){
            await Course.updateOne(
                {_id: ownerCourse._id},
                {$pull:{lectures:lectureId}}
            );
        }

        return res.status(200).json({
            message:"Lecture removed successfully."
        })
    } catch (error) {
        console.error(error?.name || "Error", "-", String(error?.message || "").slice(0, 200));
        return res.status(500).json({
            message:"Failed to remove lecture"
        })
    }
}
export const getLectureById = async (req,res) => {
    try {
        const {lectureId} = req.params;
        const lecture = await Lecture.findById(lectureId);
        if(!lecture){
            return res.status(404).json({
                message:"Lecture not found!"
            });
        }
        // Same read rules as the lecture list: creator + enrolled get any
        // lecture; anyone else only a free preview of a published course.
        // The video URL lives on this document, so an open endpoint here
        // handed the whole paid catalogue to any account.
        const ownerCourse = await Course.findOne({lectures:lectureId});
        const allowed = !!ownerCourse && (
            isCourseOwner(ownerCourse, req) ||
            isEnrolledIn(ownerCourse, req) ||
            (ownerCourse.isPublished && lecture.isPreviewFree)
        );
        if(!allowed){
            return res.status(403).json({
                message:"Please purchase this course to access its lectures."
            });
        }
        return res.status(200).json({
            lecture
        });
    } catch (error) {
        console.error(error?.name || "Error", "-", String(error?.message || "").slice(0, 200));
        return res.status(500).json({
            message:"Failed to get lecture by id"
        })
    }
}


// publich unpublish course logic

export const togglePublishCourse = async (req,res) => {
    try {
        const {courseId} = req.params;
        const {publish} = req.query; // true, false
        const course = await Course.findById(courseId);
        if(!assertCourseOwner(course, req, res)) return;
        // publish status based on the query paramter
        course.isPublished = publish === "true";
        await course.save();

        const statusMessage = course.isPublished ? "Published" : "Unpublished";
        return res.status(200).json({
            message:`Course is ${statusMessage}`
        });
    } catch (error) {
        console.error(error?.name || "Error", "-", String(error?.message || "").slice(0, 200));
        return res.status(500).json({
            message:"Failed to update status"
        })
    }
}
