const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();

app.use(cors());
app.use(bodyParser.json());

const mongoURI = 'mongodb://127.0.0.1:27017/sas_db';

mongoose.connect(mongoURI)
    .then(() => console.log("✅ Connected to MongoDB (sas_db)"))
    .catch((err) => console.error("❌ MongoDB Error:", err));

// Schema
const userSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    regNo:    { type: String, unique: true, required: true },
    password: { type: String, required: true }
});
const User = mongoose.model('User', userSchema);

// Test Route
app.get('/', (req, res) => {
    res.send("<h1>✅ SAS Server is Live!</h1><p>Android connection successful!</p>");
});

// Register
app.post('/api/register', async (req, res) => {
    try {
        const { fullName, regNo, password } = req.body;
        const existingUser = await User.findOne({ regNo });
        if (existingUser) {
            return res.status(400).json({ success: false, error: "Namba ya usajili tayari ipo!" });
        }
        const newUser = new User({ fullName, regNo, password });
        await newUser.save();
        res.status(201).json({ success: true, message: "Umesajiliwa!" });
    } catch (error) {
        res.status(500).json({ success: false, error: "Server error: " + error.message });
    }
});

// Login
app.post('/api/login', async (req, res) => {
    try {
        const { regNo, password } = req.body;
        const user = await User.findOne({ regNo, password });
        if (user) {
            res.status(200).json({ success: true, fullName: user.fullName, regNo: user.regNo });
        } else {
            res.status(401).json({ success: false, error: "Namba ya usajili au nywila si sahihi!" });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: "Server error: " + error.message });
    }
});

const PORT = 3000;
const IP = '192.168.100.201'; // IP yako ya WiFi

app.listen(PORT, '0.0.0.0', () => {
    console.log(`------------------------------------------`);
    console.log(`🚀 SAS BACKEND INAFANYA KAZI!`);
    console.log(`🏠 PC:     http://localhost:${PORT}`);
    console.log(`📱 SIMU:   http://${IP}:${PORT}`);
    console.log(`------------------------------------------`);
});