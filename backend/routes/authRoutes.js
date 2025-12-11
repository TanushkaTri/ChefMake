const express = require("express");
const router = express.Router();
const {
  register,
  login,
  logout,
  updateProfile,
  changePassword,
  getMe,
  supabaseLogin,
  forgotPassword,
  resetPassword,
} = require("../controllers/authController");
const { authMiddleware } = require("../middlewares/authMiddleware");

router.post("/register", register);
router.post("/login", login);
router.post("/supabase-login", supabaseLogin);
router.post("/logout", authMiddleware, logout);
router.get("/me", authMiddleware, getMe);
router.put("/update", authMiddleware, updateProfile);
router.put("/change-password", authMiddleware, changePassword);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
// TODO: add forgot/reset when implemented

module.exports = router;
