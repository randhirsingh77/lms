 
import fs from "node:fs";
import { Course } from "../models/course.model.js";
import { Lecture } from "../models/lecture.model.js";
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

        let courses = await Course.find(searchCriteria).populate({path:"creator", select:"name photoUrl"}).sort(sortOptions);

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
        const courses = await Course.find({isPublished:true}).populate({path:"creator", select:"name photoUrl"});
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
            // upload a thumbnail on clourdinary
            courseThumbnail = await uploadMedia(thumbnail.path);
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

        if(!course){
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
        if(!course){
            return res.status(404).json({
                message:"Course not found"
            })
        }
        return res.status(200).json({
            lectures: course.lectures
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

        // update lecture (string fields accept strings only)
        if(typeof lectureTitle === "string" && lectureTitle.trim()) lecture.lectureTitle = lectureTitle;
        if(typeof videoInfo?.videoUrl === "string") lecture.videoUrl = videoInfo.videoUrl;
        if(typeof videoInfo?.publicId === "string") lecture.publicId = videoInfo.publicId;
        if(typeof isPreviewFree === "boolean") lecture.isPreviewFree = isPreviewFree;

        await lecture.save();

        // Ensure the course still has the lecture id if it was not aleardy added;
        if(course && !course.lectures.includes(lecture._id)){
            course.lectures.push(lecture._id);
            await course.save();
        };
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
        // Ownership: only the creator of the course that owns this lecture
        // may delete it.
        const ownerCourse = await Course.findOne({lectures:lectureId});
        if(ownerCourse && !assertCourseOwner(ownerCourse, req, res)) return;
        const lecture = await Lecture.findByIdAndDelete(lectureId);
        if(!lecture){
            return res.status(404).json({
                message:"Lecture not found!"
            });
        }
        // delete the lecture from couldinary as well
        if(lecture.publicId){
            await deleteVideoFromCloudinary(lecture.publicId);
        }

        // Remove the lecture reference from the associated course
        await Course.updateOne(
            {lectures:lectureId}, // find the course that contains the lecture
            {$pull:{lectures:lectureId}} // Remove the lectures id from the lectures array
        );

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
