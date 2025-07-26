const express = require('express');
const multer = require('multer');
const mongoose = require('mongoose');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const app = express();

// MongoDB connection
mongoose.connect(process.env.MONGODB_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log("MongoDB connected"))
.catch(err => console.error("MongoDB connection error:", err));

// Schemas
const AttendanceSchema = new mongoose.Schema({
  employee: String,
  type: String,
  date: String,
  time: String,
  latitude: Number,
  longitude: Number,
  location: String,
  selfieUrl: String,
  office: String
});
const Attendance = mongoose.model('AttendenceData', AttendanceSchema);

const EmployeeSchema = new mongoose.Schema({
  name: String
});
const Employee = mongoose.model('Employee', EmployeeSchema);

const OfficeSchema = new mongoose.Schema({
  name: String
});
const Office = mongoose.model('Office', OfficeSchema);

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath);
    }
    cb(null, uploadPath);
  },
  filename(req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Attendance Submission
app.post('/attendance', upload.single('selfie'), async (req, res) => {
  try {
    const { employee, type, date, time, latitude, longitude, location, office } = req.body;
    const selfieUrl = req.file ? `/uploads/${req.file.filename}` : '';
    const attendance = new Attendance({
      employee,
      type,
      date,
      time,
      latitude,
      longitude,
      location,
      selfieUrl,
      office
    });
    await attendance.save();
    res.json({ success: true, message: "Attendance recorded successfully." });
  } catch (error) {
    console.error("Error in /attendance:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// Get Attendance Details (for Dashboard)
app.get('/attendance', async (req, res) => {
  try {
    const { employee, date } = req.query;
    const query = {};
    if (employee) query.employee = employee;
    if (date) query.date = date;
    const records = await Attendance.find(query);
    const result = records.map(r => ({
      employee: r.employee,
      type: r.type,
      date: r.date,
      time: r.time,
      location: r.location,
      latitude: r.latitude,
      longitude: r.longitude,
      selfieUrl: r.selfieUrl,
      office: r.office
    }));
    res.json(result);
  } catch (error) {
    console.error("Error in GET /attendance:", error);
    res.status(500).json({ error: "Failed to fetch attendance data" });
  }
});

// Get All Employees
app.get('/employees', async (req, res) => {
  try {
    const employees = await Employee.find({});
    res.json(employees);
  } catch (error) {
    console.error("Error in /employees:", error);
    res.status(500).json({ error: "Failed to fetch employees" });
  }
});

// Get All Offices
app.get('/offices', async (req, res) => {
  try {
    const offices = await Office.find({});
    res.json(offices);
  } catch (error) {
    console.error("Error in /offices:", error);
    res.status(500).json({ error: "Failed to fetch offices" });
  }
});

const serverless = require('serverless-http');
module.exports = serverless(app);
