const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

router.get("/", (req, res) => {
    res.send("Auth Route Working!");
});

router.post("/register", async (req, res) => {
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
module.exports = router;