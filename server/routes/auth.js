const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const verifyToken = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", (req, res) => {
    res.send("Auth Route Working!");
});

// register
router.post("/register", async(req, res) => {
    try {

        console.log("1. Route hit");

        const { name, email, password } = req.body;

        console.log("2. Body received", req.body);

        const existingUser = await User.findOne({ email });

        console.log("3. Checked existing user");

        if (existingUser) {
            return res.status(400).json({
                message: "Email already exists"
            });
        }

        console.log("4. Hashing");

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        console.log("5. Creating user");

        const newUser = new User({
            userId: "USR" + Date.now(),
            name,
            email,
            password: hashedPassword
        });

        console.log("6. Saving");

        const savedUser = await newUser.save();

        console.log(savedUser);

        console.log("7. Saved");

        res.status(201).json({
            success: true,
            message: "User Registered Successfully"
        });

    } catch (err) {

        console.error("========== ERROR ==========");
        console.error(err);
        console.error("Message:", err.message);
        console.error("===========================");

        res.status(500).json({
            success: false,
            error: err.message
        });

    }
});

//login
router.post("/login", async(req, res) => {
    try {

        console.log("1. Login route hit");

        const { email, password } = req.body;

        console.log("2. Body received", req.body);

        // Check if user exists
        const user = await User.findOne({ email });

        console.log("3. User searched");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        console.log("4. Comparing password");

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid password"
            });
        }

        console.log("5. Generating JWT");

        // Generate JWT Token
        const token = jwt.sign({
                userId: user.userId,
                email: user.email
            },
            process.env.JWT_SECRET, {
                expiresIn: "7d"
            }
        );

        console.log("6. Login successful");

        res.status(200).json({
            success: true,
            message: "Login Successful",
            token,
            user: {
                userId: user.userId,
                name: user.name,
                email: user.email
            }
        });

    } catch (err) {

        console.error("LOGIN ERROR");
        console.error(err);

        res.status(500).json({
            success: false,
            error: err.message
        });

    }
});

// update profile (currently just name — email changes usually need a
// verification flow, so that's left out on purpose)
router.patch("/profile", verifyToken, async(req, res) => {
    try {

        const { name } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: "Name is required"
            });
        }

        const updatedUser = await User.findOneAndUpdate(
            { userId: req.user.userId },
            { $set: { name: name.trim() } },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            user: {
                userId: updatedUser.userId,
                name: updatedUser.name,
                email: updatedUser.email
            }
        });

    } catch (err) {

        console.error("PROFILE UPDATE ERROR");
        console.error(err);

        res.status(500).json({
            success: false,
            error: err.message
        });

    }
});

// change password
router.post("/change-password", verifyToken, async(req, res) => {
    try {

        const { oldPassword, newPassword } = req.body;

        if (!oldPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: "Both current and new password are required"
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: "New password must be at least 6 characters"
            });
        }

        const user = await User.findOne({ userId: req.user.userId });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const isMatch = await bcrypt.compare(oldPassword, user.password);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Current password is incorrect"
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        user.password = hashedPassword;
        await user.save();

        res.status(200).json({
            success: true,
            message: "Password changed successfully"
        });

    } catch (err) {

        console.error("CHANGE PASSWORD ERROR");
        console.error(err);

        res.status(500).json({
            success: false,
            error: err.message
        });

    }
});

//logout
router.post("/logout", (req, res) => {

    res.status(200).json({
        success: true,
        message: "Logout Successful"
    });

});


module.exports = router;