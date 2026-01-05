const mongoose = require("mongoose");

const doctorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    specialization: { type: String, required: true },
    chamber: { type: String, default: "" },
    location: { type: String, default: "" },
    availableDays: { type: [String], default: [] }, // ["Sun", "Mon", ...]
    time: { type: String, default: "" }, // "6pm - 10pm"
    phone: { type: String, default: "" },
    email: { type: String, default: "" },
    fee: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Doctor", doctorSchema);
