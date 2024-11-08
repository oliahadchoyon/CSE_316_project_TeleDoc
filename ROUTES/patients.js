const router = require("express").Router();
const Patient = require("../models/patient.model");
const appointmentImport = require("../models/appointment.model");
const jwt = require("jsonwebtoken");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { v4: uuidv4 } = require("uuid");
const { Appointment } = appointmentImport;

// Helper function to get current formatted date-time
const getCurrentDateTime = () => {
  const date = new Date();
  const currDateTime = date.toISOString().split(".")[0];
  return currDateTime.replace("T", "T");
};

// To get all the patients
// ** ONLY FOR TESTING **
router.route("/").get(async (req, res) => {
  try {
    const patients = await Patient.find();
    res.status(200).json(patients);
  } catch (err) {
    res.status(400).json({ error: `Error : ${err}` });
  }
});

// To add a patient
router.route("/add").post(async (req, res) => {
  try {
    const { googleId, name, picture } = req.body;

    const newPatient = new Patient({ googleId, name, picture });
    await newPatient.save();
    res.status(200).json("Patient added");
  } catch (err) {
    res.status(400).json({ error: `Error : ${err}` });
  }
});

// To update a patient's phone number
router.route("/update-phone").put(async (req, res) => {
  try {
    const { googleId, phoneNumber } = req.body;

    const patient = await Patient.findOne({ googleId });
    if (!patient) {
      return res.status(404).json({ error: "Patient not found" });
    }

    patient.phoneNumber = phoneNumber;
    await patient.save();
    res.status(200).json("Patient's phone number updated");
  } catch (err) {
    res.status(400).json({ error: `Error : ${err}` });
  }
});

// Google login
router.route("/google-login").post(async (req, res) => {
  try {
    const { tokenId } = req.body;

    const decoded = jwt.decode(tokenId, process.env.KEY);
    const googleId = decoded.sub;

    let patient = await Patient.findOne({ googleId });

    if (!patient) {
      const { email, name, picture } = decoded;
      patient = new Patient({ googleId, email, name, picture });
      await patient.save();
      return res.status(200).json({ phoneNumberExists: false });
    }

    const phoneNumberExists = patient.phoneNumber !== undefined;
    res.status(200).json({ phoneNumberExists });
  } catch (err) {
    res.status(400).json({ error: `Error : ${err}` });
  }
});

// Get patient details by Google ID
router.route("/getPatientDetails/:googleId").get(async (req, res) => {
  try {
    const { googleId } = req.params;
    const patient = await Patient.findOne({ googleId });

    if (!patient) {
      return res.status(404).json({ error: "Patient not found" });
    }

    res.status(200).json(patient);
  } catch (err) {
    res.status(400).json({ error: `Error : ${err}` });
  }
});

// Get previous appointments
router.route("/previous-appointments").post(async (req, res) => {
  try {
    const { googleId } = req.body;
    const appointments = await Appointment.find({ patientId: googleId });

    const currDateTime = getCurrentDateTime();

    const filteredAppointments = appointments.filter((appointment) => {
      return (
        Date.parse(currDateTime) >=
        Date.parse(appointment.date + "T" + appointment.slotTime)
      );
    });

    const sortedAppointments = filteredAppointments.sort((a, b) => {
      return (
        Date.parse(b.date + "T" + b.slotTime) -
        Date.parse(a.date + "T" + a.slotTime)
      );
    });

    res.status(200).json(sortedAppointments);
  } catch (err) {
    res.status(400).json({ error: `Error : ${err}` });
  }
});

// Get upcoming appointments
router.route("/upcoming-appointments").post(async (req, res) => {
  try {
    const { googleId } = req.body;
    const appointments = await Appointment.find({ patientId: googleId });

    const currDateTime = getCurrentDateTime();

    const filteredAppointments = appointments.filter((appointment) => {
      return (
        Date.parse(currDateTime) <=
        Date.parse(appointment.date + "T" + appointment.slotTime)
      );
    });

    const sortedAppointments = filteredAppointments.sort((a, b) => {
      return (
        Date.parse(a.date + "T" + a.slotTime) -
        Date.parse(b.date + "T" + b.slotTime)
      );
    });

    res.status(200).json(sortedAppointments);
  } catch (err) {
    res.status(400).json({ error: `Error : ${err}` });
  }
});

// Payment route
router.route("/payment").post(async (req, res) => {
  try {
    const { finalBalance, token } = req.body;
    const idempotencyKey = uuidv4();

    const customer = await stripe.customers.create({
      email: token.email,
      source: token.id,
    });

    const charge = await stripe.charges.create(
      {
        amount: finalBalance * 100,
        currency: "usd",
        customer: customer.id,
        receipt_email: token.email,
        description: "Booked Appointment Successfully",
        shipping: {
          name: token.card.name,
          address: {
            line1: token.card.address_line1,
            line2: token.card.address_line2,
            city: token.card.address_city,
            country: token.card.address_country,
            postal_code: token.card.address_zip,
          },
        },
      },
      {
        idempotencyKey,
      }
    );

    res.status(200).json(charge);
  } catch (err) {
    res.status(400).json({ error: `Error : ${err}` });
  }
});

module.exports = router;
