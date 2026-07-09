const mongoose = require("mongoose");

const predictionSchema = new mongoose.Schema(
{
    predictionId: {
        type: String,
        required: true,
        unique: true
    },

    assessmentId: {
        type: String,
        required: true
    },

    visualMemory: Number,

    logicalThinking: Number,

    planning: Number,

    decisionMaking: Number,

    processingSpeed: Number,

    cognitiveFlexibility: Number,

    eyeCoordination: Number,

    impulseControl: Number,

    overallScore: Number,

    profile: String,

    createdAt: {
        type: Date,
        default: Date.now
    }
},
{
    collection: "predictions"
});

module.exports = mongoose.model("Prediction", predictionSchema);