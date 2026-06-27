const express = require("express");
const { authMiddleware } = require("../middleware/auth.middleware");
const upload = require("../middleware/upload.middleware");
const { getStudents, createStudent, updateStudent, deleteStudent, uploadCSV, getCSVTemplate } = require("../controllers/student.controller");

const router = express.Router();
router.use(authMiddleware);

router.get("/", getStudents);
router.post("/", createStudent);
router.put("/:id", updateStudent);
router.delete("/:id", deleteStudent);
router.post("/csv/upload", upload.single("file"), uploadCSV);
router.get("/csv/template", getCSVTemplate);

module.exports = router;