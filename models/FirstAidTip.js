const mongoose = require("mongoose");

const FirstAidTipSchema = new mongoose.Schema({
  symptom: { type: String, required: true },
  instructions: { type: String, required: true },
});

module.exports = mongoose.model("FirstAidTip", FirstAidTipSchema);
