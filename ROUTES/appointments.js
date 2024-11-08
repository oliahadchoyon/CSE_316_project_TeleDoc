const express = require("express");
const router = express.Router();
const { Appointment } = require("../models/appointment.model");

// Update Google Meet link for an appointment
router.put("/add-meet-link", async (req, res) => {
  const { meetLink, appointmentId } = req.body;

  try {
    const appointment = await Appointment.findById(appointmentId);
    if (appointment) {
      appointment.googleMeetLink = meetLink;
      console.log(`Received meet link: ${meetLink}`);

      await appointment.save();
      console.log("Updated the meet link!");
      return res.status(200).json({ message: "Meet link updated!" });
    } else {
      return res.status(404).json({ message: "Appointment not found" });
    }
  } catch (err) {
    console.error(`Cannot add meet link to the appointment due to ${err}`);
    return res.status(400).json({
      message: `Cannot add meet link to the appointment due to ${err}`,
    });
  }
});

// Update feedback for an appointment
router.put("/feedback", async (req, res) => {
  const { appointmentId, stars, title, review } = req.body;

  try {
    const appointment = await Appointment.findById(appointmentId);
    if (appointment) {
      appointment.feedback.stars = stars;
      appointment.feedback.title = title;
      appointment.feedback.review = review;
      appointment.feedback.given = true;

      await appointment.save();
      return res
        .status(200)
        .json({ message: "Feedback updated successfully!" });
    } else {
      return res.status(404).json({ message: "Appointment not found" });
    }
  } catch (err) {
    console.error(err);
    return res.status(400).json(err);
  }
});

module.exports = router;
