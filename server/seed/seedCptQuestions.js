// server/seed/seedCptQuestions.js
//
// Run once to load the CPT rule bank into MongoDB.
// Usage:
//   node seed/seedCptQuestions.js
//
// Requires MONGO_URI in server/.env (same one your app already uses).

require("dotenv").config();
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const dns = require("dns");

// Same DNS fix used in index.js — this script is a separate process
// and doesn't inherit it automatically.
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Question = require("../models/QuestionBank");

async function seed() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    const filePath = path.join(__dirname, "cpt_question_bank.json");
    const questions = JSON.parse(fs.readFileSync(filePath, "utf-8"));

    // Remove old CPT rules first so re-running this script doesn't duplicate entries
    await Question.deleteMany({ gameId: "cpt" });

    await Question.insertMany(questions);
    console.log(`Inserted ${questions.length} CPT rules into "${Question.collection.collectionName}"`);

    await mongoose.disconnect();
    console.log("Done");
}

seed().catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
});