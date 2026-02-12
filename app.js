
const express = require("express");
const app = express();
const path = require("path");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
require("dotenv").config();

// Middleware
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(cookieParser());

//database connection
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log("MongoDB connected");
}).catch(err => {
    console.error("MongoDB connection error:", err);
});



// Models
const userModel = require("./models/user");
const userDetailModel = require("./models/userdetail");
const connectionModel = require("./models/connection");
const doctordb = require("./models/doctor/doctordb");
const doctordetail = require("./models/doctor/doctordetail");

// Routes
app.get("/", (req, res) => res.render("home"));
app.get("/aboutus", (req, res) => res.render("about"));
app.get("/finddoctor", (req, res) => res.render("finddoctor"));
app.get("/doctorlogin", (req, res) => res.render("login"));

// Create User
app.post("/createUser", async (req, res) => {
    const { email, password } = req.body;

    try {
        let user = await userModel.findOne({ email });
        if (user) {
            const match = await bcrypt.compare(password, user.password);
            if (match) {
                let token = jwt.sign({ userId: user._id, email }, process.env.SECRET_KEY);
                res.cookie("token", token);
                return res.redirect("/doctor");
            } else {
                return res.status(401).send("Invalid Email or Password");
            }
        }

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);
        let createdUser = await userModel.create({ email, password: hash });

        let token = jwt.sign({ userId: createdUser._id, email }, process.env.SECRET_KEY);
        res.cookie("token", token);
        res.redirect("/registration");
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
});

// User Detail
app.post("/userDetail", async (req, res) => {
    try {
        const token = req.cookies.token;
        const { userId } = jwt.verify(token, process.env.SECRET_KEY);
        const { name, phone, dob, gender } = req.body;

        await userDetailModel.create({ userId, name, phone, dob, gender });
        res.redirect("/congrats");
    } catch (error) {
        res.status(400).send({ error: error.message });
    }
});

app.get("/congrats", (req, res) => res.render("congrats"));

// Find Doctor
app.get("/finddoctor", isLoggedin, async (req, res) => {
    try {
        const specialization = req.query.specialization;
        let doctors = specialization ? await doctordetail.find({ specialization }) : await doctordetail.find();
        res.render("finddoctor", { doctors, selectedSpecialization: specialization });
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
});

// Chat Page
app.get("/chatPage", isLoggedin, async (req, res) => {
    try {
        const currentUserId = req.user.userId;
        const userConnections = await connectionModel.find({ userId: currentUserId });
        const doctorIds = userConnections.map(connection => connection.doctorId);
        const doctorDetails = await doctordetail.find({ _id: { $in: doctorIds } });

        res.render("chatPage", { contacts: doctorDetails });
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
});

// Connect to Doctor
app.post("/connect", isLoggedin, async (req, res) => {
    try {
        const userId = req.user.userId;
        const doctorId = req.body.doctorId;
        
        const existingConnection = await connectionModel.findOne({ userId, doctorId });
        if (existingConnection) return res.status(400).send("You are already connected with this doctor");

        await connectionModel.create({ userId, doctorId });
        res.redirect("/alumuni");
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
});

// Doctor Registration
app.post("/doctorregistration", async (req, res) => {
    try {
        const token = req.cookies.token;
        const { userId } = jwt.verify(token, process.env.SECRET_KEY);
        const { name, phone, dob, gender, specialization, licenseNumber, experience, hospital, password, confirmPassword } = req.body;

        if (password !== confirmPassword) {
            return res.status(400).send("Passwords do not match.");
        }

        let createdDoctor = await doctordetail.create({
            userId, name, phone, dob, gender, specialization, licenseNumber, experience, hospital, password
        });

        res.redirect("/");
    } catch (error) {
        res.status(400).send({ error: error.message });
    }
});

// Middleware for Authentication
function isLoggedin(req, res, next) {
    try {
        const token = req.cookies.token;
        if (!token) return res.redirect("/doctorlogin");

        const data = jwt.verify(token, process.env.SECRET_KEY);
        req.user = data;
        next();
    } catch (error) {
        return res.status(401).send("Invalid or expired token. Please log in again.");
    }
}

app.listen(3000, () => console.log("Server running on port 3000"));
