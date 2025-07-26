const express = require('express');
const multer = require('multer');
const mongoose = require('mongoose');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const HOST = '192.168.1.19'; // Replace with your IP

// MongoDB connection
mongoose.connect('mongodb://127.0.0.1:27017/EMS', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("MongoDB connected"))
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
  selfieUrl: String
});
const Attendance = mongoose.model('AttendenceData', AttendanceSchema);

const EmployeeSchema = new mongoose.Schema({
  name: String
});
const Employee = mongoose.model('Employee', EmployeeSchema);

// ✅ Office Schema
const OfficeSchema = new mongoose.Schema({
  officename: String,
  latitude: Number,
  longitude: Number
});
const Office = mongoose.model('Office', OfficeSchema);

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}.jpg`;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

// ✅ Attendance Submission
app.post('/attendance', upload.single('selfie'), async (req, res) => {
  try {
    const selfieUrl = req.file
      ? `http://${HOST}:${PORT}/uploads/${req.file.filename}`
      : '';

    const {
      employee,
      type,
      date,
      time,
      latitude,
      longitude,
      location
    } = req.body;

    const attendance = new Attendance({
      employee,
      type,
      date,
      time,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      location,
      selfieUrl
    });

    await attendance.save();
    res.json({ success: true, message: "Attendance recorded successfully." });
  } catch (error) {
    console.error("Error in /attendance:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// ✅ Get All Employees
app.get('/employees', async (req, res) => {
  try {
    const employees = await Employee.find({}, 'name');
    res.json(employees);
  } catch (error) {
    console.error("Error in /employees:", error);
    res.status(500).json({ error: "Failed to fetch employees" });
  }
});

// ✅ Get All Offices
app.get('/offices', async (req, res) => {
  try {
    const offices = await Office.find({});
    res.json(offices);
  } catch (error) {
    console.error("Error in /offices:", error);
    res.status(500).json({ error: "Failed to fetch offices" });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running at http://${HOST}:${PORT}`);
});
