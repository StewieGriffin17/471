const mongoose = require("mongoose");

const HomeServiceRequestSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },

    // Patient info (prefill from Module 3 if available)
    patientName: { type: String, required: true },
    patientPhone: { type: String, required: true },

    // Service details
    serviceType: {
      type: String,
      required: true,
      enum: [
        "Home Nursing",
        "Injection / Dressing",
        "Physiotherapy",
        "Doctor Home Visit",
        "Ambulance",
        "Lab Sample Collection",
        "Oxygen / Nebulizer Setup",
        "Home Equipment (Bed/Wheelchair/Others)"
      ],
    },

    // Scheduling
    preferredDate: { type: String, required: true }, // YYYY-MM-DD
    preferredSlot: { type: String, required: true }, // e.g. "10:00-11:00"

    // Address
    city: { type: String, required: true },
    area: { type: String, required: true },
    address: { type: String, required: true },

    notes: { type: String, default: "" },

    // Optional linking to Module 3 appointment
    relatedAppointmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Appointment", default: null },

    status: {
      type: String,
      enum: ["pending", "confirmed", "completed", "cancelled"],
      default: "pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("HomeServiceRequest", HomeServiceRequestSchema);
