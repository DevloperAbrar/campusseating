const mongoose = require("mongoose");

const examSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    academicYear: { type: String, required: true, trim: true },
    examDate: { type: Date, required: true },
    description: { type: String, trim: true },
    status: { type: String, enum: ["draft", "published", "ongoing", "completed"], default: "draft" },
    isLocked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

examSchema.index({ status: 1 });
examSchema.index({ examDate: 1 });

// Auto-lock on exam date
examSchema.pre("save", function () {
  if (this.examDate) {
    const today = new Date();
    const examDay = new Date(this.examDate);
    // Only lock if exam date is strictly in the past (not today)
    today.setHours(0, 0, 0, 0);
    examDay.setHours(0, 0, 0, 0);
    if (today > examDay) {
      this.isLocked = true;
    }
  }
});

module.exports = mongoose.model("Exam", examSchema);