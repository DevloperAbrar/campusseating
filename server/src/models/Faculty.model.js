const mongoose = require("mongoose");

const facultySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    employeeId: { type: String, required: true, unique: true, trim: true },
    departments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Department" }],
    designation: {
      type: String,
      enum: ["Professor", "Assistant Professor", "HOD", "Lab Assistant"],
      required: true,
    },
    phone: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Faculty", facultySchema);