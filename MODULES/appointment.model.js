const mongoose = require("mongoose");
const { Schema } = mongoose;

const feedbackSchema = new Schema({
  given: {
    type: Boolean,
    default: false,
  },
  stars: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  title: {
    type: String,
    default: "",
  },
  review: {
    type: String,
    default: "",
  },
});

const appointmentSchema = new Schema({
  doctorId: {
    type: String,
    required: true,
  },
  dateId: {
    type: String,
    required: true,
  },
  slotId: {
    type: String,
    required: true,
  },
  patientId: {
    type: String,
    required: true,
  },
  date: {
    type: String,
  },
  slotTime: {
    type: String,
  },
  doctorName: {
    type: String,
  },
  doctorEmail: {
    type: String,
  },
  patientName: {
    type: String,
  },
  googleMeetLink: {
    type: String,
  },
  feedback: feedbackSchema,
});

const Appointment = mongoose.model("Appointment", appointmentSchema);
const Feedback = mongoose.model("Feedback", feedbackSchema);

module.exports = { Appointment, Feedback };
