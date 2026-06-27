const express = require("express");
const { authMiddleware } = require("../middleware/auth.middleware");
const { getRooms, getRoomById, createRoom, updateRoom, updateRoomSeats, deleteRoom } = require("../controllers/room.controller");

const router = express.Router();
router.use(authMiddleware);

router.get("/", getRooms);
router.post("/", createRoom);
router.get("/:id", getRoomById);  // ← add karo
router.put("/:id", updateRoom);
router.put("/:id/seats", updateRoomSeats);
router.delete("/:id", deleteRoom);

module.exports = router;