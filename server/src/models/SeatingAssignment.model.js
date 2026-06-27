const mongoose = require("mongoose");

const seatingAssignmentSchema = new mongoose.Schema(
  {
    exam: { type: mongoose.Schema.Types.ObjectId, ref: "Exam", required: true },
    shift: { type: mongoose.Schema.Types.ObjectId, ref: "Shift", required: true },
    room: { type: mongoose.Schema.Types.ObjectId, ref: "Room", required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    seatId: { type: String, required: true },
    row: { type: String, required: true },
    bench: { type: Number, required: true },
    position: { type: String, required: true },
    isManualOverride: { type: Boolean, default: false },
  },
  { timestamps: true }
);

seatingAssignmentSchema.index({ shift: 1, student: 1 }, { unique: true });
seatingAssignmentSchema.index({ shift: 1, room: 1, seatId: 1 }, { unique: true });
seatingAssignmentSchema.index({ exam: 1, shift: 1, room: 1 });
seatingAssignmentSchema.index({ student: 1 });

module.exports = mongoose.model("SeatingAssignment", seatingAssignmentSchema);