const mongoose = require("mongoose");

const gameResultSchema = new mongoose.Schema(
{
    resultId: {
        type: String,
        required: true,
        unique: true
    },

    assessmentId: {
        type: String,
        required: true
    },

    gameId: {
        type: String,
        required: true
    },

    accuracy: Number,

    score: Number,

    averageTime: Number,

    additionalData: {
        type: Object,
        default: {}
    }
},
{
    collection: "game_results"
});

module.exports = mongoose.model("GameResult", gameResultSchema);