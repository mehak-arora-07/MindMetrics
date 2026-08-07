
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
        const oldIncomplete = await Assessment.find({
  userId: req.user.userId,
  status: "In Progress",
});

const oldIds = oldIncomplete.map(
  (assessment) => assessment.assessmentId
);

if (oldIds.length > 0) {
  await Session.deleteMany({
    userId: req.user.userId,
    assessmentId: { $in: oldIds },
  });

  await Assessment.deleteMany({
    userId: req.user.userId,
    status: "In Progress",
  });
}
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

router.delete("/cleanup/incomplete", verifyToken, async (req, res) => {
  try {
    const incompleteAssessments = await Assessment.find({
      userId: req.user.userId,
      status: "In Progress",
    });

    const incompleteIds = incompleteAssessments.map(
      (assessment) => assessment.assessmentId
    );

    if (incompleteIds.length > 0) {
      await Session.deleteMany({
        userId: req.user.userId,
        assessmentId: { $in: incompleteIds },
      });

      await Assessment.deleteMany({
        userId: req.user.userId,
        status: "In Progress",
      });
    }

    return res.json({
      success: true,
      message: "Incomplete assessments removed",
    });
  } catch (err) {
    console.error("Cleanup error:", err);

    return res.status(500).json({
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
             status: "Completed",
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
  status: "Completed",
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
router.get("/:assessmentId/details", verifyToken, async(req, res) => {
    try {

        const assessment = await Assessment.findOne({
            assessmentId: req.params.assessmentId,
            userId: req.user.userId
        });

        if (!assessment) {
            return res.status(404).json({
                success: false,
                message: "Assessment not found"
            });
        }

        const sessions = await Session.find({
            assessmentId: req.params.assessmentId
        });

        res.json({
            success: true,
            assessment,
            sessions
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message
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
            `${process.env.ML_API_URL}/api/predict/`, {
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
router.get("/:assessmentId/details", verifyToken, async (req, res) => {
  try {

    const assessment = await Assessment.findOne({
      assessmentId: req.params.assessmentId,
      userId: req.user.userId
    });

    if (!assessment) {
      return res.status(404).json({
        success:false,
        message:"Assessment not found"
      });
    }

    const sessions = await Session.find({
      assessmentId:req.params.assessmentId
    });

    res.json({
      success:true,
      assessment,
      sessions
    });

  } catch(err){
      res.status(500).json({
          success:false,
          error:err.message
      });
  }
});

module.exports = router;