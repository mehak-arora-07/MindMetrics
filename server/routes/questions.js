const express = require("express");
const Question = require("../models/QuestionBank");

const router = express.Router();

router.get("/:gameId", async (req, res) => {

    try {

        const questions = await Question.find({
            gameId: req.params.gameId
        });

        res.json({
            success: true,
            questions
        });

    } catch (err) {

        res.status(500).json({
            success: false,
            error: err.message
        });

    }

});

module.exports = router;