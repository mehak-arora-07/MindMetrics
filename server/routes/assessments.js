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

const router = express.Router();

// Start a new assessment — call this once when a user begins a play session,
// before routing them to the first game.

router.post("/", verifyToken, async (req, res) => {
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
router.get("/:assessmentId", verifyToken, async (req, res) => {
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
router.get("/", verifyToken, async (req, res) => {
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
router.patch("/:assessmentId/complete", verifyToken, async (req, res) => {
  try {
    const sessions = await Session.find({
      assessmentId: req.params.assessmentId,
      userId: req.user.userId,
    });

    if (sessions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No sessions found for this assessment — nothing to complete.",
      });
    }

    const overallScore = Math.round(
      sessions.reduce((sum, s) => sum + s.accuracy, 0) / sessions.length
    );

    // Placeholder profile logic — replace with your real scoring model
    // once you know what "gameplayProfile" values you actually want.
    let gameplayProfile = "Balanced";
    if (overallScore >= 80) gameplayProfile = "Sharp";
    else if (overallScore < 50) gameplayProfile = "Developing";

    const updated = await Assessment.findOneAndUpdate(
      { assessmentId: req.params.assessmentId, userId: req.user.userId },
      { status: "Completed", overallScore, gameplayProfile },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Assessment not found",
      });
    }

    res.json({
      success: true,
      assessment: updated,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

module.exports = router;