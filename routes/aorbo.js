const express = require("express");
const router = express.Router();

const Doctor = require("../models/Doctor");
const Appointment = require("../models/Appointment");
const HomeServiceRequest = require("../models/HomeServiceRequest");

// ---------- Helpers ----------
function dayNameFromDateStr(dateStr) {
  // dateStr: "YYYY-MM-DD"
  const d = new Date(dateStr + "T00:00:00");
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return days[d.getDay()];
}

// Parse "6 PM - 9 PM" or "10 AM - 2 PM" into minutes since midnight
function parseTimeRange(timeRangeStr) {
  // Expected formats like "6 PM - 9 PM"
  const parts = timeRangeStr.split("-").map(s => s.trim());
  if (parts.length !== 2) return null;

  const toMinutes = (t) => {
    // "6 PM" or "10 AM" or "6:30 PM"
    const m = t.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
    if (!m) return null;
    let hour = parseInt(m[1], 10);
    const minute = m[2] ? parseInt(m[2], 10) : 0;
    const ampm = m[3].toUpperCase();

    if (ampm === "AM") {
      if (hour === 12) hour = 0;
    } else {
      if (hour !== 12) hour += 12;
    }
    return hour * 60 + minute;
  };

  const start = toMinutes(parts[0]);
  const end = toMinutes(parts[1]);
  if (start === null || end === null) return null;

  return { start, end };
}

function minutesToHHMM(m) {
  const hh = String(Math.floor(m / 60)).padStart(2, "0");
  const mm = String(m % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

function generateSlots(range, slotMinutes = 15) {
  const slots = [];
  for (let t = range.start; t + slotMinutes <= range.end; t += slotMinutes) {
    slots.push(minutesToHHMM(t));
  }
  return slots;
}

// ---------- 1) GET available slots ----------
router.get("/appointments/slots", async (req, res) => {
  try {
    const { doctorId, date, slotMinutes } = req.query;
    const step = slotMinutes ? parseInt(slotMinutes, 10) : 15;

    if (!doctorId || !date) {
      return res.status(400).json({ error: "doctorId and date are required" });
    }

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) return res.status(404).json({ error: "Doctor not found" });

    const dayName = dayNameFromDateStr(date);

    // Check doctor availability day
    const availableDays = doctor.availableDays || [];
    const isAvailableToday = availableDays.includes(dayName);

    if (!isAvailableToday) {
      return res.json({
        doctorId,
        date,
        slotMinutes: step,
        availableSlots: [],
        reason: `Doctor not available on ${dayName}`,
      });
    }

    // Parse time window
    const range = parseTimeRange(doctor.time || "");
    if (!range) {
      return res.json({
        doctorId,
        date,
        slotMinutes: step,
        availableSlots: [],
        reason: "Doctor time format invalid",
      });
    }

    const allSlots = generateSlots(range, step);

    // Load booked slots
    const booked = await Appointment.find({
      doctorId,
      date,
      status: "booked",
    }).select("slot");

    const bookedSet = new Set(booked.map(a => a.slot));
    const availableSlots = allSlots.filter(s => !bookedSet.has(s));

    return res.json({
      doctorId,
      date,
      slotMinutes: step,
      availableSlots,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to load slots" });
  }
});

// ---------- 2) POST book appointment ----------
router.post("/appointments", async (req, res) => {
  try {
    const { userId, patientName, patientPhone, doctorId, date, slot } = req.body;

    if (!userId || !patientName || !patientPhone || !doctorId || !date || !slot) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) return res.status(404).json({ error: "Doctor not found" });

    // Validate slot is in available slots
    const dayName = dayNameFromDateStr(date);
    const availableDays = doctor.availableDays || [];
    if (!availableDays.includes(dayName)) {
      return res.status(400).json({ error: `Doctor not available on ${dayName}` });
    }

    const range = parseTimeRange(doctor.time || "");
    if (!range) return res.status(400).json({ error: "Doctor time format invalid" });

    const allSlots = generateSlots(range, 15);
    if (!allSlots.includes(slot)) {
      return res.status(400).json({ error: "Invalid slot for doctor schedule" });
    }

    // Serial number = number of booked appointments for doctor/date + 1
    const bookedCount = await Appointment.countDocuments({
      doctorId,
      date,
      status: "booked",
    });

    const serialNo = bookedCount + 1;

    const appointment = await Appointment.create({
      userId,
      patientName,
      patientPhone,
      doctorId,
      specialization: doctor.specialization,
      date,
      slot,
      slotMinutes: 15,
      serialNo,
      status: "booked",
    });

    return res.json({ ok: true, appointment });
  } catch (err) {
    // Unique index conflict => slot already booked
    if (err && err.code === 11000) {
      return res.status(409).json({ error: "This slot is already booked. Choose another." });
    }
    console.error(err);
    return res.status(500).json({ error: "Failed to book appointment" });
  }
});

// ---------- 3) GET my appointments ----------
router.get("/appointments", async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: "userId is required" });

    const list = await Appointment.find({ userId })
      .populate("doctorId", "name specialization location fee time availableDays")
      .sort({ createdAt: -1 });

    return res.json({ count: list.length, appointments: list });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to load appointments" });
  }
});

