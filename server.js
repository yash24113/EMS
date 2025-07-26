require('dotenv').config();
const express = require('express');
const multer = require('multer');
const { put } = require('@vercel/blob');
const mongoose = require('mongoose');
const cors = require('cors');
// const fs = require('fs');
// const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '127.0.0.1';

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
  officename: String,
  latitude: Number,
  longitude: Number
});
const Office = mongoose.model('Office', OfficeSchema);

// Middleware
app.use(cors());
app.use(express.json());
// app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Not needed for Vercel Blob

// Multer setup
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Attendance Submission
app.post('/attendance', upload.single('selfie'), async (req, res) => {
  try {
    let selfieUrl = '';
    if (req.file) {
      // Upload selfie to Vercel Blob
      const blob = await put(`selfies/${Date.now()}-${req.file.originalname}`, req.file.buffer, {
        access: 'public',
        token: process.env.BLOB_READ_WRITE_TOKEN,
        contentType: req.file.mimetype
      });
      selfieUrl = blob.url;
    }

    const {
      employee,
      type,
      date,
      time,
      latitude,
      longitude,
      location,
      office
    } = req.body;

    const attendance = new Attendance({
      employee,
      type,
      date,
      time,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
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
    // Find attendance records by employee and date
    const query = {};
    if (employee) query.employee = employee;
    if (date) query.date = date;

    const records = await Attendance.find(query);

    // Format response to match Android expectations
    const result = records.map(r => ({
      employee: r.employee,
      type: r.type,
      date: r.date,
      time: r.time,
      location: r.location,
      office: r.office || "",
      selfie: r.selfieUrl || ""
    }));

    res.json(result);
  } catch (error) {
    console.error("Error in GET /attendance:", error);
    res.status(500).json({ error: "Failed to fetch attendance details" });
  }
});

// Get All Employees
app.get('/employees', async (req, res) => {
  try {
    const employees = await Employee.find({}, 'name');
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

// Start Server
app.listen(PORT, () => {
  console.log(`Server running at http://${HOST}:${PORT}`);
});