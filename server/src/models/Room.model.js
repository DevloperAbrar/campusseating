const mongoose = require("mongoose");

const seatSchema = new mongoose.Schema(
  {
    seatId: { type: String, required: true },
    row: { type: String, required: true },
    bench: { type: Number, required: true },
    position: { type: String, required: true },
    status: { type: String, enum: ["available", "blocked", "reserved", "invigilator"], default: "available" },
  },
  { _id: false }
);

const rowConfigSchema = new mongoose.Schema(
  {
    row: String,
    benchesInRow: Number,
    seatsPerBench: Number,
  },
  { _id: false }
);

const roomSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    building: { type: String, trim: true },
    floor: { type: String, trim: true },
    rows: { type: Number, required: true, min: 1 },
    benchesPerRow: { type: Number, required: true, min: 1 },
    defaultSeatsPerBench: { type: Number, required: true, min: 1, max: 4 },
    hasCustomRowConfig: { type: Boolean, default: false },
    rowConfig: [rowConfigSchema],
    seats: [seatSchema],
    totalCapacity: { type: Number, default: 0 },
    usableCapacity: { type: Number, default: 0 },
    isLocked: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

roomSchema.index({ name: 1 });
roomSchema.index({ isActive: 1 });

// Auto-generate seats on save
roomSchema.pre("save", async function () {
  if (
    !this.isModified("rows") &&
    !this.isModified("benchesPerRow") &&
    !this.isModified("defaultSeatsPerBench") &&
    !this.isNew
  ) return;

  const seats = [];
  const rows = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const positions =
    this.defaultSeatsPerBench === 2
      ? ["L", "R"]
      : this.defaultSeatsPerBench === 3
      ? ["L", "M", "R"]
      : ["1", "2", "3", "4"].slice(0, this.defaultSeatsPerBench);

  for (let r = 0; r < this.rows; r++) {
    const rowLetter = rows[r];
    for (let b = 1; b <= this.benchesPerRow; b++) {
      for (const pos of positions) {
        seats.push({
          seatId: `${rowLetter}-${b}-${pos}`,
          row: rowLetter,
          bench: b,
          position: pos,
          status: "available",
        });
      }
    }
  }

  this.seats = seats;
  this.totalCapacity = seats.length;
  this.usableCapacity = seats.length;
});

module.exports = mongoose.model("Room", roomSchema);