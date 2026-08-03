const mongoose = require("mongoose");

const assessmentSchema = new mongoose.Schema({
    assessmentId: {
        type: String,
        required: true,
        unique: true,
    },

    userId: {
        type: String,
        required: true,
    },

    dateTime: {
        type: Date,
        default: Date.now,
    },

    overallScore: {
        type: Number,
        default: null,
    },

    gameplayProfile: {
        type: String,
        default: null,
    },

    predictionConfidence: {
        type: Number,
        default: null,
    },

    status: {
        type: String,
        enum: ["In Progress", "Completed"],
        default: "In Progress",
    },
}, {
    collection: "assessments",
});

module.exports = mongoose.model("Assessment", assessmentSchema);