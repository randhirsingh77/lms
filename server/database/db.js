import mongoose from "mongoose";

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');
    } catch (error) {
        // Fail fast: a server with no database answers 500s (or hangs) on
        // every route. Crashing at boot makes the host restart/alert
        // instead of quietly serving a broken app. Only the message is
        // logged — never the connection string (it carries credentials).
        console.error("MongoDB connection failed:", String(error?.message || "").slice(0, 200));
        process.exit(1);
    }
}
export default connectDB;
