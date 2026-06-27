const express = require("express");
const { authMiddleware } = require("../middleware/auth.middleware");
const {
  generateSeating,
  previewSeating,
  swapSeats,
  manualAssign,
  resetSeating,
  publishSeating,
  unpublishSeating,
} = require("../controllers/seating.controller");

// mergeParams: true so :examId and :shiftId from parent are accessible
const router = express.Router({ mergeParams: true });
router.use(authMiddleware);

router.post("/generate", generateSeating);
router.get("/preview", previewSeating);
router.put("/swap", swapSeats);
router.put("/manual", manualAssign);
router.delete("/reset", resetSeating);
router.post("/publish", publishSeating);
router.delete("/unpublish", unpublishSeating);

module.exports = router;