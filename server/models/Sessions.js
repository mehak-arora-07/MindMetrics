const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema({

    sessionId: {
        type: String,
        required: true,
        unique: true
    },

    userId: {
        type: String,
        required: true
    },

    assessmentId: {
        type: String,
        required: true
    },

    gameId: {
        type: String,
        required: true
    },

    accuracy: {
        type: Number,
        required: true
    },

    avgTimeMs: {
        type: Number,
        required: true
    },

    metrics: {
        type: Object,
        required: true
    },

    completed: {
        type: Boolean,
        default: true
    },

    createdAt: {
        type: Date,
        default: () => {
            return new Date().toLocaleString("en-IN", {
                timeZone: "Asia/Kolkata",
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: false
            });
        }
    }

}, {
    collection: "sessions"
});

module.exports = mongoose.model("Sessions", sessionSchema);