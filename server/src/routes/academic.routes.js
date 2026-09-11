const express = require("express");
const { getDashboard } = require("../controllers/dashboard.controller");
const {
  getStreams, createStream, updateStream, deleteStream,
  getDepartments, createDepartment, updateDepartment, deleteDepartment,
  getBranches, createBranch, updateBranch, deleteBranch,
} = require("../controllers/academic.controller");

const router = express.Router();

// Streams
router.get("/streams", getStreams);
router.post("/streams", createStream);
router.put("/streams/:id", updateStream);
router.delete("/streams/:id", deleteStream);

// Departments
router.get("/departments", getDepartments);
router.post("/departments", createDepartment);
router.put("/departments/:id", updateDepartment);
router.delete("/departments/:id", deleteDepartment);

// Branches
router.get("/branches", getBranches);
router.post("/branches", createBranch);
router.put("/branches/:id", updateBranch);
router.delete("/branches/:id", deleteBranch);

// Dashboard router (separate)
const dashboardRouter = express.Router();
dashboardRouter.get("/", getDashboard);

module.exports = { router, dashboardRouter };