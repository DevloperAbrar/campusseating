const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    enrollmentNo: { type: String, required: true, unique: true, trim: true },
    stream: { type: mongoose.Schema.Types.ObjectId, ref: "Stream", required: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", required: true },
    year: { type: Number, required: true, min: 1, max: 6 },
    gender: { type: String, enum: ["male", "female", "other"], default: "other" },
    phone: { type: String, trim: true },
    specialNeeds: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

studentSchema.index({ branch: 1, year: 1 });
studentSchema.index({ department: 1 });

module.exports = mongoose.model("Student", studentSchema);