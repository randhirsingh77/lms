import mongoose from "mongoose"

const lectureProgressSchema = new mongoose.Schema({
    lectureId:{type:String},
    viewed:{type:Boolean},
    // When the lecture was FIRST marked viewed. Drives learning
    // streaks on the public skill profile. Records created before
    // this field existed have no viewedAt — streaks honestly start
    // counting from when tracking began, never backfilled.
    viewedAt:{type:Date}
});

const courseProgressSchema = new mongoose.Schema({
    userId:{type:String},
    courseId:{type:String},
    completed:{type:Boolean},
    lectureProgress:[lectureProgressSchema]
});

export const CourseProgress = mongoose.model("CourseProgress", courseProgressSchema);