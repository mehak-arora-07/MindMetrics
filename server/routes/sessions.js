const express = require("express");
const Session = require("../models/Sessions");
const verifyToken = require("../middleware/authMiddleware");

const router = express.Router();

//route

router.post("/", verifyToken, async (req, res) => {

    try {

        const {

            assessmentId,
            gameId,
            accuracy,
            avgTimeMs,
            metrics,
            completed

        } = req.body;

        const newSession = new Session({

            sessionId: "SES" + Date.now(),

            userId: req.user.userId,

            assessmentId,

            gameId,

            accuracy,

            avgTimeMs,

            metrics,

            completed

        });

        await newSession.save();

        res.status(201).json({

            success: true,

            message: "Session Saved Successfully"

        });

    } catch (err) {

        console.error(err);

        res.status(500).json({

            success: false,

            error: err.message

        });

    }

});

router.get("/", verifyToken, async (req, res) => {

    try {

        const sessions = await Session.find({

            userId: req.user.userId

        });

        res.json({

            success: true,

            sessions

        });

    } catch (err) {

        res.status(500).json({

            success: false,

            error: err.message

        });

    }

});

module.exports = router;