// ---------- 4) Cancel appointment ----------
router.patch("/appointments/:id/cancel", async (req, res) => {
  try {
    const { id } = req.params;

    const appt = await Appointment.findById(id);
    if (!appt) return res.status(404).json({ error: "Appointment not found" });

    appt.status = "cancelled";
    await appt.save();

    return res.json({ ok: true, appointment: appt });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to cancel" });
  }
});


/**
 * GET /api/doctors
 * Optional query:
 *   ?specialization=Neurology
 */
router.get("/doctors", async (req, res) => {
  try {
    const { specialization } = req.query;

    const filter = {};
    if (specialization) {
      filter.specialization = { $regex: specialization, $options: "i" };
    }

    const doctors = await Doctor.find(filter).sort({ createdAt: -1 });
    res.json({ count: doctors.length, doctors });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.get("/doctors/:id", async (req, res) => {
  try {
    const doc = await Doctor.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: "Doctor not found" });
    res.json(doc);
  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
});


/**
 * POST /api/doctors
 * Body: { name, specialization, ... }
 */
router.post("/doctors", async (req, res) => {
  try {
    const doctor = await Doctor.create(req.body);
    res.status(201).json({ doctor });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


// Helper: YYYY-MM-DD string for today
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * POST /api/homeservice
 * Create a home service request
 */
router.post("/homeservice", async (req, res) => {
  try {
    const {
      userId,
      patientName,
      patientPhone,
      serviceType,
      preferredDate,
      preferredSlot,
      city,
      area,
      address,
      notes,
      relatedAppointmentId,
    } = req.body;

    // basic validation
    if (!userId || !patientName || !patientPhone || !serviceType || !preferredDate || !preferredSlot || !city || !area || !address) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    // prevent past booking
    if (preferredDate < todayStr()) {
      return res.status(400).json({ error: "Cannot book home service in the past." });
    }

    const created = await HomeServiceRequest.create({
      userId,
      patientName,
      patientPhone,
      serviceType,
      preferredDate,
      preferredSlot,
      city,
      area,
      address,
      notes: notes || "",
      relatedAppointmentId: relatedAppointmentId || null,
      status: "pending",
    });

    res.json({ message: "Home service request created", request: created });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error creating home service request." });
  }
});

/**
 * GET /api/homeservice?userId=...
 * List home service requests for user
 */
router.get("/homeservice", async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: "userId is required" });

    const list = await HomeServiceRequest.find({ userId }).sort({ createdAt: -1 });
    res.json({ requests: list });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error loading home service requests." });
  }
});

/**
 * PATCH /api/homeservice/:id/cancel
 * Cancel a request (only if not completed)
 */
router.patch("/homeservice/:id/cancel", async (req, res) => {
  try {
    const { id } = req.params;

    const doc = await HomeServiceRequest.findById(id);
    if (!doc) return res.status(404).json({ error: "Request not found" });

    if (doc.status === "completed") {
      return res.status(400).json({ error: "Completed requests cannot be cancelled." });
    }

    doc.status = "cancelled";
    await doc.save();

    res.json({ message: "Cancelled", request: doc });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error cancelling request." });
  }
});


module.exports = router;
