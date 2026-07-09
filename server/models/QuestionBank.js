const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema(
{
    questionId: {
        type: String,
        required: true,
        unique: true
    },

    gameType: {
        type: String,
        required: true
    },

    difficulty: {
        type: String,
        enum: ["Easy","Medium","Hard"]
    },

    data: {
        type: Object,
        required: true
    }
},
{
    collection: "question_bank"
});

module.exports = mongoose.model("QuestionBank", questionSchema);