const express = require("express");
const { studentLookup, facultyLookup } = require("../controllers/lookup.controller");

const router = express.Router();

router.get("/student/:enrollmentNo", studentLookup);
router.get("/faculty/:email", facultyLookup);

module.exports = router;