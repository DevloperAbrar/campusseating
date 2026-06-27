const mongoose = require("mongoose");

const departmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true, unique: true },
    stream: { type: mongoose.Schema.Types.ObjectId, ref: "Stream", required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

departmentSchema.index({ stream: 1 });

module.exports = mongoose.model("Department", departmentSchema);