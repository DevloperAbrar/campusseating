const express = require("express");
const { authMiddleware } = require("../middleware/auth.middleware");
const { getDashboard } = require("../controllers/dashboard.controller");

const router = express.Router();
router.use(authMiddleware);

router.get("/", getDashboard);

module.exports = router;