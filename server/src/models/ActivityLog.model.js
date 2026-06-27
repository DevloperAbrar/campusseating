const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema({
  action: { type: String, required: true },
  entity: { type: String, required: true },
  entityId: mongoose.Schema.Types.ObjectId,
  description: String,
  metadata: mongoose.Schema.Types.Mixed,
  performedAt: { type: Date, default: Date.now },
});

activityLogSchema.index({ performedAt: -1 });

module.exports = mongoose.model("ActivityLog", activityLogSchema);