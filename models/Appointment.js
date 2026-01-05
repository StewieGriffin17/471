const mongoose = require("mongoose");

const AppointmentSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true }, // demo-user for now

    patientName: { type: String, required: true },
    patientPhone: { type: String, required: true },

    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true, index: true },
    specialization: { type: String, required: true, index: true },

    date: { type: String, required: true, index: true }, // YYYY-MM-DD
    slot: { type: String, required: true },              // "18:15" 24-hr string
    slotMinutes: { type: Number, default: 15 },

    serialNo: { type: Number, required: true },

    status: { type: String, enum: ["booked", "cancelled"], default: "booked", index: true },
  },
  { timestamps: true }
);

// Prevent double booking for same doctor+date+slot (booked or cancelled both stored)
AppointmentSchema.index({ doctorId: 1, date: 1, slot: 1 }, { unique: true });

module.exports = mongoose.model("Appointment", AppointmentSchema);
