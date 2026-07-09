const mongoose = require("mongoose");

const gameConfigSchema = new mongoose.Schema(
{
    gameId: {
        type: String,
        required: true,
        unique: true
    },

    gameName: {
        type: String,
        required: true
    },

    timeLimit: Number,

    maxLevel: Number,

    maxScore: Number,

    visibleTime: Number,

    rules: String
},
{
    collection: "game_config"
});

module.exports = mongoose.model("GameConfig", gameConfigSchema);