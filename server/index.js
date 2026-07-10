    require('dotenv').config();
    const express = require('express');
    const cors = require('cors');
    const mongoose = require('mongoose');
    const dns = require('dns');
    dns.setServers(['8.8.8.8', '8.8.4.4']);

    const authRoutes = require("./routes/auth");
    const app = express();
    app.use(cors());
    app.use(express.json());

    app.use((req, res, next) => {
        console.log(`${req.method} ${req.url}`);
        next();
    });

    app.get("/", (req, res) => {
        res.send("Server Working");
    });

    app.use("/api/auth", authRoutes);
    app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

    const sessionRoutes = require("./routes/sessions");
    app.use("/api/sessions", sessionRoutes);

    const questionRoutes = require("./routes/questions");
    app.use("/api/questions", questionRoutes);


    console.log('MONGO_URI is:', process.env.MONGO_URI);
    mongoose.connect(process.env.MONGO_URI)
        .then(() => console.log('MongoDB connected'))
        .catch(err => console.error(err));

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`Server running on ${PORT}`));