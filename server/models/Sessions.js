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
        default: Date.now
    }

},
{
    collection: "sessions"
});

module.exports = mongoose.model("Sessions", sessionSchema);