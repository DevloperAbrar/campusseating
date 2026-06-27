// const mongoose = require("mongoose");

// const branchPairSchema = new mongoose.Schema(
//   {
//     positions: [String],
//     branches: [{ type: mongoose.Schema.Types.ObjectId, ref: "Branch" }],
//   },
//   { _id: false }
// );

// const shiftSchema = new mongoose.Schema(
//   {
//     exam: { type: mongoose.Schema.Types.ObjectId, ref: "Exam", required: true },
//     name: { type: String, required: true, trim: true },
//     startTime: { type: String, required: true },
//     endTime: { type: String, required: true },
//     selectedBranches: [{ type: mongoose.Schema.Types.ObjectId, ref: "Branch" }],
//     selectedYears: [Number],
//     studentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Student" }],
//     totalStudents: { type: Number, default: 0 },
//     rooms: [
//       {
//         room: { type: mongoose.Schema.Types.ObjectId, ref: "Room" },
//         priority: Number,
//         usableCapacity: Number,
//       },
//     ],
//     totalAvailableSeats: { type: Number, default: 0 },
//     seatingRules: {
//       branchSeparationMode: { type: String, enum: ["strict", "relaxed"], default: "strict" },
//       consecutivePairing: { type: Boolean, default: false },
//       branchPairs: [branchPairSchema],
//       rollNumberOrder: { type: Boolean, default: true },
//       genderSeparation: { type: String, enum: ["none", "rows", "rooms"], default: "none" },
//       gapSeating: { type: Boolean, default: false },
//       sameRowSameBranch: { type: Boolean, default: false },
//     },
//     planGenerated: { type: Boolean, default: false },
//     planGeneratedAt: Date,
//     isPublished: { type: Boolean, default: false },
//     publishedAt: Date,
//   },
//   { timestamps: true }
// );

// shiftSchema.index({ exam: 1 });
// shiftSchema.index({ exam: 1, name: 1 });

// module.exports = mongoose.model("Shift", shiftSchema);


const mongoose = require("mongoose");

const branchPairSchema = new mongoose.Schema(
  {
    positions: [String],
    branches: [{ type: mongoose.Schema.Types.ObjectId, ref: "Branch" }],
  },
  { _id: false }
);

const shiftSchema = new mongoose.Schema(
  {
    exam: { type: mongoose.Schema.Types.ObjectId, ref: "Exam", required: true },
    name: { type: String, required: true, trim: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    selectedBranches: [{ type: mongoose.Schema.Types.ObjectId, ref: "Branch" }],
    selectedYears: [Number],
    studentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Student" }],
    totalStudents: { type: Number, default: 0 },
    rooms: [
      {
        room: { type: mongoose.Schema.Types.ObjectId, ref: "Room" },
        priority: Number,
        usableCapacity: Number,
      },
    ],
    totalAvailableSeats: { type: Number, default: 0 },
    seatingRules: {
      branchSeparationMode: { type: String, enum: ["strict", "relaxed"], default: "strict" },
      consecutivePairing:   { type: Boolean, default: false },
      autoPair:             { type: Boolean, default: false },
      pairingMode:          { type: String, enum: ["interleaved", "block"], default: "interleaved" },
      branchPairs:          [branchPairSchema],
      // 'false' | 'asc' | 'desc'
      rollNumberOrder:      { type: String, enum: ["asc", "desc", "false"], default: "asc" },
      genderSeparation:     { type: String, enum: ["none", "rows", "rooms"], default: "none" },
      // 'false' | 'side' | 'row'
      gapSeating:           { type: String, enum: ["side", "row", "false"], default: "false" },
      sameRowSameBranch:    { type: Boolean, default: false },
      // New options
      roomFillStrategy:     { type: String, enum: ["pack", "spread"], default: "pack" },
      fillDirection:        { type: String, enum: ["front", "back"], default: "front" },
      yearSeparation:       { type: Boolean, default: false },
    },
    planGenerated:   { type: Boolean, default: false },
    planGeneratedAt: Date,
    isPublished:     { type: Boolean, default: false },
    publishedAt:     Date,
  },
  { timestamps: true }
);

shiftSchema.index({ exam: 1 });
shiftSchema.index({ exam: 1, name: 1 });

module.exports = mongoose.model("Shift", shiftSchema);