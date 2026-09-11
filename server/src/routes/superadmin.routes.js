const express = require("express");
const superadmin = require("../controllers/superadmin.controller");
const { authMiddleware, requireSuperAdmin } = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/auth/login", superadmin.login);
router.post("/auth/logout", authMiddleware, requireSuperAdmin, superadmin.logout);

router.use(authMiddleware, requireSuperAdmin); // everything below requires super admin

router.get("/colleges", superadmin.listColleges);
router.post("/colleges", superadmin.createCollege);
router.get("/colleges/:id", superadmin.getCollege);
router.post("/colleges/:id/renew", superadmin.renewCollege);
router.post("/colleges/:id/reset-password", superadmin.resetAdminPassword);
router.post("/colleges/:id/suspend", superadmin.suspendCollege);
router.post("/colleges/:id/terminate", superadmin.terminateCollege);
router.post("/colleges/:id/reactivate", superadmin.reactivateCollege);
router.get("/generate-password", superadmin.generatePassword);
router.get("/stats", superadmin.platformStats);

module.exports = router;