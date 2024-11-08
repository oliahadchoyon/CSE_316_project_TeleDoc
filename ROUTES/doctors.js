const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("../bcrypt/bcrypt");
const { Doctor, Slot, DateSchedule } = require("../models/doctor.model");
const { Appointment, Feedback } = require("../models/appointment.model");
require("dotenv").config();

function createDate(date) {
  return new DateSchedule({
    date,
    slots: [
      new Slot({ time: "09:00:00", isBooked: false }),
      new Slot({ time: "12:00:00", isBooked: false }),
      new Slot({ time: "15:00:00", isBooked: false }),
    ],
  });
}

// Get all doctors (for testing)
router.get("/", async (req, res) => {
  try {
    const doctors = await Doctor.find();
    res.json(doctors);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Add a new doctor
router.post("/add", async (req, res) => {
  const {
    username,
    password,
    name,
    phoneNumber,
    specialization,
    feesPerSession,
  } = req.body;
  const newDoctor = new Doctor({
    username,
    password,
    name,
    phoneNumber,
    specialization,
    feesPerSession,
  });

  try {
    await newDoctor.save();
    res.json("Doctor added");
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update a doctor's information
router.put("/update", async (req, res) => {
  const { username, name, phoneNumber, specialization, feesPerSession } =
    req.body;

  try {
    const doctor = await Doctor.findOne({ username });
    if (doctor) {
      doctor.name = name;
      doctor.phoneNumber = phoneNumber;
      doctor.specialization = specialization;
      doctor.feesPerSession = feesPerSession;

      await doctor.save();
      res.json("Doctor updated");
    } else {
      res.status(404).json({ error: "Doctor not found" });
    }
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Doctor login
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const doctor = await Doctor.findOne({ username });
    if (doctor && bcrypt.compare(password, doctor.password)) {
      const token = jwt.sign({ id: doctor._id }, process.env.KEY, {
        algorithm: process.env.ALGORITHM,
      });
      res.status(200).json({ token });
    } else {
      res.status(401).json({ message: "Wrong username or password" });
    }
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get slots available for a date
router.post("/get-slots", async (req, res) => {
  const { doctorId, date } = req.body;

  try {
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res
        .status(404)
        .json({ message: "Doctor not found in the database!" });
    }

    const existingDate = doctor.dates.find((d) => d.date === date);
    if (existingDate) {
      return res.status(200).json(existingDate);
    }

    const newDate = createDate(date);
    doctor.dates.push(newDate);
    await doctor.save();

    res.status(200).json(newDate);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Book a slot
router.post("/book-slot", async (req, res) => {
  const { googleId, patientName, doctorId, slotId, dateId } = req.body;

  try {
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    const date = doctor.dates.id(dateId);
    if (!date) {
      return res.status(404).json({ message: "Date not found" });
    }

    const slot = date.slots.id(slotId);
    if (!slot) {
      return res.status(404).json({ message: "Slot not found" });
    }

    slot.isBooked = true;
    await doctor.save();

    const newAppointment = new Appointment({
      doctorId,
      dateId,
      slotId,
      patientId: googleId,
      date: date.date,
      slotTime: slot.time,
      doctorName: doctor.name,
      doctorEmail: doctor.email,
      patientName,
      googleMeetLink: "",
      feedback: new Feedback(),
    });

    await newAppointment.save();
    res.status(200).json(newAppointment);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get all appointments for a doctor
router.post("/appointments", async (req, res) => {
  const { doctorId } = req.body;

  try {
    const appointments = await Appointment.find({ doctorId });
    appointments.sort(
      (a, b) =>
        Date.parse(b.date + "T" + b.slotTime) -
        Date.parse(a.date + "T" + a.slotTime)
    );
    res.status(200).json(appointments);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get a specific appointment by ID
router.get("/appointment/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const appointment = await Appointment.findById(id);
    if (appointment) {
      res.status(200).json(appointment);
    } else {
      res.status(404).json({ message: "Appointment not found" });
    }
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get today's appointments for a doctor
router.post("/todays-appointments", async (req, res) => {
  const { doctorId } = req.body;
  const today = new Date().toISOString().split("T")[0];

  try {
    const appointments = await Appointment.find({ doctorId, date: today });
    appointments.sort(
      (a, b) =>
        Date.parse(a.date + "T" + a.slotTime) -
        Date.parse(b.date + "T" + b.slotTime)
    );
    res.status(200).json(appointments);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get previous appointments for a doctor
router.post("/previous-appointments", async (req, res) => {
  const { doctorId } = req.body;
  const now = new Date();

  try {
    const appointments = await Appointment.find({ doctorId });
    const previousAppointments = appointments.filter(
      (a) => new Date(a.date + "T" + a.slotTime) < now
    );
    previousAppointments.sort(
      (a, b) =>
        Date.parse(b.date + "T" + b.slotTime) -
        Date.parse(a.date + "T" + a.slotTime)
    );
    res.status(200).json(previousAppointments);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
