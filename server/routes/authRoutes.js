const express = require("express");

const router = express.Router();

const {
  registerUser,
  loginUser,
  getProfile,
  updateProfile,
  changePassword
} = require("../controllers/authController");

const authMiddleware = require("../middleware/authMiddleware");

// 🔐 Authentication
router.post("/register", registerUser);
router.post("/login", loginUser);

// 👤 Profile
router.get(
  "/profile",
  authMiddleware,
  getProfile
);

router.put(
  "/profile",
  authMiddleware,
  updateProfile
);

// 🔑 Change Password
router.put(
  "/change-password",
  authMiddleware,
  changePassword
);

module.exports = router;