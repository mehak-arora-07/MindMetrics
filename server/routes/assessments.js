// Drop into server/routes/assessments.js
// Mount in your main server file with:
//   app.use("/api/assessments", require("./routes/assessments"));
//
// NOTE: your model file is named "Assesment.js" (one "s") per your screenshot —
// the require path below matches that exact filename. If you rename the file,
// update this require to match.

const express = require("express");
const Assessment = require("../models/Assesment");
const Session = require("../models/Sessions");
const verifyToken = require("../middleware/authMiddleware");
const buildMLFeatures = require("../utils/buildMLFeatures");
const router = express.Router();

// Start a new assessment — call this once when a user begins a play session,
// before routing them to the first game.

router.post("/", verifyToken, async(req, res) => {
    try {
        const newAssessment = new Assessment({
            assessmentId: "ASM" + Date.now(),
            userId: req.user.userId,
            status: "In Progress",
        });

        await newAssessment.save();

        res.status(201).json({
            success: true,
            assessment: newAssessment,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
});

// Get one assessment plus every session logged under it so far.
router.get("/:assessmentId", verifyToken, async(req, res) => {
    try {
        const assessment = await Assessment.findOne({
            assessmentId: req.params.assessmentId,
            userId: req.user.userId,
        });

        if (!assessment) {
            return res.status(404).json({
                success: false,
                message: "Assessment not found",
            });
        }

        const sessions = await Session.find({
            assessmentId: req.params.assessmentId,
        });

        res.json({
            success: true,
            assessment,
            sessions,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
});

// List all of the logged-in user's assessments, most recent first.
router.get("/", verifyToken, async(req, res) => {
    try {
        const assessments = await Assessment.find({
            userId: req.user.userId,
        }).sort({ dateTime: -1 });

        res.json({
            success: true,
            assessments,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
});

// Mark an assessment complete and roll up its sessions into an overallScore
// and a gameplayProfile label. Call this once the user finishes every game
// in the assessment.
router.patch("/:assessmentId/complete", verifyToken, async(req, res) => {
    try {
        const sessions = await Session.find({
            assessmentId: req.params.assessmentId,
            userId: req.user.userId,
        });

        if (sessions.length < 10) {
            return res.status(400).json({
                success: false,
                message: "All 10 games must be completed first.",
            });
        }

        const features = buildMLFeatures(sessions);

        console.log("ML features:", features);

        const mlResponse = await fetch(
            "http://127.0.0.1:8000/api/predict/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(features),
            }
        );

        const mlData = await mlResponse.json();

        if (!mlResponse.ok || !mlData.success) {
            return res.status(502).json({
                success: false,
                message: mlData.message ||
                    "Django ML prediction failed",
                mlError: mlData,
            });
        }

        const prediction = mlData.prediction;

        const updated = await Assessment.findOneAndUpdate({
            assessmentId: req.params.assessmentId,
            userId: req.user.userId,
        }, {
            status: "Completed",
            overallScore: prediction.overallScore,
            gameplayProfile: prediction.behaviorProfile,
            predictionConfidence: prediction.confidence,
        }, {
            new: true,
        });

        if (!updated) {
            return res.status(404).json({
                success: false,
                message: "Assessment not found",
            });
        }

        return res.json({
            success: true,
            message: "Assessment completed successfully",
            assessment: updated,
            prediction,
        });
    } catch (err) {
        console.error(
            "Assessment completion error:",
            err
        );

        return res.status(500).json({
            success: false,
            message: "Failed to complete assessment",
            error: err.message,
        });
    }
});

module.exports = router;