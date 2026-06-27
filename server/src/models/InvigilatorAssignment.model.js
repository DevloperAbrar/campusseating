const mongoose = require("mongoose");

const invigilatorAssignmentSchema = new mongoose.Schema(
  {
    exam: { type: mongoose.Schema.Types.ObjectId, ref: "Exam", required: true },
    shift: { type: mongoose.Schema.Types.ObjectId, ref: "Shift", required: true },
    room: { type: mongoose.Schema.Types.ObjectId, ref: "Room", required: true },
    faculty: { type: mongoose.Schema.Types.ObjectId, ref: "Faculty", required: true },
  },
  { timestamps: true }
);

invigilatorAssignmentSchema.index({ shift: 1, room: 1, faculty: 1 }, { unique: true });
invigilatorAssignmentSchema.index({ shift: 1, faculty: 1 });
invigilatorAssignmentSchema.index({ faculty: 1 });

module.exports = mongoose.model("InvigilatorAssignment", invigilatorAssignmentSchema);